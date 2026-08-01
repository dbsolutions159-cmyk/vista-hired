export const STAGES = [
  "applied",
  "under_review",
  "shortlisted",
  "interview_scheduled",
  "interview_completed",
  "selected",
  "offer_sent",
  "offer_accepted",
  "hired",
  "rejected",
  "withdrawn",
] as const;

export type Stage = (typeof STAGES)[number];

/** Stages shown as kanban columns (terminal negatives live in their own column). */
export const PIPELINE_COLUMNS: Stage[] = [
  "applied",
  "under_review",
  "shortlisted",
  "interview_scheduled",
  "interview_completed",
  "selected",
  "offer_sent",
  "offer_accepted",
  "hired",
  "rejected",
];

export const STAGE_LABELS: Record<Stage, string> = {
  applied: "Applied",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview Scheduled",
  interview_completed: "Interview Completed",
  selected: "Selected",
  offer_sent: "Offer Sent",
  offer_accepted: "Offer Accepted",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/** Semantic-token based classes so light/dark theming keeps working. */
export const STAGE_CLASSES: Record<Stage, string> = {
  applied: "bg-muted text-muted-foreground",
  under_review: "bg-primary/10 text-primary",
  shortlisted: "bg-primary/15 text-primary",
  interview_scheduled: "bg-warning/15 text-warning",
  interview_completed: "bg-warning/20 text-warning",
  selected: "bg-success/15 text-success",
  offer_sent: "bg-success/15 text-success",
  offer_accepted: "bg-success/20 text-success",
  hired: "bg-success/25 text-success",
  rejected: "bg-destructive/15 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

export const ACTIVE_STAGES: Stage[] = [
  "applied",
  "under_review",
  "shortlisted",
  "interview_scheduled",
  "interview_completed",
  "selected",
  "offer_sent",
  "offer_accepted",
];

export function stageLabel(s?: string | null) {
  return STAGE_LABELS[(s as Stage) ?? "applied"] ?? "Applied";
}

/** Progress of the happy path, 0-100. */
export function stageProgress(s?: string | null) {
  const happy: Stage[] = [
    "applied",
    "under_review",
    "shortlisted",
    "interview_scheduled",
    "interview_completed",
    "selected",
    "offer_sent",
    "offer_accepted",
    "hired",
  ];
  const i = happy.indexOf((s as Stage) ?? "applied");
  if (i < 0) return 100;
  return Math.round(((i + 1) / happy.length) * 100);
}

export const INTERVIEW_MODES = [
  { value: "phone", label: "Phone" },
  { value: "video", label: "Video" },
  { value: "in_person", label: "In Person" },
] as const;

export function interviewModeLabel(m?: string | null) {
  return INTERVIEW_MODES.find((x) => x.value === m)?.label ?? "Video";
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
