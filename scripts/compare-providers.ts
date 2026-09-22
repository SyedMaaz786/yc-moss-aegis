import { config } from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
config({ path: '.env.local', quiet: true });
async function main() {
  const { runEvalSuite } = await import('../src/lib/evaluation');
  const { mossQuery, INDEXES } = await import('../src/lib/moss');
  // Warm the shared retrieval layer before both runs; generation remains measured.
  await mossQuery(INDEXES.knowledge, 'policy');
  await mossQuery(INDEXES.threats, 'security');
  const runs = [];
  for (const provider of ['groq', 'hidevs'] as const) {
    const report = await runEvalSuite((r, n, total) => console.log(provider, n + '/' + total, r.passed ? 'PASS' : 'FAIL', r.case.id, r.notes ?? ''), { provider, fallback: null });
    runs.push(report);
    console.log(JSON.stringify({ provider, passed: report.passed, total: report.totalCases, p95Ms: report.p95LatencyMs,
      reportedTokens: report.results.reduce((sum, r) => sum + (r.generation?.usage?.totalTokens ?? 0), 0) }));
  }
  const comparison = { measuredAt: new Date().toISOString(), environment: 'Development machine; warm Moss retrieval; Groq then HiDevs; fallback disabled.',
    scope: 'One run of the same public development suite per provider. Results do not establish general model superiority. Usage includes completed candidates only; check the HiDevs wallet for billed consumption.', runs };
  await mkdir('public/submission', { recursive: true });
  await writeFile('public/submission/provider-comparison.json', JSON.stringify(comparison, null, 2));
  process.exit(0);
}
void main().catch(() => { console.error('Provider comparison could not complete. No complete report was written.'); process.exit(1); });
