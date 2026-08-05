import { Link, useRouter } from "@tanstack/react-router";
import { Briefcase, LogOut, Moon, PlusCircle, Shield, Sun, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "@/components/NotificationBell";
import { ShareSubscriptionButton, SubscriptionButton, SUBSCRIPTION_MESSAGE, SUBSCRIPTION_URL } from "@/components/SubscriptionButtons";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const isDark = saved ? saved === "dark" : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", !!isDark);
    setDark(!!isDark);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.navigate({ to: "/", replace: true });
  };

  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 glass">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-soft">
            <Briefcase className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-tight">HireSetu</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Jobs feed</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex border-primary/40 text-primary hover:bg-primary/10">
            <Link to="/post-job"><PlusCircle className="mr-1.5 h-4 w-4" />Post a Job</Link>
          </Button>
          <SubscriptionButton className="hidden sm:inline-flex" />
          <SubscriptionButton size="icon" iconOnly className="sm:hidden" />
          {isAdmin && (
            <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex border-primary/40 text-primary hover:bg-primary/10">
              <Link to="/admin"><Shield className="mr-1.5 h-4 w-4" />Admin</Link>
            </Button>
          )}
          <NotificationBell />

          <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt="" />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="mr-2 h-4 w-4" />My profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/post-job"><PlusCircle className="mr-2 h-4 w-4" />Post a job</Link></DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={SUBSCRIPTION_URL} target="_blank" rel="noopener noreferrer"><Crown className="mr-2 h-4 w-4 text-amber-500" />Subscription</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`${SUBSCRIPTION_MESSAGE} ${SUBSCRIPTION_URL}`)}`} target="_blank" rel="noopener noreferrer"><Share2 className="mr-2 h-4 w-4" />Share subscription</a>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild><Link to="/admin"><Shield className="mr-2 h-4 w-4" />Admin</Link></DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>

            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="gradient-primary text-primary-foreground shadow-soft">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
