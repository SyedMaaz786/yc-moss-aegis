import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
async function main() {
  const { mossQuery, INDEXES } = await import('../src/lib/moss');
  const { runAgentTurn } = await import('../src/lib/agent');
  for (const query of ['disputed charge refund', 'daily Zelle transfer limit']) {
    const result = await mossQuery(INDEXES.knowledge, query);
    console.log(JSON.stringify({ query, mode: result.mode, embeddingMs: result.embeddingMs, searchMs: result.searchMs, docs: result.docs.map(d => ({id:d.id, score:d.score})) }));
  }
  for (const scenario of ['live', 'poisoned-context', 'fabricated-answer', 'outage'] as const) {
    const trace = await runAgentTurn('What is the daily Zelle transfer limit?', scenario);
    console.log(JSON.stringify(trace));
  }
  process.exit(0);
}
void main().catch(e => { console.error(e instanceof Error ? e.message : 'Smoke failed'); process.exit(1); });
