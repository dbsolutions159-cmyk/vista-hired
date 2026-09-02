import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Upload,
  CheckCircle2,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { submitApplication } from "@/lib/applications.functions";

type Props = {
  jobId: string;
  onSuccess?: () => void;
};

type FormState = {
  full_name: string;
  email: string;
  mobile: string;
  city: string;
  qualification: string;
  experience: string;
  current_company: string;
  cover_letter: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

export function SmartApplicationForm({
  jobId,
  onSuccess,
}: Props) {
  const { user } = useAuth();
  const submit = useServerFn(submitApplication);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [resumePath, setResumePath] = useState("");
  const [resumeName, setResumeName] = useState("");

  const [form, setForm] = useState<FormState>({
    full_name: "",
    email: "",
    mobile: "",
    city: "",
    qualification: "",
    experience: "",
    current_company: "",
    cover_letter: "",
  });

  /*
   * Auto-fill what is safely available from the authenticated
   * Supabase user/session.
   */
  useEffect(() => {
    if (!user) return;

    const metadata =
      (user.user_metadata ?? {}) as Record<string, unknown>;

    const metadataName =
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.name === "string"
          ? metadata.name
          : "";

    const metadataMobile =
      typeof metadata.mobile === "string"
        ? metadata.mobile
        : typeof metadata.phone === "string"
          ? metadata.phone
          : "";

    setForm((previous) => ({
      ...previous,
      full_name:
        previous.full_name ||
        metadataName ||
        user.email?.split("@")[0] ||
        "",
      email: previous.email || user.email || "",
      mobile: previous.mobile || metadataMobile,
    }));
  }, [user]);

  const update = (
    key: keyof FormState,
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const uploadResume = async (file: File) => {
    if (!user) {
      toast.error("Please login before applying");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(
        "Resume must be PDF, JPG, JPEG or PNG",
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Resume must be below 5 MB");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setUploading(true);

    try {
      /*
       * Keep every candidate's files inside their own folder.
       * This works cleanly with private Supabase storage policies
       * that restrict access by authenticated user.
       */
      const safeName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(-120);

      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;

      /*
       * Remove the previously uploaded resume when the candidate
       * replaces it during the same application session.
       */
      if (resumePath) {
        await supabase.storage
          .from("resumes")
          .remove([resumePath]);
      }

      const { error } = await supabase.storage
        .from("resumes")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        console.error("Resume upload error:", error);
        throw new Error(
          error.message || "Resume upload failed",
        );
      }

      setResumePath(path);
      setResumeName(file.name);

      toast.success("Resume uploaded successfully");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to upload resume",
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeResume = async () => {
    if (!resumePath) return;

    try {
      await supabase.storage
        .from("resumes")
        .remove([resumePath]);
    } catch {
      // Application can still continue if cleanup fails.
    }

    setResumePath("");
    setResumeName("");

    toast.success("Resume removed");
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please login before applying");
      return;
    }

    if (!resumePath) {
      toast.error("Please upload your resume");
      return;
    }

    setLoading(true);

    try {
      await submit({
        data: {
          job_id: jobId,
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          mobile: form.mobile.trim(),
          city: form.city.trim(),
          qualification: form.qualification.trim(),
          experience: form.experience.trim(),
          current_company:
            form.current_company.trim() || null,
          cover_letter:
            form.cover_letter.trim() || null,
          resume_path: resumePath,
        },
      });

      toast.success(
        "Application submitted successfully!",
      );

      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit application";

      /*
       * If duplicate protection catches the application,
       * don't delete the existing uploaded resume automatically.
       */
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4 overflow-hidden">
      <div className="border-b bg-muted/30 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              Smart Application
            </h2>

            <p className="text-sm text-muted-foreground">
              Apply directly through HireSetu
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="full_name">
              Full Name *
            </Label>

            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) =>
                update(
                  "full_name",
                  e.target.value,
                )
              }
              required
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <Label htmlFor="email">
              Email *
            </Label>

            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) =>
                update(
                  "email",
                  e.target.value,
                )
              }
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label htmlFor="mobile">
              Mobile Number *
            </Label>

            <Input
              id="mobile"
              type="tel"
              value={form.mobile}
              onChange={(e) =>
                update(
                  "mobile",
                  e.target.value,
                )
              }
              required
              placeholder="Enter mobile number"
            />
          </div>

          <div>
            <Label htmlFor="city">
              City *
            </Label>

            <Input
              id="city"
              value={form.city}
              onChange={(e) =>
                update(
                  "city",
                  e.target.value,
                )
              }
              required
              placeholder="e.g. Bhopal"
            />
          </div>

          <div>
            <Label htmlFor="qualification">
              Highest Qualification *
            </Label>

            <Input
              id="qualification"
              value={form.qualification}
              onChange={(e) =>
                update(
                  "qualification",
                  e.target.value,
                )
              }
              required
              placeholder="e.g. B.Tech, MBA, 12th"
            />
          </div>

          <div>
            <Label htmlFor="experience">
              Experience *
            </Label>

            <Input
              id="experience"
              value={form.experience}
              onChange={(e) =>
                update(
                  "experience",
                  e.target.value,
                )
              }
              required
              placeholder="e.g. Fresher / 2 Years"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="current_company">
            Current Company
          </Label>

          <Input
            id="current_company"
            value={form.current_company}
            onChange={(e) =>
              update(
                "current_company",
                e.target.value,
              )
            }
            placeholder="Optional"
          />
        </div>

        <div>
          <Label htmlFor="cover_letter">
            Cover Letter
          </Label>

          <Textarea
            id="cover_letter"
            rows={5}
            value={form.cover_letter}
            onChange={(e) =>
              update(
                "cover_letter",
                e.target.value,
              )
            }
            placeholder="Tell the recruiter briefly why you are suitable for this role..."
          />
        </div>

        <div>
          <Label>Resume *</Label>

          <div className="mt-2">
            {!resumePath ? (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition hover:bg-muted/50">
                {uploading ? (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />

                    <span className="text-sm font-medium">
                      Uploading resume...
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="h-7 w-7 text-primary" />

                    <span className="text-sm font-semibold">
                      Upload Resume
                    </span>

                    <span className="text-xs text-muted-foreground">
                      PDF, JPG, JPEG or PNG · Max 5 MB
                    </span>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file =
                      e.target.files?.[0];

                    if (file) {
                      void uploadResume(file);
                    }
                  }}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {resumeName}
                    </div>

                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      Resume uploaded
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    void removeResume()
                  }
                  disabled={loading}
                  title="Remove resume"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          Your application details and resume will be
          securely submitted to the recruiter for this
          specific job.
        </div>

        <Button
          type="submit"
          disabled={
            loading ||
            uploading ||
            !resumePath
          }
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting Application...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Submit Application
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
