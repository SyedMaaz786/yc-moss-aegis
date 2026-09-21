import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const key = process.env.HIDEVS_API_KEY;
if (!key) throw new Error('Configure HIDEVS_API_KEY in .env.local.');
const base = 'https://llm.hidevs.xyz/v1';
const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
for (const model of ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash']) {
  const start = performance.now();
  try {
    const response = await fetch(base + '/chat/completions', {
      method: 'POST', headers, signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Reply with exactly READY.' }], max_tokens: 32, temperature: 0 }),
    });
    const data = await response.json().catch(() => null);
    console.log(JSON.stringify({ model, status: response.status, ms: Math.round(performance.now() - start),
      ready: data?.choices?.[0]?.message?.content?.trim() === 'READY',
      finishReason: data?.choices?.[0]?.finish_reason, totalTokens: data?.usage?.total_tokens }));
  } catch { console.log(JSON.stringify({ model, status: 'network-or-timeout', ms: Math.round(performance.now() - start) })); }
}
