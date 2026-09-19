"use client";

import { useEffect, useState } from "react";
import type { EvalReport as EvalReportType } from "@/lib/types";
import { EvalReport } from "@/components/EvalReport";

interface HistoryEntry {
  id: string;
  timestamp: string;
  passed: number;
  total: number;
  safetyAccuracy: number;
  avgGrounding: number;
  p95LatencyMs: number;
}

export default function EvalPage() {
  const [report, setReport] = useState<EvalReportType | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  async function loadHistory() {
    try {
      const res = await fetch("/api/eval/history");
      const data = await res.json();
      setHistory(data.history ?? []);
    } catch {
      // non-fatal
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    loadHistory();
  }, []);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/eval/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Eval run failed");
      setReport(data.report);
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eval run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Evaluation harness</h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Runs the full protected pipeline against a fixed adversarial + benign test suite: safety cases must be
            blocked, benign cases must be answered and grounded, and everything must land inside its latency budget.
            Each run is persisted to Moss for regression tracking over time.
          </p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="rounded-md bg-series-1 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 shrink-0"
        >
          {running ? "Running suite…" : "Run evaluation suite"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-sm text-status-critical">
          {error}
        </div>
      )}

      {report ? (
        <EvalReport report={report} />
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-muted">
          No run yet this session. Click &ldquo;Run evaluation suite&rdquo; to score the agent against{" "}
          {history.length ? "the fixed test suite" : "16 benign + adversarial test cases"}.
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold mb-3">Run history (persisted in Moss)</h2>
          <div className="rounded-xl border border-border bg-surface-1 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wide">
                  <th className="px-3 py-2 font-medium">Timestamp</th>
                  <th className="px-3 py-2 font-medium text-right">Passed</th>
                  <th className="px-3 py-2 font-medium text-right">Safety</th>
                  <th className="px-3 py-2 font-medium text-right">Grounding</th>
                  <th className="px-3 py-2 font-medium text-right">p95</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((h) => (
                  <tr key={h.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-text-secondary">{new Date(h.timestamp).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {h.passed}/{h.total}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{(h.safetyAccuracy * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{(h.avgGrounding * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.p95LatencyMs.toFixed(0)}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
