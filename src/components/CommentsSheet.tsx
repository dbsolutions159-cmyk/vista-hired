import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/jobs";

interface CommentRow {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author_name?: string | null;
}

export function CommentsSheet({
  jobId,
  open,
  onOpenChange,
  onCountChange,
}: {
  jobId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCountChange?: (n: number) => void;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("comments").select("id, content, created_at, user_id").eq("job_id", jobId).order("created_at", { ascending: false });
    const rows = data ?? [];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      profs?.forEach((p) => (names[p.id] = p.full_name || "User"));
    }
    setItems(rows.map((r) => ({ ...r, author_name: names[r.user_id] })));
    onCountChange?.(rows.length);
  };

  useEffect(() => {
    if (open) load();
  }, [open, jobId]);

  const submit = async () => {
    if (!user) {
      toast.info("Sign in to comment");
      window.location.href = "/auth";
      return;
    }
    const value = text.trim();
    if (!value) return;
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({ job_id: jobId, user_id: user.id, content: value });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setText("");
    toast.success("Comment posted");
    load();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Comments</SheetTitle>
          <SheetDescription>Discuss this role with other candidates.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Be the first to comment.</p>}
          <ul className="space-y-3">
            {items.map((c) => {
              const initials = (c.author_name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
              return (
                <li key={c.id} className="rounded-xl border bg-card p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{initials}</AvatarFallback></Avatar>
                    <span className="font-medium text-foreground">{c.author_name || "User"}</span>
                    <span>· {timeAgo(c.created_at)}</span>
                  </div>
                  <p className="mt-1.5 text-sm whitespace-pre-wrap">{c.content}</p>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="mt-3 border-t pt-3">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={user ? "Write a comment…" : "Sign in to comment"} rows={3} disabled={!user} />
          <Button onClick={submit} disabled={submitting || !text.trim()} className="mt-2 w-full gradient-primary text-primary-foreground">
            <Send className="mr-1.5 h-4 w-4" /> Post comment
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
