import { randomUUID } from "crypto";
import { runAgentTurn } from "./agent";
import { getMossClient, INDEXES } from "./moss";
import type { EvalCase, EvalCaseResult, EvalReport } from "./types";
import evalCasesSeed from "../../data/eval-cases.json";

export async function runEvalSuite(): Promise<EvalReport> {
  const cases = evalCasesSeed as EvalCase[];
  const results: EvalCaseResult[] = [];

  for (const testCase of cases) {
    const start = performance.now();
    const trace = await runAgentTurn(testCase.query);
    const latencyMs = performance.now() - start;

    const actualVerdict = trace.guardrailVerdict;
    const verdictOk =
      testCase.expectedVerdict === "block" ? actualVerdict === "block" : actualVerdict !== "block";
    const latencyOk = testCase.maxLatencyMs ? latencyMs <= testCase.maxLatencyMs : true;
    const groundingOk =
      testCase.expectedVerdict === "allow" ? trace.groundingVerdict !== "ungrounded" : true;
    const passed = verdictOk && latencyOk && groundingOk;

    const notes = [
      !verdictOk && `expected ${testCase.expectedVerdict}, got ${actualVerdict}`,
      !latencyOk && `latency ${latencyMs.toFixed(0)}ms exceeded budget of ${testCase.maxLatencyMs}ms`,
      !groundingOk && "answer flagged as ungrounded",
    ]
      .filter(Boolean)
      .join("; ");

    results.push({
      case: testCase,
      actualVerdict,
      passed,
      groundingScore: trace.groundingScore,
      latencyMs,
      notes: notes || undefined,
    });
  }

  const passed = results.filter((r) => r.passed).length;

  const safetyCases = results.filter((r) => r.case.expectedVerdict === "block");
  const safetyAccuracy = safetyCases.length
    ? safetyCases.filter((r) => r.actualVerdict === "block").length / safetyCases.length
    : 1;

  const groundedResults = results.filter((r) => typeof r.groundingScore === "number");
  const avgGroundingScore = groundedResults.length
    ? groundedResults.reduce((s, r) => s + (r.groundingScore ?? 0), 0) / groundedResults.length
    : 0;

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const avgLatencyMs = latencies.length ? latencies.reduce((s, l) => s + l, 0) / latencies.length : 0;
  const p95Index = Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95));
  const p95LatencyMs = latencies[p95Index] ?? avgLatencyMs;

  const report: EvalReport = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    totalCases: results.length,
    passed,
    failed: results.length - passed,
    safetyAccuracy,
    avgGroundingScore,
    avgLatencyMs,
    p95LatencyMs,
    results,
  };

  void persistEvalRun(report);
  return report;
}

async function persistEvalRun(report: EvalReport): Promise<void> {
  try {
    const client = getMossClient();
    await client.addDocs(
      INDEXES.evalRuns,
      [
        {
          id: report.id,
          text: `Eval run ${report.timestamp}: ${report.passed}/${report.totalCases} passed, safety accuracy ${(report.safetyAccuracy * 100).toFixed(0)}%, avg grounding ${report.avgGroundingScore.toFixed(2)}, p95 latency ${report.p95LatencyMs.toFixed(0)}ms.`,
          metadata: {
            passed: String(report.passed),
            total: String(report.totalCases),
            safety_accuracy: report.safetyAccuracy.toFixed(2),
            avg_grounding: report.avgGroundingScore.toFixed(2),
            p95_latency_ms: String(Math.round(report.p95LatencyMs)),
            timestamp: report.timestamp,
          },
        },
      ],
      { upsert: true }
    );
  } catch (err) {
    console.error("[evaluation] failed to persist eval run to Moss", err);
  }
}

export async function getEvalHistory(): Promise<
  { id: string; timestamp: string; passed: number; total: number; safetyAccuracy: number; avgGrounding: number; p95LatencyMs: number }[]
> {
  try {
    const client = getMossClient();
    const docs = await client.getDocs(INDEXES.evalRuns);
    return docs
      .map((d) => ({
        id: d.id,
        timestamp: d.metadata?.timestamp ?? "",
        passed: Number(d.metadata?.passed ?? 0),
        total: Number(d.metadata?.total ?? 0),
        safetyAccuracy: Number(d.metadata?.safety_accuracy ?? 0),
        avgGrounding: Number(d.metadata?.avg_grounding ?? 0),
        p95LatencyMs: Number(d.metadata?.p95_latency_ms ?? 0),
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (err) {
    console.error("[evaluation] failed to fetch eval history", err);
    return [];
  }
}
