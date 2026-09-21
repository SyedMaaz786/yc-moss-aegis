import type { GenerationEvidence, GenerationProvider, GenerationAttempt } from './types';

export type GenerationOptions = { provider?: GenerationProvider; fallback?: GenerationProvider | null };
type ProviderConfig = { provider: GenerationProvider; model: string; key?: string; url: string };
function providerConfig(provider: GenerationProvider): ProviderConfig {
  if (provider === 'groq') return {
    provider, model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b', key: process.env.GROQ_API_KEY,
    url: 'https://api.groq.com/openai/v1/chat/completions',
  };
  if (provider === 'hidevs') return {
    provider, model: process.env.HIDEVS_MODEL || 'gemini-3.5-flash-lite', key: process.env.HIDEVS_API_KEY,
    url: 'https://llm.hidevs.xyz/v1/chat/completions',
  };
  throw new Error('Unsupported generation provider.');
}
function configuredProviders(options: GenerationOptions) {
  const primary = options.provider ?? process.env.LLM_PROVIDER ?? 'groq';
  const fallback = options.fallback !== undefined ? options.fallback : process.env.LLM_FALLBACK_PROVIDER;
  const providers = [providerConfig(primary as GenerationProvider)];
  if (fallback && fallback !== 'none' && fallback !== primary) providers.push(providerConfig(fallback as GenerationProvider));
  return providers;
}
// Public configuration contains identities and presence checks, never credentials.
export function getGenerationSettings(options: GenerationOptions = {}) {
  const providers = configuredProviders(options);
  return { configured: providers.some(p => Boolean(p.key)), providers: providers.map(p => ({ provider: p.provider, model: p.model, configured: Boolean(p.key) })) };
}
export class GenerationUnavailableError extends Error {
  constructor(readonly attempts: GenerationAttempt[]) { super('Configured generation providers could not return a complete answer.'); }
}
function tokenCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}
export async function generateCandidate(systemPrompt: string, userMessage: string, options: GenerationOptions = {}): Promise<{ text: string; evidence: GenerationEvidence }> {
  const providers = configuredProviders(options);
  const attempts: GenerationAttempt[] = [];
  for (const config of providers) {
    const started = performance.now();
    let errorCode = 'network_error';
    try {
      if (!config.key) { errorCode = 'not_configured'; throw new Error(); }
      const response = await fetch(config.url, {
        // Two providers share a bounded 10-second generation budget.
        signal: AbortSignal.timeout(Math.floor(10000 / providers.length)),
        method: 'POST', redirect: 'error',
        headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model, max_tokens: 600, temperature: 0,
          ...(config.provider === 'groq' && config.model.includes('gpt-oss') ? { reasoning_effort: 'low' } : {}),
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
        }),
      });
      if (!response.ok) { errorCode = 'http_' + response.status; await response.body?.cancel(); throw new Error(); }
      errorCode = 'invalid_response';
      const data = await response.json();
      const choice = data?.choices?.[0];
      if (choice?.finish_reason !== 'stop') { errorCode = 'incomplete_answer'; throw new Error(); }
      const text = choice?.message?.content;
      if (typeof text !== 'string' || !text.trim() || text.length > 12000) throw new Error();
      attempts.push({ provider: config.provider, model: config.model, status: 'success', ms: performance.now() - started });
      return { text: text.trim(), evidence: {
        provider: config.provider, model: config.model, fallbackUsed: attempts.length > 1, attempts,
        usage: { promptTokens: tokenCount(data?.usage?.prompt_tokens), completionTokens: tokenCount(data?.usage?.completion_tokens), totalTokens: tokenCount(data?.usage?.total_tokens) },
      } };
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) errorCode = 'timeout';
      attempts.push({ provider: config.provider, model: config.model, status: 'failed', ms: performance.now() - started, errorCode });
    }
  }
  throw new GenerationUnavailableError(attempts);
}
