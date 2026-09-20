"use client";

import { useEffect, useState } from "react";

type HealthState =
  | { status: "checking" }
  | { status: "up"; roundTripMs: number; mossReportedMs?: number }
  | { status: "down"; simulated: boolean; error: string };

const POLL_MS = 8000;

export function SystemStatusBanner() {
  const [health, setHealth] = useState<HealthState>({ status: "checking" });
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/system/health", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.moss === "up") {
          setHealth({ status: "up", roundTripMs: data.roundTripMs, mossReportedMs: data.mossReportedMs });
        } else {
          setHealth({ status: "down", simulated: Boolean(data.simulated), error: data.error });
        }
      } catch {
        if (cancelled) return;
        setHealth({ status: "down", simulated: false, error: "Health check request failed" });
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function toggleChaos(down: boolean) {
    setToggling(true);
    try {
      await fetch("/api/system/chaos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ down }),
      });
    } finally {
      setToggling(false);
    }
  }

  if (health.status === "checking") {
    return (
      <div className="border-b border-border bg-surface-1 px-4 sm:px-6 py-1.5 text-xs text-text-muted flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-pulse" />
        Checking Moss retrieval health…
      </div>
    );
  }

  if (health.status === "up") {
    return (
      <div className="border-b border-border bg-surface-1 px-4 sm:px-6 py-1.5 text-xs text-text-secondary flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--status-good)" }} />
        <span>
          Moss retrieval: healthy — {health.roundTripMs}ms round trip
          {typeof health.mossReportedMs === "number" && ` (Moss reported ${health.mossReportedMs.toFixed(1)}ms)`}
        </span>
        <button
          onClick={() => toggleChaos(true)}
          disabled={toggling}
          className="ml-auto shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-50"
          title="Force a simulated Moss outage to see the failover behavior live, without waiting for a real one."
        >
          🧪 Simulate outage
        </button>
      </div>
    );
  }

  if (health.simulated) {
    return (
      <div
        className="border-b px-4 sm:px-6 py-2 text-xs sm:text-sm flex flex-wrap items-center gap-x-2 gap-y-1"
        style={{
          backgroundColor: "color-mix(in srgb, var(--series-1) 12%, transparent)",
          borderColor: "color-mix(in srgb, var(--series-1) 30%, transparent)",
          color: "var(--series-1)",
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--series-1)" }} />
        <span className="font-medium">🧪 Simulated Moss outage (demo mode)</span>
        <span className="text-text-secondary">
          — every real Moss call is being blocked on purpose. Guardrails have failed over to regex-only checks and
          the agent is declining to guess at ungrounded answers. Auto-restores in ≤90s.
        </span>
        <button
          onClick={() => toggleChaos(false)}
          disabled={toggling}
          className="ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50"
          style={{ borderColor: "var(--series-1)", color: "var(--series-1)" }}
        >
          Restore Moss now
        </button>
      </div>
    );
  }

  return (
    <div
      className="border-b px-4 sm:px-6 py-2 text-xs sm:text-sm flex flex-wrap items-center gap-x-2 gap-y-1"
      style={{
        backgroundColor: "color-mix(in srgb, var(--status-warning) 12%, transparent)",
        borderColor: "color-mix(in srgb, var(--status-warning) 30%, transparent)",
        color: "var(--status-warning)",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--status-warning)" }} />
      <span className="font-medium">Moss retrieval layer unreachable</span>
      <span className="text-text-secondary">
        — Aegis has automatically failed over to regex-only input guardrails and is declining to guess at
        ungrounded answers rather than risk a hallucination. This is the reliability layer degrading safely, live,
        exactly as designed.
      </span>
      <span className="text-text-muted ml-auto shrink-0">retrying every {POLL_MS / 1000}s</span>
    </div>
  );
}
