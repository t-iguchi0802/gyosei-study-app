"use strict";
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');const base=process.env.APP_URL||'http://127.0.0.1:8771/';
const key='gyosei2026_transfer_v1:guest';
async function saved(p){return p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);}
async function legacy(p){return p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>!k.startsWith('gyosei2026_transfer_')))));}
async function layout(p,label){const v=await p.evaluate(()=>[innerWidth,document.documentElement.scrollWidth]);assert(v[1]<=v[0],`${label}: ${v}`);}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}});await ctx.route('https://**/*',r=>r.abort());const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(base);
 const prior=await legacy(p);await p.getByRole('button',{name:'実力確認を始める',exact:true}).click();
 const questions=await p.evaluate(()=>window.GYOSEI_TRANSFER_DATA.questions);
 const submit=()=>p.getByRole('button',{name:'回答を確定して解説を見る',exact:true});
 assert(await submit().isDisabled());assert.equal(await p.locator('.transfer-explanation').count(),0);
 await p.locator('input[name="transfer-answer"][value="1"]').check();await p.getByRole('radio',{name:'自信あり',exact:true}).check();
 await p.reload();await p.getByRole('button',{name:'確認の続き：T01',exact:true}).click();assert(await p.locator('input[name="transfer-answer"][value="1"]').isChecked());assert(await p.getByRole('radio',{name:'自信あり',exact:true}).isChecked());await submit().click();
 assert.equal(await p.locator('.transfer-reason').count(),5);assert(await p.getByText('自信があった誤答です。',{exact:false}).count());
 await p.getByRole('button',{name:'この論点を参考書で復習',exact:true}).click();await p.getByRole('button',{name:'問題へ戻る',exact:true}).click();assert.equal(await p.locator('.transfer-explanation').count(),1);
 await p.getByRole('button',{name:'基本の問11と解説を読む（履歴は変更しない）',exact:true}).click();await p.getByRole('button',{name:'確認問題の解説へ戻る',exact:true}).first().click();assert.equal(await legacy(p),prior);
 await p.getByRole('button',{name:'次の確認問題へ',exact:true}).click();
 for(const q of questions.slice(1)){
   await p.getByRole('heading',{name:`確認 ${q.id}`,exact:true}).waitFor();assert.equal(await p.locator('.transfer-explanation').count(),0);
   if(q.type==='single')await p.locator(`input[name="transfer-answer"][value="${q.answer}"]`).check();
   else if(q.type==='multi'){
     for(const k of q.blanks)await p.getByRole('combobox',{name:`空欄${k}`,exact:true}).selectOption('1');
     await p.getByRole('radio',{name:'自信あり',exact:true}).check();assert(await submit().isDisabled());
     for(const k of q.blanks)await p.getByRole('combobox',{name:`空欄${k}`,exact:true}).selectOption(String(q.answer[k]));
   }else await p.getByRole('textbox',{name:'記述答案',exact:true}).fill(q.answer);
   await p.getByRole('radio',{name:'自信あり',exact:true}).check();assert(!await submit().isDisabled());await layout(p,q.id);await submit().click();
   assert.equal(await p.locator('.transfer-explanation').count(),1);
   if(q.type==='multi')assert.equal(await p.locator('.transfer-reason').count(),20);
   if(q.type==='written'&&q.id!=='T21'){await p.getByRole('spinbutton',{name:'確認記述の自己採点',exact:true}).fill('14');await p.getByRole('button',{name:'自己採点を保存',exact:true}).click();}
   if(q.id==='T19')await p.screenshot({path:path.join(__dirname,'transfer-multi-mobile.png'),fullPage:false});
   await layout(p,q.id+' explanation');await p.getByRole('button',{name:'次の確認問題へ',exact:true}).click();
 }
 await p.getByRole('heading',{name:'このセットは完了しました',exact:true}).waitFor();const all=await saved(p);assert.equal(Object.values(all.events).filter(e=>e.kind==='attempt').length,24);assert.equal(await legacy(p),prior);
 await p.getByRole('button',{name:'結果・弱点を見る',exact:true}).click();const first=p.locator('.reference-card').filter({has:p.getByRole('heading',{name:'T01 行政法・誤り選択',exact:true})});await first.getByRole('button',{name:'再挑戦する',exact:true}).click();
 await p.locator('input[name="transfer-answer"][value="3"]').check();await p.getByRole('radio',{name:'自信あり',exact:true}).check();await submit().click();assert.equal(Object.values((await saved(p)).events).filter(e=>e.kind==='attempt').length,25);
 await p.getByRole('button',{name:'結果・弱点の一覧',exact:true}).click();
 const pendingBefore=JSON.stringify((await saved(p)).session);
 await p.locator('.reference-card').filter({has:p.getByRole('heading',{name:'T21 行政法・記述式',exact:true})}).getByRole('button',{name:'答案を採点・解説確認',exact:true}).click();
 await p.getByRole('spinbutton',{name:'確認記述の自己採点',exact:true}).fill('20');await p.getByRole('button',{name:'自己採点を保存',exact:true}).click();
 await p.getByRole('button',{name:'この論点を参考書で復習',exact:true}).click();await p.getByRole('button',{name:'問題へ戻る',exact:true}).click();await p.getByRole('heading',{name:'保存した回答 T21',exact:true}).waitFor();
 await p.getByRole('button',{name:'確認問題の一覧に戻る',exact:true}).click();assert.equal(JSON.stringify((await saved(p)).session),pendingBefore,'history viewing must preserve unfinished session');
 await p.getByRole('combobox',{name:'確認問題の科目',exact:true}).selectOption('民法');assert.equal(await p.locator('.reference-card').filter({has:p.locator('h3')}).count(),11);
 await p.getByRole('combobox',{name:'確認問題の科目',exact:true}).selectOption('');await p.setViewportSize({width:1280,height:900});await layout(p,'desktop');await p.screenshot({path:path.join(__dirname,'transfer-results-desktop.png'),fullPage:true});
 // Owner partition: guest history is retained; switching identities does not copy it.
 await p.evaluate(()=>window.GYOSEI_TRANSFER.setUser({uid:'test-a'},null));assert.equal((await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('gyosei2026_transfer_v1:guest')).events))).length,Object.keys((await saved(p)).events).length);
 assert.equal(await p.getByText('未回答',{exact:true}).count(),24);await p.evaluate(()=>window.GYOSEI_TRANSFER.setUser(null,null));assert.equal(Object.values((await saved(p)).events).filter(e=>e.kind==='attempt').length,25);
 // Storage failures do not overwrite existing data or pretend an answer was saved.
 const beforeFailure=JSON.stringify(await saved(p));await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('test quota','QuotaExceededError');};});
 await p.getByRole('button',{name:'全問を選び直す 24問',exact:true}).click();assert.equal(JSON.stringify(await saved(p)),beforeFailure);assert(await p.getByText('端末への保存に失敗しました。',{exact:false}).count());
 assert.deepEqual(errors,[]);console.log('PASS: all 24, pre-confidence, reload resume, 25 append attempts, 40 multi reasons, written grades, guide/basic return, no legacy writes, owner isolation, 390/1280 layout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
