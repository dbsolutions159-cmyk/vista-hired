import { completionTier } from "@/lib/profile-completion";

export function CompletionRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const tier = completionTier(pct);
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-muted" fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke}
            className={`${tier.ring} transition-all duration-700`}
            fill="none" strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-2xl font-bold">{pct}%</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">complete</div>
          </div>
        </div>
      </div>
      <div className={`text-sm font-semibold ${tier.color}`}>
        {tier.icon} {tier.label}
      </div>
    </div>
  );
}
