"use strict";
// Two isolated browsers + an in-memory Firestore-compatible transport. No production access.
const assert=require('node:assert/strict');const {chromium}=require('playwright');
const base=process.env.APP_URL||'http://127.0.0.1:8771/';
const docs=new Map(),subscriptions=[];
async function deliver(sub){
  if(sub.page.isClosed())return;
  const value=sub.collection?{collection:true,docs:[...docs].filter(([p])=>p.startsWith(sub.path+'/')).map(([p,data])=>({id:p.split('/').at(-1),data}))}:{collection:false,exists:docs.has(sub.path),data:docs.get(sub.path)||null};
  await sub.page.evaluate(({id,value})=>window.testListeners[id]?.(value),{id:sub.id,value});
}
async function until(fn,label){for(let i=0;i<100;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw new Error(`Timeout: ${label}`);}
async function setup(browser,uid){
  const ctx=await browser.newContext({viewport:{width:390,height:844}});await ctx.route('https://**/*',r=>r.abort());const page=await ctx.newPage();
  await page.exposeBinding('testSubscribe',async({page},id,path,collection)=>{const s={page,id,path,collection};subscriptions.push(s);await deliver(s);});
  await page.exposeBinding('testCommit',async(_,entries)=>{
    for(const [path,data] of entries){assert(/^users\/qa-[ab]\/apps\/gyosei2026Mock1\/transfer(Events|State)\//.test(path),path);docs.set(path,data);}
    await Promise.all(subscriptions.map(deliver));
  });
  await page.exposeBinding('testRead',async(_,path)=>docs.has(path)?docs.get(path):null);
  await page.goto(base);
  await page.evaluate(uid=>{
    let sequence=0;window.testListeners={};window.testOffline=false;
    function ref(path,collection=false){return {
      path,collection:name=>ref(`${path}/${name}`,true),doc:name=>ref(`${path}/${name}`),
      onSnapshot(options,cb,error){const id=++sequence;window.testListeners[id]=value=>{
        const snap=value.collection?{metadata:{fromCache:false},forEach:fn=>value.docs.forEach(d=>fn({id:d.id,data:()=>d.data}))}:{exists:value.exists,metadata:{fromCache:false},data:()=>value.data};cb(snap);
      };window.testSubscribe(id,path,collection).catch(error);return()=>delete window.testListeners[id];}
    };}
    window.testDb={collection:name=>ref(name,true),batch:()=>{const entries=[];return {set:(r,v)=>entries.push([r.path,v]),commit:()=>window.testOffline?Promise.reject(new Error('test offline')):window.testCommit(entries)};},runTransaction:async fn=>{
      if(window.testOffline)throw new Error('test offline');const entries=[];
      const result=await fn({get:async r=>{const data=await window.testRead(r.path);return {exists:!!data,data:()=>data};},set:(r,v)=>entries.push([r.path,v])});
      if(entries.length)await window.testCommit(entries);return result;
    }};
    window.GYOSEI_TRANSFER.setUser({uid},window.testDb);
  },uid);return page;
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const a=await setup(browser,'qa-a');await a.getByRole('button',{name:'実力確認を始める',exact:true}).click();await a.locator('input[name="transfer-answer"][value="3"]').check();await a.getByRole('radio',{name:'自信あり',exact:true}).check();
 const cursor='users/qa-a/apps/gyosei2026Mock1/transferState/current';
 await until(()=>docs.get(cursor)?.session?.value===3&&docs.get(cursor)?.session?.confidence==='confident','draft saved');
 const b=await setup(browser,'qa-a');await until(()=>b.getByRole('button',{name:'確認の続き：T01',exact:true}).count(),'second device cursor');await b.getByRole('button',{name:'確認の続き：T01',exact:true}).click();assert(await b.locator('input[name="transfer-answer"][value="3"]').isChecked());assert(await b.getByRole('radio',{name:'自信あり',exact:true}).isChecked());
 await b.getByRole('button',{name:'回答を確定して解説を見る',exact:true}).click();await b.getByRole('button',{name:'次の確認問題へ',exact:true}).click();await until(()=>docs.get(cursor)?.session?.question?.id==='T02','second device advances');
 await a.getByRole('heading',{name:'確認 T02',exact:true}).waitFor();
 await b.evaluate(()=>{window.testOffline=true;});await b.locator('input[name="transfer-answer"][value="2"]').check();await b.getByRole('radio',{name:'迷った',exact:true}).check();await b.getByRole('button',{name:'回答を確定して解説を見る',exact:true}).click();await b.getByRole('button',{name:'次の確認問題へ',exact:true}).click();
 await until(()=>b.getByText(/test offline/).count(),'offline indicator');
 assert.equal([...docs.keys()].filter(p=>p.includes('/transferEvents/')).length,1);
 await b.evaluate(()=>{window.testOffline=false;window.dispatchEvent(new Event('online'));});await until(()=>docs.get(cursor)?.session?.question?.id==='T03','offline retry cursor');await until(()=>[...docs.keys()].filter(p=>p.includes('/transferEvents/')).length===2,'offline retry events');
 await a.getByRole('heading',{name:'確認 T03',exact:true}).waitFor();
 const different=await setup(browser,'qa-b');await different.getByRole('button',{name:'確認問題の一覧・弱点',exact:true}).click();assert.equal(await different.getByText('未回答',{exact:true}).count(),24);
 // Reload owner A in a third context: attempts union and resume must survive.
 const c=await setup(browser,'qa-a');await until(()=>c.getByRole('button',{name:'確認の続き：T03',exact:true}).count(),'third context resume');
 const events=await c.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('gyosei2026_transfer_v1:qa-a')).events));assert.equal(events.filter(e=>e.kind==='attempt').length,2);
 assert([...docs.keys()].every(k=>!k.includes('/mockExams/')));
 console.log('PASS: mocked Firestore two-device draft + confidence + next-position sync, offline append retry, no duplicates, UID isolation, no legacy cloud writes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
