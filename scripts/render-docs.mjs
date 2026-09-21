import { chromium } from '@playwright/test';
import { marked } from 'marked';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
mkdirSync('public/submission', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
for (const name of ['PRD', 'THREAT_MODEL']) {
 const html = '<!doctype html><html><head><meta charset="utf-8"><title>Aegis '+name+'</title><style>body{font:11pt/1.6 Arial,sans-serif;color:#15262d;max-width:820px;margin:45px auto;padding:0 25px}h1{font-size:29pt;line-height:1.15;letter-spacing:-1px;border-bottom:4px solid #329777;padding-bottom:20px}h2{font-size:16pt;line-height:1.3;margin-top:28px;break-after:avoid}p,li{orphans:3;widows:3}table{border-collapse:collapse;width:100%;font-size:9pt}td,th{border:1px solid #cdd8dc;padding:8px;vertical-align:top;text-align:left}th{background:#eef6f2}tr{break-inside:avoid}code{font-size:9pt;background:#eef2f3}a{color:#26785e}blockquote{border-left:3px solid #329777;padding-left:15px;color:#526568}@page{size:A4;margin:15mm}img{max-width:100%}</style></head><body>'+marked.parse(readFileSync(name+'.md','utf8'))+'</body></html>';
 const output = 'public/submission/'+name+'.html';
 writeFileSync(output,html);
 await page.goto(pathToFileURL(resolve(output)).href);
 await page.pdf({ path:'public/submission/'+name+'.pdf', format:'A4', printBackground:true, displayHeaderFooter:true, headerTemplate:'<span></span>', footerTemplate:'<div style="font-size:8px;width:100%;padding:0 35px;color:#6b7e85">Aegis · SyedMaaz786<span style="float:right" class="pageNumber"></span></div>', margin:{top:'18mm',bottom:'20mm'} });
}
await page.setContent('<style>@page{size:landscape;margin:0}body{margin:0}</style>'+readFileSync('public/submission/architecture.svg','utf8'));
await page.pdf({ path:'public/submission/architecture.pdf', width:'1440px', height:'1050px', printBackground:true });
copyFileSync('artifacts/evaluation.json','public/submission/evaluation.json');
copyFileSync('artifacts/provider-comparison.json','public/submission/provider-comparison.json');
copyFileSync('artifacts/failover.json','public/submission/failover.json');
await browser.close();
console.log('PDFs and published evaluation prepared.');
