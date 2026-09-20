const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Generation backend: Groq (OpenAI-compatible chat completions API), chosen
 * for a genuinely free tier and very high tokens/sec — a natural fit
 * alongside Moss's sub-10ms retrieval for a "zero latency" pipeline. Plain
 * fetch, no SDK dependency needed for a single-endpoint call.
 *
 * The default model is a reasoning model: it can spend its whole max_tokens
 * budget on the hidden `reasoning` field and return empty `content` if that
 * budget runs out mid-thought (finish_reason "length" with content: "").
 * `reasoning_effort: "low"` plus a generous max_tokens keeps that from
 * happening for these short, factual answers; treating empty content as a
 * failure (rather than silently returning "") lets the caller's existing
 * fallback handle it instead of showing a blank response.
 */
export async function generateAnswer(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Copy .env.example to .env.local and add a free key from https://console.groq.com."
    );
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      reasoning_effort: "low",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq generation failed: ${res.status} ${res.statusText} ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error(
      `Groq returned no content (finish_reason: ${data?.choices?.[0]?.finish_reason ?? "unknown"})`
    );
  }
  return text.trim();
}
