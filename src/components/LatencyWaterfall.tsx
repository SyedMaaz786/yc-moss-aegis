import type { TraceStep } from "@/lib/types";

const STEP_META: Record<string, { label: string; color: string }> = {
  input_guardrail: { label: "Input guardrail", color: "var(--series-1)" },
  retrieval: { label: "Moss retrieval", color: "var(--series-2)" },
  llm_generate: { label: "Groq generate", color: "var(--series-3)" },
  output_guardrail: { label: "Output guardrail", color: "var(--series-4)" },
};

export function LatencyWaterfall({ steps, totalMs }: { steps: TraceStep[]; totalMs: number }) {
  if (!steps.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-text-muted mb-2">
        <span>Latency breakdown</span>
        <span className="tabular-nums text-text-secondary font-medium">{totalMs.toFixed(0)} ms total</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2 gap-[2px]">
        {steps.map((step, i) => {
          const pct = Math.max((step.ms / totalMs) * 100, 2);
          const meta = STEP_META[step.name] ?? { label: step.name, color: "var(--text-muted)" };
          return (
            <div
              key={i}
              title={`${meta.label}: ${step.ms.toFixed(1)}ms${step.detail ? ` — ${step.detail}` : ""}`}
              style={{ width: `${pct}%`, backgroundColor: meta.color }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {steps.map((step, i) => {
          const meta = STEP_META[step.name] ?? { label: step.name, color: "var(--text-muted)" };
          return (
            <div key={i} className="flex items-center gap-1.5 text-text-secondary">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: meta.color }} />
              {meta.label}
              <span className="tabular-nums text-text-primary font-medium">{step.ms.toFixed(1)}ms</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
