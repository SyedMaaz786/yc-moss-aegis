"use client";

import { useState } from "react";
import type { Trace } from "@/lib/types";
import { VerdictBadge } from "./VerdictBadge";
import { LatencyWaterfall } from "./LatencyWaterfall";
import { GroundingGauge } from "./GroundingGauge";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

function FeedItem({ trace }: { trace: Trace }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="slide-in rounded-lg border border-border bg-surface-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-surface-2/60 transition-colors rounded-lg"
      >
        <VerdictBadge verdict={trace.guardrailVerdict} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text-primary truncate">{trace.userMessage}</p>
          {trace.blockedReason && (
            <p className="mt-0.5 text-xs text-text-secondary truncate">{trace.blockedReason}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs tabular-nums text-text-muted">{trace.totalMs.toFixed(0)}ms</div>
          <div className="text-[11px] text-text-muted">{timeAgo(trace.timestamp)}</div>
        </div>
      </button>
      {open && (
        <div className="border-t border-border p-3 space-y-3">
          <LatencyWaterfall steps={trace.steps} totalMs={trace.totalMs} />
          {typeof trace.groundingScore === "number" && trace.groundingVerdict && (
            <GroundingGauge score={trace.groundingScore} verdict={trace.groundingVerdict} />
          )}
          {trace.threatType && (
            <div className="text-xs text-text-secondary">
              Threat type: <span className="font-medium text-text-primary">{trace.threatType}</span>
            </div>
          )}
          {trace.retrievedDocs && trace.retrievedDocs.length > 0 && (
            <div>
              <div className="text-xs text-text-muted mb-1">Retrieved context ({trace.retrievedDocs.length})</div>
              <ul className="space-y-1">
                {trace.retrievedDocs.map((d) => (
                  <li key={d.id} className="text-xs text-text-secondary flex gap-2">
                    <span className="tabular-nums text-text-muted shrink-0">{d.score.toFixed(2)}</span>
                    <span className="truncate">{d.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {trace.answer && (
            <div>
              <div className="text-xs text-text-muted mb-1">Response</div>
              <p className="text-sm text-text-primary">{trace.answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GuardrailFeed({ traces }: { traces: Trace[] }) {
  if (traces.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-muted">
        No requests yet. Send a message in the console to see guardrails, retrieval, and grounding evaluated live.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
      {traces.map((t) => (
        <FeedItem key={t.id} trace={t} />
      ))}
    </div>
  );
}
