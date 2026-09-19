import type { GroundingVerdict } from "@/lib/types";

const VERDICT_META: Record<GroundingVerdict, { label: string; color: string }> = {
  grounded: { label: "Grounded", color: "var(--status-good)" },
  weak: { label: "Weakly grounded", color: "var(--status-warning)" },
  ungrounded: { label: "Ungrounded — possible hallucination", color: "var(--status-critical)" },
};

export function GroundingGauge({ score, verdict }: { score: number; verdict: GroundingVerdict }) {
  const meta = VERDICT_META[verdict];
  const pct = Math.round(score * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-text-muted mb-2">
        <span>Answer grounding (re-retrieval faithfulness)</span>
        <span className="tabular-nums text-text-secondary font-medium">{pct}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: "var(--seq-500)" }}
        />
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: meta.color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
        {meta.label}
      </div>
    </div>
  );
}
