import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const chapters = JSON.parse(readFileSync('recordings/chapters.json','utf8'));
mkdirSync('recordings/.work', { recursive:true });
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({ viewport:{width:1440,height:1080}, deviceScaleFactor:1, recordVideo:{dir:'recordings/.work',size:{width:1440,height:1080}} });
const page = await context.newPage();
const timings = [];
const epoch = Date.now();
await page.goto('http://127.0.0.1:3000');
await page.getByRole('status').filter({hasText:'MOSS ONLINE'}).waitFor({timeout:60000});
async function hold(index, action) {
 const start = (Date.now()-epoch)/1000;
 if (action) await action();
 const elapsed = (Date.now()-epoch)/1000 - start;
 await page.waitForTimeout(Math.max(500, (chapters[index].duration-elapsed)*1000));
 timings.push({index,start,end:(Date.now()-epoch)/1000});
 console.log('Recorded chapter',index+1);
}
async function run(name, outcome) {
 const response = page.waitForResponse(r=>r.url().endsWith('/api/chat')&&r.request().method()==='POST');
 await page.getByRole('button',{name}).click();
 const data = await (await response).json();
 if(data.trace?.outcome!==outcome) throw new Error('Unexpected scenario outcome: '+JSON.stringify(data));
 await page.getByText('Inspecting this turn…').waitFor({state:'hidden'});
 await page.evaluate(()=>window.scrollTo({top:450,behavior:'smooth'}));
}
await hold(0);
await hold(1,async()=>{
 await run(/Daily transfer limits/,'answered');
 await page.waitForTimeout(4500);
 await page.getByRole('tab',{name:/sources/i}).click();
});
await hold(2,()=>run(/Prompt injection/,'input_blocked'));
await hold(3,()=>run(/Poisoned context/,'context_blocked'));
await hold(4,()=>run(/Invented policy/,'output_blocked'));
await hold(5,()=>run(/Retrieval outage/,'unavailable'));
await hold(6,async()=>{
 await page.goto('http://127.0.0.1:3000/eval');
 await page.getByRole('button',{name:'Run evaluation suite'}).click();
 await page.getByText('32/32',{exact:true}).waitFor({timeout:100000});
 await page.waitForTimeout(2500);
 await page.evaluate(()=>window.scrollTo({top:470,behavior:'smooth'}));
});
await hold(7,async()=>{
 await page.goto('http://127.0.0.1:3000/evidence');
 await page.waitForTimeout(4000);
 await page.evaluate(()=>window.scrollTo({top:780,behavior:'smooth'}));
});
const video = page.video();
await context.close();
const path = await video.path();
writeFileSync('recordings/.work/capture.json',JSON.stringify({path,timings},null,2));
await browser.close();
console.log('Capture saved:',path);
