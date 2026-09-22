/**
 * Seeds the two indexes used by the optional Moss cloud retrieval mode:
 *   - aegis-knowledge-base   Northbridge Bank policy docs the agent retrieves from
 *   - aegis-threat-patterns  example jailbreak/injection/PII-exfil phrasings the guardrail matches against
 *
 * Run with: npm run seed
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import { MossClient, type DocumentInfo } from "@moss-dev/moss";

const envLocal = resolve(process.cwd(), ".env.local");
config({ path: existsSync(envLocal) ? envLocal : resolve(process.cwd(), ".env") });

import knowledgeBase from "../data/knowledge-base.json";
import threatPatterns from "../data/threat-patterns.json";

const INDEXES = {
  knowledge: "aegis-knowledge-base",
  threats: "aegis-threat-patterns",
} as const;

async function upsertIndex(client: MossClient, indexName: string, docs: DocumentInfo[]) {
  const existing = await client.listIndexes();
  const already = existing.find((i) => i.name === indexName);

  if (already) {
    console.log(`  ~ ${indexName} already exists (${already.docCount} docs) — upserting ${docs.length} docs`);
    await client.addDocs(indexName, docs, { upsert: true });
  } else {
    console.log(`  + creating ${indexName} with ${docs.length} docs`);
    await client.createIndex(indexName, docs, {
      onProgress: (p) => process.stdout.write(`    ${indexName}: ${p.status} ${p.progress}%\r`),
    });
    console.log("");
  }
}

async function main() {
  const projectId = process.env.MOSS_PROJECT_ID;
  const projectKey = process.env.MOSS_PROJECT_KEY;
  if (!projectId || !projectKey) {
    console.error("Missing MOSS_PROJECT_ID / MOSS_PROJECT_KEY.");
    console.error("Copy .env.example to .env.local, add your Moss credentials, then re-run: npm run seed");
    process.exit(1);
  }

  const client = new MossClient(projectId, projectKey);

  console.log("Seeding Moss indexes for Aegis...\n");

  await upsertIndex(client, INDEXES.knowledge, knowledgeBase as DocumentInfo[]);

  const threatDocs: DocumentInfo[] = (threatPatterns as { id: string; text: string; metadata: Record<string, string> }[]).map(
    (d) => ({ id: d.id, text: d.text, metadata: d.metadata })
  );
  await upsertIndex(client, INDEXES.threats, threatDocs);

  console.log("\nDone. Indexes ready:");
  for (const name of Object.values(INDEXES)) {
    const info = await client.getIndex(name);
    console.log(`  - ${name}: ${info.docCount} docs, status=${info.status}`);
  }
  console.log("\nStart the app with: npm run dev");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
