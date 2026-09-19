import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

let client: Anthropic | undefined;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your Anthropic API key."
    );
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export async function generateAnswer(systemPrompt: string, userMessage: string): Promise<string> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text.trim() : "";
}
