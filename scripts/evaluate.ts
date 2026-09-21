import { config } from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
config({ path: '.env.local', quiet: true });
async function main() {
  const { runEvalSuite } = await import('../src/lib/evaluation');
  const report = await runEvalSuite((r, n, total) => console.log(n + '/' + total, r.passed ? 'PASS' : 'FAIL', r.case.id, r.outcome, r.notes ?? ''));
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/evaluation.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ total: report.totalCases, passed: report.passed, safety: report.safetyAccuracy, benign: report.benignSuccessRate, falsePositives: report.falsePositiveRate, p95: report.p95LatencyMs }));
  process.exit(report.failed ? 1 : 0);
}
void main().catch(e => { console.error(e instanceof Error ? e.message : 'Evaluation failed'); process.exit(1); });
