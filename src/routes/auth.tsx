import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — HireSetu" },
      { name: "description", content: "Sign in to HireSetu with Google to apply, like, and comment on jobs." },
      { property: "og:title", content: "Sign in — HireSetu" },
      { property: "og:description", content: "Sign in to HireSetu with Google to apply, like, and comment on jobs." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const signInWithGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Sign-in failed", { description: result.error.message });
      setLoading(false);
      return;
    }
    if (result.redirected) return; // full-page redirect
    toast.success("Signed in successfully");
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4">
      <Card className="w-full p-8 shadow-elevated">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl gradient-primary shadow-soft">
            <Briefcase className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Welcome to HireSetu</h1>
            <p className="text-sm text-muted-foreground">Sign in to apply for jobs</p>
          </div>
        </div>

        <Button onClick={signInWithGoogle} disabled={loading} variant="outline" className="mt-8 h-11 w-full text-base">
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.3 12 2.3 6.8 2.3 2.6 6.5 2.6 11.9S6.8 21.5 12 21.5c6.9 0 11.5-4.8 11.5-11.6 0-.8-.1-1.4-.2-2H12z" /></svg>
          {loading ? "Signing in…" : "Continue with Google"}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to the terms and privacy policy.
        </p>
      </Card>
    </div>
  );
}
