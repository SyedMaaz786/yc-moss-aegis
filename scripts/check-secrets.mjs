import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { parse } from 'dotenv';
const env = existsSync('.env.local') ? parse(readFileSync('.env.local')) : {};
const secrets = Object.entries(env).filter(([k])=>/(?:KEY|TOKEN|SECRET)$/.test(k)).map(([,v])=>v).filter(v=>v&&v.length>12);
const files = [...new Set(execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{encoding:'utf8'}).split('\0').filter(Boolean))];
const findings=[];
for(const file of files) {
 if(!existsSync(file)||!statSync(file).isFile()||/\.(onnx|png|pdf|mp4|ico|wav|webm)$/i.test(file)) continue;
 const content=readFileSync(file,'utf8');
 if(secrets.some(secret=>content.includes(secret)) || /\b(?:sk-[A-Za-z0-9_-]{32,}|gsk_[A-Za-z0-9]{25,}|gh[pousr]_[A-Za-z0-9]{30,})\b/.test(content)) findings.push(file);
}
if(findings.length) { console.error('Potential credential material in:',findings.join(', ')); process.exit(1); }
console.log('Checked '+files.length+' publishable paths: no configured provider keys or recognized access tokens found.');
