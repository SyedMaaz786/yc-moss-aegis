import { writeFile } from 'node:fs/promises';
const url = 'https://www.apache.org/licenses/LICENSE-2.0.txt';
const response = await fetch(url);
if (!response.ok) throw new Error('License download failed: ' + response.status);
const license = await response.text();
if (!license.includes('Apache License')) throw new Error('Unexpected license response');
await writeFile('models/all-MiniLM-L6-v2/LICENSE.txt', license);
console.log('Model license saved.');
