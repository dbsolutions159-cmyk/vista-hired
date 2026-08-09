import { Copy, Facebook, Linkedin, Send, Share2, MessageCircle, Twitter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildShareMessage, shareTargets, type ShareJobInfo } from "@/lib/share";

/**
 * Share menu for any HireSetu job. Always shares the HireSetu public job URL
 * so the branded Open Graph preview is what social platforms render — the
 * official company apply URL is never shared.
 */
export function ShareJobMenu({
  job,
  size = "sm",
  variant = "ghost",
  label,
  className = "",
}: {
  job: ShareJobInfo;
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "secondary";
  label?: string;
  className?: string;
}) {
  const targets = shareTargets(job);
  const message = buildShareMessage(job);

  const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  const nativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${job.title} at ${job.company}`, text: message, url: job.url });
      } else {
        await navigator.clipboard.writeText(message);
        toast.success("Job link copied");
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(job.url);
      toast.success("HireSetu job link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className} aria-label="Share job">
          <Share2 className="h-4 w-4" />
          {label && <span className="ml-1.5">{label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Share on HireSetu</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => open(targets.whatsapp)}>
          <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open(targets.telegram)}>
          <Send className="mr-2 h-4 w-4" /> Telegram
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open(targets.linkedin)}>
          <Linkedin className="mr-2 h-4 w-4" /> LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open(targets.facebook)}>
          <Facebook className="mr-2 h-4 w-4" /> Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => open(targets.x)}>
          <Twitter className="mr-2 h-4 w-4" /> X
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void nativeShare()}>
          <Share2 className="mr-2 h-4 w-4" /> More…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copyLink()}>
          <Copy className="mr-2 h-4 w-4" /> Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
