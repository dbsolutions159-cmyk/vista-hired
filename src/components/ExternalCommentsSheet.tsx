import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/jobs";

interface Row {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
  author_name?: string | null;
}

export function ExternalCommentsSheet({
  jobKey,
  open,
  onOpenChange,
  onCountChange,
}: {
  jobKey: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCountChange?: (n: number) => void;
}) {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lastSubmitted = useRef<string>("");

  const load = async () => {
    const { data } = await supabase
      .from("external_job_comments")
      .select("id, comment, created_at, user_id")
      .eq("external_job_id", jobKey)
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      profs?.forEach((p) => (names[p.id] = p.full_name || "User"));
    }
    setItems(rows.map((r) => ({ ...r, author_name: names[r.user_id] })));
    onCountChange?.(rows.length);
  };

  useEffect(() => {
    if (open) void load();
  }, [open, jobKey]);

  const submit = async () => {
    if (!user) {
      toast.info("Sign in to comment");
      window.location.href = "/auth";
      return;
    }
    const value = text.trim();
    if (!value) return;
    if (value === lastSubmitted.current) {
      toast.info("You already posted that comment");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("external_job_comments")
      .insert({ external_job_id: jobKey, user_id: user.id, comment: value });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    lastSubmitted.current = value;
    setText("");
    toast.success("Comment posted");
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("external_job_comments").delete().eq("id", id);
    if (error) return toast.error("Couldn't delete comment");
    toast.success("Comment deleted");
    void load();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Comments</SheetTitle>
          <SheetDescription>Discuss this role with other candidates.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 min-w-0 flex-1 overflow-y-auto pr-1">
          {items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Be the first to comment.</p>}
          <ul className="space-y-3">
            {items.map((c) => {
              const initials = (c.author_name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
              const canDelete = isAdmin || c.user_id === user?.id;
              return (
                <li key={c.id} className="rounded-xl border bg-card p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{initials}</AvatarFallback></Avatar>
                    <span className="truncate font-medium text-foreground">{c.author_name || "User"}</span>
                    <span className="shrink-0">· {timeAgo(c.created_at)}</span>
                    {canDelete && (
                      <button
                        onClick={() => remove(c.id)}
                        aria-label="Delete comment"
                        className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm">{c.comment}</p>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="mt-3 border-t pt-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={user ? "Write a comment…" : "Sign in to comment"}
            rows={3}
            disabled={!user}
          />
          <Button onClick={submit} disabled={submitting || !text.trim()} className="mt-2 w-full gradient-primary text-primary-foreground">
            <Send className="mr-1.5 h-4 w-4" /> Post comment
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
