import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
await page.setContent('<html><body style="margin:0;background:#080e14;color:#edf5f8;font-family:Arial;padding:65px;box-sizing:border-box;height:630px;border:1px solid #263945"><div style="color:#7de3c2;font-size:20px;letter-spacing:3px">AEGIS / THE RUNTIME TRUST LAYER</div><h1 style="font-size:80px;letter-spacing:-4px;line-height:1.05;margin:50px 0 30px">Trust every turn.<br><span style="color:#7de3c2">Prove every decision.</span></h1><p style="font-size:23px;color:#a8b8c5">Guardrails. Source integrity. Honest evaluations.</p><div style="margin-top:65px;border-top:1px solid #263945;padding-top:24px;font-size:16px;color:#a8b8c5">Built by SyedMaaz786 <span style="float:right">Powered by Moss · YC Builder Sprint</span></div></body></html>');
await page.screenshot({path:'public/submission/social.png'});
await browser.close();
