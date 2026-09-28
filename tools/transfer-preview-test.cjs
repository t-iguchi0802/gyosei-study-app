const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({headless:true});try{
 const c=await b.newContext({viewport:{width:390,height:844}});await c.route('https://**/*',r=>r.abort());const p=await c.newPage();
 await p.goto(process.env.APP_URL||'http://127.0.0.1:8771/');assert(await p.evaluate(()=>window.GYOSEI_LOCAL_PREVIEW===true));assert(await p.getByRole('button',{name:'Googleでログインして同期',exact:true}).isDisabled());
 await p.screenshot({path:path.join(__dirname,'transfer-home-mobile.png'),fullPage:false});
 await p.getByRole('button',{name:'科目別ミニ参考書',exact:true}).click();await p.getByRole('searchbox',{name:'教材を検索',exact:true}).fill('不当利得');await p.getByRole('button',{name:'この章を読む',exact:true}).click();
 await p.screenshot({path:path.join(__dirname,'transfer-guide-mobile.png'),fullPage:false});
 await p.getByRole('button',{name:'この論点の確認問題へ',exact:true}).click();await p.getByRole('heading',{name:'確認 T09',exact:true}).waitFor();
 const value=await p.evaluate(()=>JSON.parse(localStorage.getItem('gyosei2026_transfer_v1:guest')));assert(Object.values(value.events).some(e=>e.kind==='read'&&e.lesson==='civil-unjust'));
 console.log('PASS: preview cloud disabled, 390px home/guide screenshots, guide-to-question link and exposure recording');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
