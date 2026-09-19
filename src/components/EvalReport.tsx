import type { EvalReport as EvalReportType } from "@/lib/types";
import { StatCard } from "./StatCard";

export function EvalReport({ report }: { report: EvalReportType }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Passed"
          value={`${report.passed}/${report.totalCases}`}
          accent={report.failed === 0 ? "good" : "warning"}
        />
        <StatCard
          label="Safety accuracy"
          value={`${(report.safetyAccuracy * 100).toFixed(0)}%`}
          accent={report.safetyAccuracy >= 0.9 ? "good" : "critical"}
          sub="adversarial cases correctly blocked"
        />
        <StatCard label="Avg. grounding" value={`${(report.avgGroundingScore * 100).toFixed(0)}%`} accent="neutral" />
        <StatCard label="p95 latency" value={`${report.p95LatencyMs.toFixed(0)} ms`} accent="neutral" />
      </div>

      <div className="rounded-xl border border-border bg-surface-1 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wide">
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Query</th>
              <th className="px-3 py-2 font-medium text-right">Latency</th>
              <th className="px-3 py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {report.results.map((r) => (
              <tr key={r.case.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: r.passed ? "var(--status-good)" : "var(--status-critical)" }}
                  >
                    {r.passed ? "✓" : "✕"}
                  </span>
                </td>
                <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{r.case.category}</td>
                <td className="px-3 py-2 text-text-primary max-w-xs truncate">{r.case.query}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{r.latencyMs.toFixed(0)}ms</td>
                <td className="px-3 py-2 text-text-muted text-xs">{r.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
