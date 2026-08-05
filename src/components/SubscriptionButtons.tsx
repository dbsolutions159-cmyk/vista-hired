import { Crown, Share2, Copy, Send, Linkedin, Facebook, MessageCircle, Smartphone } from "lucide-react";
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

export const SUBSCRIPTION_URL = "https://hiresetu-premium.lovable.app";
export const SUBSCRIPTION_MESSAGE =
  "HireSetu Premium – Explore premium recruitment and career plans on HireSetu.";

const shareText = `${SUBSCRIPTION_MESSAGE} ${SUBSCRIPTION_URL}`;

const targets = [
  { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
  { label: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SUBSCRIPTION_URL)}&quote=${encodeURIComponent(SUBSCRIPTION_MESSAGE)}` },
  { label: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SUBSCRIPTION_URL)}` },
  { label: "Telegram", icon: Send, href: `https://t.me/share/url?url=${encodeURIComponent(SUBSCRIPTION_URL)}&text=${encodeURIComponent(SUBSCRIPTION_MESSAGE)}` },
  { label: "X", icon: Share2, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(SUBSCRIPTION_MESSAGE)}&url=${encodeURIComponent(SUBSCRIPTION_URL)}` },
];

export function SubscriptionButton({
  className = "",
  size = "sm",
  iconOnly = false,
}: {
  className?: string;
  size?: "sm" | "default" | "icon";
  iconOnly?: boolean;
}) {
  return (
    <Button
      asChild
      size={size}
      className={`bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-soft hover:from-amber-600 hover:to-amber-500 ${className}`}
    >
      <a href={SUBSCRIPTION_URL} target="_blank" rel="noopener noreferrer" aria-label="Subscription">
        <Crown className={iconOnly ? "h-4 w-4" : "mr-1.5 h-4 w-4"} />
        {!iconOnly && "Subscription"}
      </a>
    </Button>
  );
}

export function ShareSubscriptionButton({
  className = "",
  variant = "outline",
  label = "Share Subscription",
}: {
  className?: string;
  variant?: "outline" | "ghost" | "secondary";
  label?: string;
}) {
  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "HireSetu Premium", text: SUBSCRIPTION_MESSAGE, url: SUBSCRIPTION_URL });
      } catch {
        /* user cancelled */
      }
    } else {
      toast.info("Native sharing isn't available on this device");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant={variant} className={`border-amber-500/40 text-amber-600 hover:bg-amber-500/10 ${className}`}>
          <Share2 className="mr-1.5 h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Share HireSetu Premium</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {targets.map((t) => (
          <DropdownMenuItem key={t.label} asChild>
            <a href={t.href} target="_blank" rel="noopener noreferrer">
              <t.icon className="mr-2 h-4 w-4" />
              {t.label}
            </a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={nativeShare}><Smartphone className="mr-2 h-4 w-4" />Device share</DropdownMenuItem>
        <DropdownMenuItem onClick={copyLink}><Copy className="mr-2 h-4 w-4" />Copy link</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
