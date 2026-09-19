export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "good" | "warning" | "critical" | "neutral";
}) {
  const dot =
    accent === "good"
      ? "var(--status-good)"
      : accent === "warning"
        ? "var(--status-warning)"
        : accent === "critical"
          ? "var(--status-critical)"
          : "var(--series-1)";

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums text-text-primary">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-text-secondary">{sub}</div>}
    </div>
  );
}
