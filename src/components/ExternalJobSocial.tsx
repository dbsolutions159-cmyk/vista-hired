import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useExternalJobSocial, externalJobKey } from "@/lib/external-social";
import { ExternalCommentsSheet } from "@/components/ExternalCommentsSheet";
import { ShareJobMenu } from "@/components/ShareJobMenu";
import type { ShareJobInfo } from "@/lib/share";

/** Like / Comment / Share row for imported (external) jobs. */
export function ExternalJobSocial({
  source,
  externalId,
  share,
  className = "",
}: {
  source: string;
  externalId: string;
  share: ShareJobInfo;
  className?: string;
}) {
  const { user } = useAuth();
  const key = externalJobKey(source, externalId);
  const { like_count, comment_count, liked_by_me, toggleLike, setCommentCount } = useExternalJobSocial(key, user?.id);
  const [open, setOpen] = useState(false);

  const onLike = async () => {
    if (!user) {
      toast.info("Sign in to like jobs", { action: { label: "Sign in", onClick: () => (window.location.href = "/auth") } });
      return;
    }
    const ok = await toggleLike();
    if (!ok) toast.error("Couldn't update like");
  };

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-0.5 ${className}`}>
      <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={onLike} aria-label="Like job">
        <Heart className={`h-4 w-4 transition-transform ${liked_by_me ? "scale-110 fill-red-500 text-red-500" : ""}`} />
        <span className="tabular-nums text-xs">{like_count}</span>
      </Button>
      <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={() => setOpen(true)} aria-label="Comments">
        <MessageCircle className="h-4 w-4" />
        <span className="tabular-nums text-xs">{comment_count}</span>
      </Button>
      <ShareJobMenu job={share} />
      <ExternalCommentsSheet jobKey={key} open={open} onOpenChange={setOpen} onCountChange={setCommentCount} />
    </div>
  );
}
