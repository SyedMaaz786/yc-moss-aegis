import { INDEXES, getMossClient, mossQuery } from "./moss";
import type { Trace } from "./types";

declare global {
  var __aegisTraceBuffer: Trace[] | undefined;
}

const MAX_BUFFER = 200;

function buffer(): Trace[] {
  if (!globalThis.__aegisTraceBuffer) {
    globalThis.__aegisTraceBuffer = [];
  }
  return globalThis.__aegisTraceBuffer;
}

/** Records a trace to the in-memory feed (for the live dashboard) and, best-effort, to Moss for durable semantic search over trace history. */
export function recordTrace(trace: Trace): void {
  const buf = buffer();
  buf.unshift(trace);
  if (buf.length > MAX_BUFFER) buf.length = MAX_BUFFER;
  void persistTrace(trace);
}

export function getRecentTraces(limit = 50): Trace[] {
  return buffer().slice(0, limit);
}

export function getSessionStats() {
  const traces = buffer();
  const total = traces.length;
  const blocked = traces.filter((t) => t.guardrailVerdict === "block").length;
  const warned = traces.filter((t) => t.guardrailVerdict === "warn").length;
  const latencies = traces.map((t) => t.totalMs).sort((a, b) => a - b);
  const avgLatencyMs = latencies.length ? latencies.reduce((s, l) => s + l, 0) / latencies.length : 0;
  const groundingScores = traces.filter((t) => typeof t.groundingScore === "number").map((t) => t.groundingScore!);
  const avgGroundingScore = groundingScores.length
    ? groundingScores.reduce((s, v) => s + v, 0) / groundingScores.length
    : undefined;
  return { total, blocked, warned, allowed: total - blocked - warned, avgLatencyMs, avgGroundingScore };
}

async function persistTrace(trace: Trace): Promise<void> {
  try {
    const client = getMossClient();
    await client.addDocs(
      INDEXES.traces,
      [
        {
          id: trace.id,
          text: `${trace.userMessage} => ${trace.answer ?? `[${trace.guardrailVerdict}] ${trace.blockedReason ?? ""}`}`,
          metadata: {
            verdict: trace.guardrailVerdict,
            threat_type: trace.threatType ?? "",
            grounding_verdict: trace.groundingVerdict ?? "",
            total_ms: String(Math.round(trace.totalMs)),
            timestamp: trace.timestamp,
          },
        },
      ],
      { upsert: true }
    );
  } catch (err) {
    // Non-fatal: the live dashboard already has it in the in-memory buffer.
    console.error("[tracing] failed to persist trace to Moss", err);
  }
}

export async function searchTraces(query: string, topK = 10) {
  return mossQuery(INDEXES.traces, query, { topK });
}
