import type { GuardrailVerdict } from "@/lib/types";

const CONFIG: Record<GuardrailVerdict, { label: string; color: string; icon: string }> = {
  allow: { label: "Allowed", color: "var(--status-good)", icon: "✓" },
  warn: { label: "Flagged", color: "var(--status-warning)", icon: "⚠" },
  block: { label: "Blocked", color: "var(--status-critical)", icon: "✕" },
};

export function VerdictBadge({ verdict }: { verdict: GuardrailVerdict }) {
  const cfg = CONFIG[verdict];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ color: cfg.color, backgroundColor: `color-mix(in srgb, ${cfg.color} 14%, transparent)` }}
    >
      <span aria-hidden>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
