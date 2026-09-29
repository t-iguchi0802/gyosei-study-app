"use strict";
const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
const base=process.env.APP_URL||'http://127.0.0.1:8771/';
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const c=await browser.newContext({viewport:{width:390,height:844}});
    // Local checks are isolated from production auth and all cloud traffic.
    if(!base.startsWith('https:'))await c.route('https://**/*',r=>r.abort());
    const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base);
    const layout=async()=>assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await p.getByRole('button',{name:/続きから学習する/}).click();
    assert.deepEqual(await p.locator('.choices input').evaluateAll(xs=>xs.map(x=>Number(x.value))),[1,2,3,4,5]);
    assert.equal(await p.locator('.legal-basis').count(),0);
    await p.locator('input[name="answer"][value="2"]').check();
    await p.getByRole('button',{name:'自信あり',exact:true}).click();
    await p.getByRole('button',{name:'回答を確定して解説を見る',exact:true}).click();
    assert(await p.locator('.legal-basis').getByText(/何人も、法律の定める手続/).count());
    assert.equal(await p.locator('.basis-article a').first().getAttribute('href'),'https://laws.e-gov.go.jp/law/321CONSTITUTION?occasion_date=20260401#Mp-Ch_3-At_31');
    assert.equal(await p.locator('.basis-links a[href*="laws.e-gov.go.jp/law"]').count(),0);
    await layout();await p.screenshot({path:path.join(__dirname,'legal-basis-mobile.png'),fullPage:false});
    // T01 ordering, draft and saved answer survive a formerly shuffled order.
    await p.goto(base);await p.getByRole('button',{name:'実力確認を始める',exact:true}).click();
    await p.locator('input[name="transfer-answer"][value="3"]').check();
    await p.getByRole('radio',{name:'迷った',exact:true}).check();
    await p.evaluate(()=>{const k='gyosei2026_transfer_v1:guest',s=JSON.parse(localStorage.getItem(k));s.session.order=[5,1,4,2,3];localStorage.setItem(k,JSON.stringify(s));});
    await p.reload();await p.getByRole('button',{name:'確認の続き：T01',exact:true}).click();
    assert.deepEqual(await p.locator('input[name="transfer-answer"]').evaluateAll(xs=>xs.map(x=>Number(x.value))),[1,2,3,4,5]);
    assert(await p.locator('input[name="transfer-answer"][value="3"]').isChecked());assert.equal(await p.locator('.legal-basis').count(),0);
    await p.getByRole('button',{name:'回答を確定して解説を見る',exact:true}).click();
    const text=await p.locator('.legal-basis').innerText();assert.match(text,/審査基準を定めるものとする/);assert.match(text,/公にしておかなければならない/);
    assert.equal(await p.locator('.basis-article a').first().getAttribute('href'),'https://laws.e-gov.go.jp/law/405AC0000000088/20240926_506AC0000000065?occasion_date=20260401#Mp-Ch_2-At_5');
    assert.deepEqual(await p.locator('.transfer-reason h3').evaluateAll(xs=>xs.map(x=>Number(x.textContent.trim()[0]))),[1,2,3,4,5]);
    await layout();await p.locator('.legal-basis').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(__dirname,'legal-basis-transfer-mobile.png')});
    // All 84 explanations render without missing text; case paragraphs are visibly separated.
    const coverage=await p.evaluate(()=>{
      const b=window.GYOSEI_LEGAL_BASIS,questions=window.EXAM_DATA.questions;
      return {exam:questions.map(q=>({id:q.id,text:b.render(q).textContent,articles:b.render(q).querySelectorAll('.basis-article').length})),transfer:window.GYOSEI_TRANSFER_DATA.questions.map(q=>({id:q.id,text:b.render(q,'transfer').textContent})),caseText:b.render(questions.find(q=>q.id===3)).querySelector('.basis-precedent').textContent};
    });
    assert.equal(coverage.exam.length,60);assert.equal(coverage.transfer.length,24);assert(coverage.exam.every(x=>x.text.length>30));assert(coverage.transfer.every(x=>x.text.includes('第')));assert.match(coverage.caseText,/事案/);assert.match(coverage.caseText,/争点/);assert.match(coverage.caseText,/判断/);
    await p.setViewportSize({width:1280,height:900});await layout();assert.deepEqual(errors,[]);
    console.log('PASS: fixed 1-5 order, preserved shuffled draft answer, no pre-answer basis leak, visible law contents, 84 explanation renders, concrete precedent structure, 390/1280 layout');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
