import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { submitApplication } from "@/lib/applications.functions";

type Props = {
  jobId: string;
  onSuccess?: () => void;
};

export function SmartApplicationForm({ jobId, onSuccess }: Props) {
  const submit = useServerFn(submitApplication);

  const [loading, setLoading] = useState(false);
  const [resumePath, setResumePath] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    mobile: "",
    city: "",
    qualification: "",
    experience: "",
    current_company: "",
    cover_letter: "",
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const uploadResume = async (file: File) => {
    if (!file) return;

    if (!["application/pdf"].includes(file.type)) {
      toast.error("Please upload a PDF resume");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume must be below 5 MB");
      return;
    }

    const path = `${crypto.randomUUID()}-${file.name}`;

    // Resume upload will be connected to the existing private
    // Supabase resumes bucket in the next backend step.
    setResumePath(path);
    toast.success("Resume selected");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resumePath) {
      toast.error("Please upload your resume");
      return;
    }

    setLoading(true);

    try {
      await submit({
        data: {
          job_id: jobId,
          ...form,
          current_company: form.current_company || null,
          cover_letter: form.cover_letter || null,
          resume_path: resumePath,
        },
      });

      toast.success("Application submitted successfully!");
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit application",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4 p-5">
      <div className="mb-5">
        <h2 className="text-xl font-bold">Smart Application</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete your details and apply directly through HireSetu.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Full Name *</Label>
          <Input
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Email *</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Mobile Number *</Label>
          <Input
            value={form.mobile}
            onChange={(e) => update("mobile", e.target.value)}
            required
          />
        </div>

        <div>
          <Label>City *</Label>
          <Input
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Highest Qualification *</Label>
          <Input
            value={form.qualification}
            onChange={(e) => update("qualification", e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Experience *</Label>
          <Input
            placeholder="e.g. Fresher / 2 Years"
            value={form.experience}
            onChange={(e) => update("experience", e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Current Company</Label>
          <Input
            value={form.current_company}
            onChange={(e) => update("current_company", e.target.value)}
          />
        </div>

        <div>
          <Label>Cover Letter</Label>
          <Textarea
            rows={5}
            value={form.cover_letter}
            onChange={(e) => update("cover_letter", e.target.value)}
          />
        </div>

        <div>
          <Label>Resume *</Label>

          <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-4 hover:bg-muted/50">
            <Upload className="h-5 w-5" />
            <span className="text-sm">
              {resumePath ? "Resume selected" : "Upload PDF resume"}
            </span>

            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadResume(file);
              }}
            />
          </label>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
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
