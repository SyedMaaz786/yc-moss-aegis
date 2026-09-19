"use client";

import { useCallback, useEffect, useState } from "react";
import type { Trace } from "@/lib/types";
import { ChatPanel } from "@/components/ChatPanel";
import { GuardrailFeed } from "@/components/GuardrailFeed";
import { StatCard } from "@/components/StatCard";
import { TraceSearch } from "@/components/TraceSearch";

interface Stats {
  total: number;
  blocked: number;
  warned: number;
  allowed: number;
  avgLatencyMs: number;
  avgGroundingScore?: number;
}

export default function Home() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/traces");
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats);
      setTraces((prev) => {
        const byId = new Map(prev.map((t) => [t.id, t]));
        for (const t of data.traces as Trace[]) byId.set(t.id, t);
        return Array.from(byId.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });
    } catch {
      // best-effort background refresh
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount + poll
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleTrace = useCallback((trace: Trace) => {
    setTraces((prev) => [trace, ...prev.filter((t) => t.id !== trace.id)]);
    setStats((prev) => {
      const total = (prev?.total ?? 0) + 1;
      const blocked = (prev?.blocked ?? 0) + (trace.guardrailVerdict === "block" ? 1 : 0);
      const warned = (prev?.warned ?? 0) + (trace.guardrailVerdict === "warn" ? 1 : 0);
      return {
        total,
        blocked,
        warned,
        allowed: total - blocked - warned,
        avgLatencyMs: prev ? (prev.avgLatencyMs * (total - 1) + trace.totalMs) / total : trace.totalMs,
        avgGroundingScore: trace.groundingScore ?? prev?.avgGroundingScore,
      };
    });
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Live Trust Console</h1>
        <p className="text-sm text-text-secondary mt-1 max-w-2xl">
          Every message below is checked against a Moss-backed threat-pattern index before the agent responds, and
          every response is re-checked for grounding and leaked PII before it reaches the user — all timed and
          traced in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Requests this session" value={String(stats?.total ?? 0)} />
        <StatCard
          label="Blocked"
          value={String(stats?.blocked ?? 0)}
          accent={stats && stats.blocked > 0 ? "critical" : "neutral"}
          sub={stats && stats.total > 0 ? `${((stats.blocked / stats.total) * 100).toFixed(0)}% of traffic` : undefined}
        />
        <StatCard
          label="Avg. latency"
          value={stats ? `${stats.avgLatencyMs.toFixed(0)} ms` : "—"}
          accent="neutral"
        />
        <StatCard
          label="Avg. grounding"
          value={stats?.avgGroundingScore !== undefined ? `${Math.round(stats.avgGroundingScore * 100)}%` : "—"}
          accent={stats?.avgGroundingScore !== undefined && stats.avgGroundingScore >= 0.55 ? "good" : "warning"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChatPanel onTrace={handleTrace} />

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface-1 p-4">
            <h2 className="text-sm font-semibold mb-3">Guardrail feed</h2>
            <GuardrailFeed traces={traces} />
          </div>
          <div className="rounded-xl border border-border bg-surface-1 p-4">
            <h2 className="text-sm font-semibold mb-3">Trace search</h2>
            <TraceSearch />
          </div>
        </div>
      </div>
    </div>
  );
}
