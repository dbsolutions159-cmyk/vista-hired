import { Link } from "@tanstack/react-router";
import { Building2, Heart, MapPin, MessageCircle, Send, Share2, Briefcase, BadgeCheck, Bookmark, Star, Zap, Home, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { employmentTypeLabels, formatSalary, timeAgo, workTypeLabels, type Job } from "@/lib/jobs";
import { CommentsSheet } from "@/components/CommentsSheet";
import { ApplyNowButton, PremiumMembershipButton } from "@/components/JobCta";


export function JobCard({ job }: { job: Job }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [openComments, setOpenComments] = useState(false);

  const j = job as any;
  const verified = !!j.verified;
  const isDirect = j.poster_role === "employer" || j.poster_role === "hr";
  const isRecruiter = j.poster_role === "recruiter" || j.poster_role === "consultancy";
  const featured = !!j.featured;
  const urgent = !!j.urgent;

  useEffect(() => {
    supabase.from("likes").select("id, user_id", { count: "exact" }).eq("job_id", job.id).then(({ data, count }) => {
      setLikes(count ?? data?.length ?? 0);
      if (user) setLiked(!!data?.find((l) => l.user_id === user.id));
    });
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("job_id", job.id).then(({ count }) => setCommentCount(count ?? 0));
    if (user) {
      supabase.from("saved_jobs").select("id").eq("job_id", job.id).eq("user_id", user.id).maybeSingle().then(({ data }) => setSaved(!!data));
    }
  }, [job.id, user]);

  const requireAuth = () => {
    if (!user) {
      toast.info("Sign in to continue", { action: { label: "Sign in", onClick: () => (window.location.href = "/auth") } });
      return false;
    }
    return true;
  };

  const toggleLike = async () => {
    if (!requireAuth()) return;
    if (liked) { setLiked(false); setLikes((l) => l - 1); await supabase.from("likes").delete().eq("job_id", job.id).eq("user_id", user!.id); }
    else { setLiked(true); setLikes((l) => l + 1); await supabase.from("likes").insert({ job_id: job.id, user_id: user!.id }); }
  };

  const toggleSave = async () => {
    if (!requireAuth()) return;
    if (saved) { setSaved(false); await supabase.from("saved_jobs").delete().eq("job_id", job.id).eq("user_id", user!.id); toast("Removed from saved"); }
    else { setSaved(true); await supabase.from("saved_jobs").insert({ job_id: job.id, user_id: user!.id }); toast.success("Saved"); }
  };

  const share = async () => {
    const url = `${window.location.origin}/jobs/${job.id}`;
    const data = { title: `${job.title} — ${job.company_name}`, text: `Check out ${job.title} at ${job.company_name}`, url };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {}
  };

  const cover = (job as any).cover_image_url as string | undefined;
  const video = (job as any).video_url as string | undefined;
  return (
    <Card className={`group overflow-hidden border-border/70 bg-card shadow-soft transition-all hover:shadow-elevated ${featured ? "ring-1 ring-primary/40" : ""}`}>
      {cover && (
        <Link to="/jobs/$id" params={{ id: job.id }} className="block">
          <div className="relative">
            <img src={cover} alt="" className="h-36 w-full object-cover sm:h-44" loading="lazy" />
            {video && (
              <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                ▶ Video
              </span>
            )}
          </div>
        </Link>
      )}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border bg-gradient-to-br from-primary/10 to-primary/5">
            {job.company_logo_url ? <img src={job.company_logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <Building2 className="h-6 w-6 text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{job.company_name}</span>
              <span>· {timeAgo(job.created_at)}</span>
            </div>
            <Link to="/jobs/$id" params={{ id: job.id }} className="mt-0.5 block">
              <h3 className="truncate font-display text-lg font-semibold leading-snug tracking-tight hover:text-primary">{job.title}</h3>
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
              <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.experience || "Any experience"}</span>
              <span className="font-semibold text-foreground">{formatSalary(job)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {verified && <Badge className="rounded-full gradient-primary text-primary-foreground gap-1"><BadgeCheck className="h-3 w-3" />Verified by HireSetu</Badge>}
              {isDirect && <Badge variant="outline" className="rounded-full border-emerald-500/50 text-emerald-600 gap-1"><Building2 className="h-3 w-3" />Direct Employer</Badge>}
              {isRecruiter && <Badge variant="outline" className="rounded-full gap-1"><UserRound className="h-3 w-3" />Recruiter Posted</Badge>}
              {urgent && <Badge className="rounded-full bg-rose-500 text-white gap-1"><Zap className="h-3 w-3" />Urgent Hiring</Badge>}
              {featured && <Badge className="rounded-full bg-amber-500 text-white gap-1"><Star className="h-3 w-3" />Featured</Badge>}
              {job.work_type === "remote" && <Badge variant="secondary" className="rounded-full gap-1"><Home className="h-3 w-3" />Work From Home</Badge>}
              <Badge variant="secondary" className="rounded-full">{workTypeLabels[job.work_type]}</Badge>
              <Badge variant="secondary" className="rounded-full">{employmentTypeLabels[job.employment_type]}</Badge>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
          </div>
          <button onClick={toggleSave} className="text-muted-foreground hover:text-primary" aria-label="Save job">
            <Bookmark className={`h-5 w-5 ${saved ? "fill-primary text-primary" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-t bg-muted/30 px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={toggleLike} className="gap-1.5">
            <Heart className={`h-4 w-4 transition-transform ${liked ? "fill-red-500 text-red-500 scale-110" : ""}`} />
            <span className="tabular-nums">{likes}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpenComments(true)} className="gap-1.5">
            <MessageCircle className="h-4 w-4" />
            <span className="tabular-nums">{commentCount}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={share} className="gap-1.5">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <PremiumMembershipButton jobId={job.id} source="job_card" label="Premium" />
          <ApplyNowButton jobId={job.id} source="job_card" />
        </div>

      </div>

      <CommentsSheet jobId={job.id} open={openComments} onOpenChange={setOpenComments} onCountChange={setCommentCount} />
    </Card>
  );
}
