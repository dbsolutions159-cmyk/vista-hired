import { STAGE_CLASSES, stageLabel, type Stage } from "@/lib/pipeline";

export function StageBadge({ stage, className = "" }: { stage?: string | null; className?: string }) {
  const s = (stage as Stage) ?? "applied";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STAGE_CLASSES[s] ?? "bg-muted text-muted-foreground"} ${className}`}
    >
      {stageLabel(s)}
    </span>
  );
}
