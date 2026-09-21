import { config } from 'dotenv';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
config({ path: '.env.local', quiet: true });
async function main() {
  const { runAgentTurn } = await import('../src/lib/agent');
  const originalFetch = globalThis.fetch;
  // Local test harness only: inject a primary HTTP 503, then call real HiDevs.
  globalThis.fetch = (input, init) => String(input) === 'https://api.groq.com/openai/v1/chat/completions'
    ? Promise.resolve(new Response('', { status: 503 })) : originalFetch(input, init);
  try {
    const trace = await runAgentTurn('What is the daily Zelle transfer limit?', 'live', { provider: 'groq', fallback: 'hidevs' });
    trace.simulation = 'primary-provider-outage (local test harness; real HiDevs fallback)';
    assert.equal(trace.outcome, 'answered');
    assert.equal(trace.generation?.provider, 'hidevs');
    assert.equal(trace.generation?.fallbackUsed, true);
    assert.equal(trace.generation?.attempts[0].errorCode, 'http_503');
    assert.equal(trace.sourceIntegrity, true);
    assert.equal(trace.groundingVerdict, 'grounded');
    await writeFile('artifacts/failover.json', JSON.stringify(trace, null, 2));
    console.log(JSON.stringify({ outcome: trace.outcome, provider: trace.generation.provider, fallbackUsed: true, totalMs: trace.totalMs, reportedTokens: trace.generation.usage?.totalTokens }));
  } finally { globalThis.fetch = originalFetch; }
  process.exit(0);
}
void main().catch(() => { console.error('Failover verification failed; no passing report was written.'); process.exit(1); });
