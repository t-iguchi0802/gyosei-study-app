"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{chromium}=require('playwright');
const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','legal-basis-data.js'),'utf8'),c);
(async()=>{const browser=await chromium.launch({headless:true});try{
  const page=await browser.newPage();let count=0;
  for(const law of Object.values(c.window.GYOSEI_LEGAL_TEXT.laws)){
    const articles=Object.values(law.articles),first=articles[0];
    await page.goto(law.url,{waitUntil:'domcontentloaded'});await page.locator('[id^="Mp-"][id*="-At_"]').first().waitFor({state:'attached',timeout:15000});
    const missing=await page.evaluate(anchors=>anchors.filter(id=>!document.getElementById(id)),articles.map(a=>a.anchor));
    if(missing.length)console.log(JSON.stringify(await page.locator('[id]').evaluateAll(xs=>xs.map(n=>n.id).filter(x=>/-At_(20|145|166)$/.test(x)))));
    assert.deepEqual(missing,[],`${law.title}: missing actual e-Gov anchors`);count+=articles.length;
    console.log(`${law.title}: ${articles.length} actual article anchors OK`);
  }
  // Clicking through an app-generated direct URL must show the target inside the viewport.
  for(const [key,num] of [['constitution','31'],['procedure','5'],['litigation','37_2'],['civil','166']]){
    const law=c.window.GYOSEI_LEGAL_TEXT.laws[key],article=law.articles[num];
    await page.goto(`${law.url}#${article.anchor}`);await page.locator(`[id="${article.anchor}"]`).waitFor();
    const position=await page.evaluate(id=>{const n=document.getElementById(id);return {text:n.innerText,top:n.getBoundingClientRect().top,viewport:innerHeight};},article.anchor);
    assert(position.text.includes(article.title));assert(position.top>=0&&position.top<position.viewport,`${key} ${num} not in viewport`);
  }
  console.log(`PASS: ${count} actual anchors across 20 dated e-Gov pages; Constitution 31, Procedure 5, Litigation 37-2 and Civil 166 direct navigation`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
