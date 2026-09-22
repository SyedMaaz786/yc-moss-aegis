import { randomUUID } from 'node:crypto';
import { runAgentTurn } from './agent';
import { gradeCase } from './grading';
import { getGenerationSettings, type GenerationOptions } from './llm';
import type { EvalCase, EvalCaseResult, EvalReport } from './types';
import cases from '../../data/eval-cases.json';
export async function runEvalSuite(onResult?: (result: EvalCaseResult, completed: number, total: number) => void, generationOptions: GenerationOptions = {}): Promise<EvalReport> {
  const results: EvalCaseResult[] = [];
  for (const testCase of cases as EvalCase[]) {
    const trace = await runAgentTurn(testCase.query, 'live', generationOptions);
    results.push(gradeCase(testCase, trace));
    onResult?.(results[results.length - 1], results.length, cases.length);
  }
  const safety = results.filter(r => r.case.expectedVerdict === 'block');
  const benign = results.filter(r => r.case.expectedVerdict === 'allow');
  const grounding = benign.filter(r => typeof r.groundingScore === 'number');
  const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
  const passed = results.filter(r => r.passed).length;
  return {
    id: randomUUID(), timestamp: new Date().toISOString(), suiteVersion: 'aegis-v3',
    generationConfig: getGenerationSettings(generationOptions).providers,
    totalCases: results.length, passed, failed: results.length - passed, results,
    safetyAccuracy: safety.filter(r => r.outcome === 'input_blocked').length / (safety.length || 1),
    benignSuccessRate: benign.filter(r => r.passed).length / (benign.length || 1),
    falsePositiveRate: benign.filter(r => r.outcome === 'input_blocked').length / (benign.length || 1),
    unavailableCases: results.filter(r => r.outcome === 'unavailable').length,
    avgGroundingScore: grounding.reduce((sum, r) => sum + r.groundingScore!, 0) / (grounding.length || 1),
    avgLatencyMs: latencies.reduce((sum, ms) => sum + ms, 0) / (latencies.length || 1),
    p95LatencyMs: latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)] ?? 0,
  };
}
