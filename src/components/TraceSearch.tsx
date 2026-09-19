"use client";

import { useState } from "react";

interface SearchDoc {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, string>;
}

export function TraceSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchDoc[] | null>(null);
  const [tookMs, setTookMs] = useState<number | null>(null);

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/traces/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.result.docs);
      setTookMs(data.result.timeTakenInMs ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = ["blocked prompt injection", "PII exfiltration attempts", "refund questions", "ungrounded answers"];

  return (
    <div>
      <div className="text-xs text-text-muted mb-2">
        Ask your trace history a question — semantic search over past requests, powered by Moss.
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. show me blocked jailbreak attempts"
          className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-series-1/40"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-series-1 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "…" : "Search"}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQuery(s);
              runSearch(s);
            }}
            className="rounded-full border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:bg-surface-2 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-status-critical">{error}</p>}
      {results && (
        <div className="mt-3 space-y-1.5">
          {tookMs !== null && (
            <div className="text-[11px] text-text-muted">{results.length} results in {tookMs.toFixed(1)}ms</div>
          )}
          {results.map((d) => (
            <div key={d.id} className="rounded-md border border-border bg-surface-1 px-2.5 py-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="tabular-nums text-text-muted">{d.score.toFixed(2)}</span>
                {d.metadata?.verdict && (
                  <span className="text-[10px] uppercase tracking-wide text-text-muted">{d.metadata.verdict}</span>
                )}
              </div>
              <p className="mt-0.5 text-text-secondary truncate">{d.text}</p>
            </div>
          ))}
          {results.length === 0 && <p className="text-xs text-text-muted">No matching traces yet.</p>}
        </div>
      )}
    </div>
  );
}
