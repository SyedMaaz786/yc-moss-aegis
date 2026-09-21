import { config } from 'dotenv';
import { MossClient } from '@moss-dev/moss';
config({ path: '.env.local', quiet: true });
async function main() {
const client = new MossClient(process.env.MOSS_PROJECT_ID!, process.env.MOSS_PROJECT_KEY!);
const deadline = setTimeout(() => process.exit(2), 45000);
try {
  const indexes = await client.listIndexes();
  console.log('Indexes:', indexes.map(i => ({ name: i.name, count: i.docCount, status: i.status })));
  await client.loadIndex('aegis-knowledge-base');
  console.log('Load succeeded');
  for (const alpha of [0, 0.7]) {
    try {
      const result = await client.query('aegis-knowledge-base', 'disputed charge refund', { topK: 3, alpha });
      console.log('Query', alpha, JSON.stringify(result));
    } catch (e) { console.log('Query failed', alpha, e instanceof Error ? e.message : 'unknown'); }
  }
} catch (e) { console.log('Moss diagnostic:', e instanceof Error ? e.message : 'unknown'); }
finally { clearTimeout(deadline); await client.close(); }
}
void main();
