import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:390,height:844}});
await page.goto('http://127.0.0.1:3000', { waitUntil:'networkidle' });
console.log(await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,15).map(e=>({tag:e.tagName,class:e.className,text:e.textContent?.slice(0,80),right:e.getBoundingClientRect().right}))})));
await page.screenshot({path:'artifacts/mobile-inspect.png',fullPage:true});
console.log('Health:',await page.request.get('http://127.0.0.1:3000/api/system/health').then(r=>r.json()));
await browser.close();
