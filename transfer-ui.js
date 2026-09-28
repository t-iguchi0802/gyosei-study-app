(function () {
  "use strict";
  const D=window.GYOSEI_TRANSFER_DATA, S=window.GYOSEI_TRANSFER_STORE;
  const byId=id=>D.questions.find(q=>q.id===id);
  let owner="guest", db=null, generation=0, unsubscribers=[], notify=()=>{}, store=S.blank(), storageError="", cloudMessage="端末内保存", timer=null, busy=false;
  let view="menu", guideId=null, basicId=null, historyId=null, returnView="question", category="", pageRender=null, chunkStart=null, activeKey=null, serverSeen={events:false,cursor:false};
  const uuid=()=>crypto.randomUUID();
  const node=(tag,css,text)=>{const n=document.createElement(tag);if(css)n.className=css;if(text!==undefined)n.textContent=text;return n;};
  const button=(text,css,fn)=>{const n=node("button",css,text);n.type="button";n.addEventListener("click",fn);return n;};
  function load() {
    storageError="";
    try {store=S.normalize(JSON.parse(localStorage.getItem(S.key(owner))||"null"));}
    catch(e){storageError=e.message;store=S.blank();}
  }
  load();
  function commit(next, redraw=false) {
    if(storageError) return false;
    try {localStorage.setItem(S.key(owner),JSON.stringify(next));store=next;}
    catch(e){storageError="端末への保存に失敗しました。回答確定を停止しました。空き容量・保存設定を確認してください。";notify();if(pageRender)pageRender();return false;}
    schedule(); if(redraw && pageRender) pageRender(); return true;
  }
  function cursor(next) {next.cursorAt=Math.max(Date.now(),next.cursorAt+1);next.cursorToken=uuid();next.cursorDirty=true;}
  function add(next,event) {next.events[event.id]=event;next.pending[event.id]=true;}
  function statusText(){return storageError||cloudMessage;}
  function updateStatus(){document.querySelectorAll(".transfer-status").forEach(n=>n.textContent=statusText());}
  function schedule(){clearTimeout(timer);if(db&&owner!=="guest"){cloudMessage="確認問題：同期待ち（端末には保存済み）";timer=setTimeout(flush,600);}updateStatus();}
  async function flush() {
    if(!db||owner==="guest"||busy||storageError) return;
    const token=generation, targetOwner=owner, snapshot=S.clone(store), ids=Object.keys(snapshot.pending).slice(0,300);
    if(!ids.length&&!snapshot.cursorDirty){cloudMessage=serverSeen.events&&serverSeen.cursor?"確認問題：クラウド同期済み":"確認問題：クラウドの応答を確認中";updateStatus();return;}
    busy=true;let succeeded=false;
    try {
      const base=db.collection("users").doc(targetOwner).collection("apps").doc("gyosei2026Mock1"), batch=db.batch();
      ids.forEach(id=>batch.set(base.collection("transferEvents").doc(id),snapshot.events[id]));
      if(ids.length)await batch.commit();
      let remoteCursor=null;
      if(snapshot.cursorDirty){
        const reference=base.collection("transferState").doc("current");
        remoteCursor=await db.runTransaction(async transaction=>{
          const current=await transaction.get(reference), remote=current.exists?current.data():S.blank();
          if(S.compare(remote,snapshot)>0)return remote;
          transaction.set(reference,{schema:1,events:{},session:snapshot.session,cursorAt:snapshot.cursorAt,cursorToken:snapshot.cursorToken});
          return null;
        });
      }
      if(token!==generation)return;
      const next=remoteCursor?S.merge(store,remoteCursor):S.clone(store);ids.forEach(id=>delete next.pending[id]);
      if(next.cursorToken===snapshot.cursorToken)next.cursorDirty=false;
      // Acknowledging cloud writes must not enqueue another write.
      const moved=next.cursorToken!==store.cursorToken;
      localStorage.setItem(S.key(owner),JSON.stringify(next));store=next;
      if(moved){chunkStart=null;activeKey=null;if(pageRender)pageRender();notify();}
      cloudMessage="確認問題：クラウド同期済み";
      succeeded=true;
    }catch(e){if(token===generation)cloudMessage=`確認問題：同期できません（端末保存は保持）。${e.message}`;}
    finally{if(token===generation){busy=false;updateStatus();if(succeeded&&(Object.keys(store.pending).length||store.cursorDirty))timer=setTimeout(flush,600);}}
  }
  function setUser(user, firestore) {
    const nextOwner=user?.uid||"guest";
    if(nextOwner===owner && db===firestore)return;
    pause();generation++;unsubscribers.forEach(fn=>fn());unsubscribers=[];clearTimeout(timer);busy=false;
    owner=nextOwner;db=firestore;view="menu";chunkStart=null;activeKey=null;load();serverSeen={events:false,cursor:false};
    cloudMessage=owner==="guest"?"確認問題：未ログイン・この端末だけに保存":"確認問題：クラウドを確認中";
    const token=generation;
    if(db&&owner!=="guest") {
      const base=db.collection("users").doc(owner).collection("apps").doc("gyosei2026Mock1");
      const error=e=>{if(token===generation){cloudMessage=`確認問題：同期できません。${e.message}`;updateStatus();}};
      unsubscribers.push(base.collection("transferEvents").onSnapshot({includeMetadataChanges:true},snapshot=>{
        if(token!==generation||storageError)return;
        const next=S.clone(store);
        snapshot.forEach(doc=>{const e=doc.data();if(e.id===doc.id&&!next.events[e.id])next.events[e.id]=e;});
        try {localStorage.setItem(S.key(owner),JSON.stringify(next));store=next;}catch(e){storageError="同期履歴を端末に保存できません。";}
        serverSeen.events=!snapshot.metadata.fromCache;
        if(view==="menu")notify(); flush();
      },error));
      unsubscribers.push(base.collection("transferState").doc("current").onSnapshot({includeMetadataChanges:true},snapshot=>{
        if(token!==generation||storageError)return;
        serverSeen.cursor=!snapshot.metadata.fromCache;
        try {
          const remote=snapshot.exists?snapshot.data():null;
          if(remote && S.compare(remote,store)>0) {
            store=S.merge(store,remote);localStorage.setItem(S.key(owner),JSON.stringify(store));
            chunkStart=null;activeKey=null;
            if(pageRender)pageRender();notify();
          }
          flush();
        }catch(e){error(e);}
      },error));
      schedule();
    }
    notify();
  }
  function pause() {
    if(chunkStart!==null && store.session && !store.session.attemptId){
      const next=S.clone(store);next.session.activeMs=(next.session.activeMs||0)+Math.max(0,performance.now()-chunkStart);cursor(next);chunkStart=null;commit(next);
    }
    chunkStart=null;
  }
  function resumeClock() {if(view==="question"&&store.session&&!store.session.attemptId&&!document.hidden)chunkStart=performance.now();}
  document.addEventListener("visibilitychange",()=>{if(document.hidden)pause();else resumeClock();});
  window.addEventListener("pagehide",pause);
  window.addEventListener("online",flush);
  window.addEventListener("storage",event=>{if(event.key===S.key(owner)&&event.newValue){try{
    const incoming=S.normalize(JSON.parse(event.newValue)),next=S.merge(store,incoming);
    next.pending={...incoming.pending,...next.pending};
    if(S.compare(incoming,store)>0)next.cursorDirty=incoming.cursorDirty;
    const text=JSON.stringify(next);if(localStorage.getItem(S.key(owner))!==text)localStorage.setItem(S.key(owner),text);
    store=next;chunkStart=null;if(pageRender)pageRender();notify();schedule();
  }catch(e){storageError=e.message;updateStatus();}}});
  function change(fn,redraw=false){const next=S.clone(store);fn(next);cursor(next);return commit(next,redraw);}
  function prepare(next) {
    const s=next.session, q=byId(s.ids[s.index]);
    if(!q){s.done=true;return;}
    s.question=S.clone(q);s.attemptKey=uuid();s.attemptId=null;s.value=q.type==="multi"?{}:"";s.confidence="";s.known=false;s.activeMs=0;
    s.order=q.choices.map((_,i)=>i+1);
    if(q.type==="single") for(let i=s.order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s.order[i],s.order[j]]=[s.order[j],s.order[i]];}
  }
  function start(mode="new",ids=null) {
    pause();const queue=ids||S.queue(store,D.questions,mode,category);
    if(!queue.length)return;
    const next=S.clone(store);next.session={id:uuid(),ids:queue,index:0,mode,done:false};prepare(next);cursor(next);
    if(commit(next)){view="question";redraw();}
  }
  function redraw(){pause();if(pageRender)pageRender();window.scrollTo({top:0});}
  function answer() {
    pause();const next=S.clone(store),s=next.session,q=s.question;
    if(s.attemptId||!S.valid(q,s.value,s.confidence))return;
    const previous=S.attempts(next,q.id,q.version), readBefore=Object.values(next.events).some(e=>e.kind==="read"&&e.lesson===q.lesson);
    const event={id:s.attemptKey,kind:"attempt",at:Date.now(),question:S.clone(q),value:S.clone(s.value),confidence:s.confidence,
      known:s.known,guideReadBefore:readBefore,firstRecorded:previous.length===0,activeMs:Math.round(s.activeMs),order:s.order,...S.score(q,s.value)};
    add(next,event);s.attemptId=event.id;cursor(next);
    if(commit(next)){redraw();document.querySelector(".transfer-explanation")?.scrollIntoView({block:"start"});}
  }
  function nextQuestion(){pause();change(next=>{next.session.index++;prepare(next);});redraw();}
  function noteLesson(id){if(!id)return true;const next=S.clone(store);add(next,{id:uuid(),kind:"read",lesson:id,at:Date.now()});return commit(next);}
  function readLesson(id){pause();if(!noteLesson(id))return;if(view!=="guide")returnView=view;guideId=id;view="guide";redraw();}
  function importGuest(){
    if(owner==="guest"||!confirm("この端末の未ログイン時の確認問題履歴を、現在のGoogleアカウントへコピーします。元の端末履歴と既存60問の履歴は削除しません。よろしいですか？"))return;
    try{
      const guest=S.normalize(JSON.parse(localStorage.getItem(S.key("guest"))||"null")),next=S.clone(store);
      Object.values(guest.events).forEach(e=>{if(!next.events[e.id])add(next,e);});
      if(!next.session&&guest.session){next.session=guest.session;cursor(next);}commit(next);redraw();
    }catch(e){alert(e.message);}
  }
  function render(shell,options) {
    pageRender=()=>{shell.replaceChildren();draw(shell,options);};pageRender();
  }
  function draw(shell,options) {
    const page=node("section","transfer-view");shell.append(page);
    const header=node("header","transfer-header");
    header.append(button("ホームへ","ghost",()=>{pause();view="menu";pageRender=null;options.onHome();}),node("h1","","実力確認"));page.append(header);
    const status=node("p","transfer-status",statusText());status.setAttribute("role","status");page.append(status);
    if(storageError){page.append(node("p","reference-caution","既存データを保護するため、この機能の保存を停止しています。再読込前に端末の保存設定をご確認ください。"));return;}
    if(view==="guide"){
      window.GYOSEI_REFERENCE.render(page,{lessonId:guideId,fromQuestion:true,tab:"lessons",onBack:()=>{view=returnView;redraw();},onLesson:readLesson,onTab:()=>{view=returnView;redraw();}});return;
    }
    if(view==="basic"){
      page.append(button("確認問題の解説へ戻る","secondary",()=>{view=returnView;redraw();}));
      const q=window.EXAM_DATA.questions.find(q=>q.id===basicId);
      page.append(node("h2","",`基本に戻る：第1回 問${q.id}`),node("p","subtitle","読むだけの復習です。第1回の回答・進捗・成績は変更しません。"),node("p","transfer-prompt",q.prompt));
      q.choices.forEach(c=>page.append(node("p","",`${c.value}　${c.label}`)));
      Object.entries(q.sections).filter(([k])=>!['一次資料','予想重要度','法的正確性確認'].includes(k)).forEach(([k,v])=>page.append(node("h3","",k),node("p","transfer-prompt",v)));
      page.append(button("確認問題の解説へ戻る","secondary",()=>{view=returnView;redraw();}));return;
    }
    if(view==="history"){
      const attempt=store.events[historyId];
      if(!attempt){view="menu";menu(page);return;}
      page.append(node("h2","",`保存した回答 ${attempt.question.id}`),node("p","transfer-prompt",attempt.question.prompt));
      explanation(page,attempt.question,attempt,true);return;
    }
    if(view!=="question"||!store.session){menu(page);return;}
    const s=store.session;
    if(s.done){page.append(node("h2","","このセットは完了しました"),node("p","",`${s.ids.length}問を終了しました。記述の未採点は進捗一覧から採点できます。`),button("結果・弱点を見る","primary",()=>{view="menu";redraw();}));return;}
    const q=s.question, attempt=s.attemptId?store.events[s.attemptId]:null;
    page.append(node("p","eyebrow",`${q.category}・${q.format}｜${s.index+1}/${s.ids.length}問`));
    page.append(node("h2","",`確認 ${q.id}`));
    if(!attempt)page.append(node("p","subtitle","回答と自信度を確定するまで、正解・解説・関連教材は表示しません。"));
    page.append(node("p","transfer-prompt",q.prompt));
    if(attempt){explanation(page,q,attempt);return;}
    if(activeKey!==s.attemptKey){activeKey=s.attemptKey;chunkStart=null;}
    if(chunkStart===null)resumeClock();
    const inputs=node("fieldset","transfer-inputs");inputs.append(node("legend","",q.type==="written"?"答案（40字程度）":"回答を選択"));
    let submit;
    const refresh=()=>{submit.disabled=!S.valid(q,store.session.value,store.session.confidence);};
    if(q.type==="single")s.order.forEach((id,index)=>{
      const label=node("label","transfer-choice"),input=node("input");input.type="radio";input.name="transfer-answer";input.value=id;input.checked=Number(s.value)===id;
      input.addEventListener("change",()=>{change(n=>{n.session.value=id;});refresh();});label.append(input,node("span","",`${index+1}　${q.choices[id-1]}`));inputs.append(label);
    });
    else if(q.type==="multi")q.blanks.forEach(k=>{
      const label=node("label","transfer-multi",`空欄${k}`),select=node("select");select.setAttribute("aria-label",`空欄${k}`);select.append(new Option("選んでください",""));q.choices.forEach((c,i)=>select.append(new Option(`${i+1} ${c}`,String(i+1))));select.value=s.value[k]||"";
      select.addEventListener("change",()=>{change(n=>{n.session.value[k]=select.value;});refresh();});label.append(select);inputs.append(label);
    });
    else {const text=node("textarea");text.maxLength=200;text.rows=4;text.value=s.value;text.setAttribute("aria-label","記述答案");const count=node("p","",`${s.value.length}字`);text.addEventListener("input",()=>{change(n=>{n.session.value=text.value;});count.textContent=`${text.value.length}字`;refresh();});inputs.append(text,count);}
    page.append(inputs);
    if(q.type==="multi")page.append(node("p","subtitle","4空欄とも異なる候補を選んでください。"));
    const confidence=node("fieldset","transfer-confidence");confidence.append(node("legend","","正解を見る前の自信度"));
    for(const [id,labelText] of [["confident","自信あり"],["unsure","迷った"]]){
      const label=node("label"),input=node("input");input.type="radio";input.name="transfer-confidence";input.value=id;input.checked=s.confidence===id;
      input.addEventListener("change",()=>{change(n=>{n.session.confidence=id;});refresh();});label.append(input,document.createTextNode(labelText));confidence.append(label);
    }
    page.append(confidence);
    const known=node("label","transfer-known"),check=node("input");check.type="checkbox";check.checked=s.known;check.addEventListener("change",()=>change(n=>{n.session.known=check.checked;}));known.append(check,document.createTextNode("この問題や答えを以前に見た・別の資料を見ながら解いた"));page.append(known);
    const actions=node("div","transfer-actions");submit=button("回答を確定して解説を見る","primary",answer);refresh();
    actions.append(submit,button("保存して一覧へ","ghost",()=>{pause();view="menu";redraw();}));page.append(actions);
  }
  function explanation(page,q,attempt,history=false){
    const result=S.grade(store,attempt), panel=node("section","transfer-explanation");
    panel.append(node("h2","",result.ok===null?"記述：自己採点待ち":result.ok?"正解":"要復習"));
    const answerText=q.type==="single"?q.choices[Number(attempt.value)-1]:q.type==="written"?attempt.value:q.blanks.map(k=>`${k}：${q.choices[Number(attempt.value[k])-1]}`).join("／");
    panel.append(node("p","",`あなたの回答：${answerText}`),node("p","",`回答時：${attempt.confidence==="confident"?"自信あり":"迷った"}｜${Math.round(attempt.activeMs/1000)}秒（表示中の概算）`));
    if(result.ok===false&&attempt.confidence==="confident")panel.append(node("p","reference-caution","自信があった誤答です。思い込みの可能性があるため、弱点復習で優先します。"));
    panel.append(button("この論点を参考書で復習","secondary",()=>readLesson(q.lesson)));
    q.basic.forEach(id=>panel.append(button(`基本の問${id}と解説を読む（履歴は変更しない）`,"ghost",()=>{returnView=view;basicId=id;view="basic";redraw();})));
    if(!history)panel.append(button("解説を確認したので次へ","ghost",nextQuestion));
    if(q.type==="written"){
      panel.append(node("h3","","解答例"),node("p","",q.answer),node("p","subtitle","学習用の採点目安です。公式の部分点を再現・保証するものではありません。"));
      q.rubric.forEach(r=>panel.append(node("p","",r)));q.mistakes.forEach(r=>panel.append(node("p","",r)));
      const label=node("label","","自己採点（0～20の整数）"),input=node("input");input.type="number";input.min=0;input.max=20;input.step=1;input.value=result.score??"";input.setAttribute("aria-label","確認記述の自己採点");label.append(input);panel.append(label);
      const save=button("自己採点を保存","secondary",()=>{
        if(input.value===""||!Number.isInteger(Number(input.value))||Number(input.value)<0||Number(input.value)>20){alert("0～20の整数で入力してください。未採点なら採点せず次へ進めます。");return;}
        const next=S.clone(store);add(next,{id:uuid(),kind:"grade",attemptId:attempt.id,at:Date.now(),score:Number(input.value)});if(commit(next))redraw();
      });panel.append(save);
    }else{
      panel.append(node("h3","","全肢の理由・ひっかけポイント"));
      panel.append(node("p","",`得点 ${result.score}/${result.max}（この問題の練習点）`));
      if(q.type==="multi")panel.append(node("p","",`正解：${q.blanks.map(k=>`${k}＝${q.choices[q.answer[k]-1]}`).join("／")}`));
      const order=q.type==="single"?attempt.order:q.choices.map((_,i)=>i+1);
      order.forEach((id,index)=>{const block=node("div","transfer-reason");block.append(node("h3","",`${index+1}　${q.choices[id-1]}${q.type==="single"&&id===q.answer?"【選ぶ肢】":""}`),node("p","",q.reasons[id-1]));panel.append(block);});
      q.statements?.forEach(s=>panel.append(node("p","",`${s.label} ${s.correct?"○":"×"}　${s.text}\n理由・ひっかけ：${s.reason}`)));
    }
    const sources=node("details");sources.append(node("summary","","根拠・確認範囲"));
    q.refs.forEach(r=>{const a=node("a","",`${r.title} ${r.articles}`);a.href=r.url;a.target="_blank";a.rel="noopener noreferrer";sources.append(a,node("br"));});
    sources.append(node("p","",`法令基準日 ${D.lawDate}／確認日 ${D.checkedAt}。条文中心のオリジナル問題。特定の判例を根拠とする問題ではありません。`));panel.append(sources);
    const alternatives=D.questions.filter(x=>x.lesson===q.lesson&&x.id!==q.id&&!S.stats(store,x).total);
    if(alternatives.length)panel.append(node("p","subtitle",`同じ論点の未回答問題：${alternatives.map(x=>x.id).join("・")}（一覧の未回答から取り組めます）`));
    panel.append(node("p","subtitle","同じ問題への再挑戦は初回成績とは分けて記録します。"));page.append(panel);
    const actions=node("div","transfer-actions");
    if(history){actions.append(button("確認問題の一覧に戻る","primary",()=>{view="menu";redraw();}),button("この問題から再挑戦","ghost",()=>{if(store.session&&!store.session.done&&!confirm("現在の確認セットをこの問題に切り替えますか？回答履歴は残ります。"))return;start("selected",[q.id]);}));page.append(actions);return;}
    actions.append(button("次の確認問題へ","primary",nextQuestion),button("この問題に再挑戦","ghost",()=>{change(n=>prepare(n));redraw();}),button("結果・弱点の一覧","ghost",()=>{view="menu";redraw();}));page.append(actions);
  }
  function menu(page){
    page.append(node("p","subtitle","既存60問とは別のオリジナル24問。形式は本試験を参考にしていますが、難易度・合格効果は未実測です。"));
    const select=node("select");select.setAttribute("aria-label","確認問題の科目");select.append(new Option("全科目",""));["行政法","民法","会社法"].forEach(c=>select.append(new Option(c,c)));select.value=category;select.addEventListener("change",()=>{category=select.value;redraw();});page.append(select);
    const actions=node("div","transfer-actions");
    if(store.session&&!store.session.done)actions.append(button(`続きから：${store.session.question.id}`,"primary",()=>{view="question";redraw();}));
    for(const [mode,label] of [["new","未回答から確認"],["weak","弱点を復習"],["all","全問を選び直す"]]){
      const ids=S.queue(store,D.questions,mode,category),b=button(`${label} ${ids.length}問`,mode==="new"?"primary":"ghost",()=>{if(store.session&&!store.session.done&&!confirm("回答履歴は残し、現在の確認セットを選び直しますか？"))return;start(mode,ids);});b.disabled=!ids.length;actions.append(b);
    }page.append(actions);
    if(owner!=="guest")page.append(button("確認履歴を今すぐ同期","ghost",flush),button("未ログイン時の端末履歴を取り込む","ghost",importGuest));
    page.append(node("p","subtitle",owner==="guest"?"未ログインの記録はこの端末だけです。ログイン後に取り込みを選ぶと、この確認履歴をアカウントへコピーできます。":"アカウント別に保存しています。別端末へ移る前に「クラウド同期済み」を確認してください。同時に2端末で操作すると再開位置は新しい操作を優先します。"));
    page.append(button("確認履歴をJSONで保存","ghost",()=>{const blob=new Blob([JSON.stringify({owner,exportedAt:new Date().toISOString(),data:store},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=node("a");a.href=url;a.download="gyosei-transfer-history.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
    const selected=D.questions.filter(q=>!category||q.category===category);
    const first=selected.map(q=>S.stats(store,q).first).filter(a=>a&&!a.known&&!a.guideReadBefore);
    const graded=first.filter(a=>S.grade(store,a).ok!==null);
    page.append(node("h2","","確認問題だけの学習状況"),node("p","",`初回回答（既知・関連参考書閲覧の申告／記録なし）：${graded.filter(a=>S.grade(store,a).ok).length}/${graded.length}問全正解。記述未採点 ${first.length-graded.length}問。`),node("p","subtitle","この数値は外部試験の初見成績や合格確率ではありません。教材以外での事前学習までは検出できません。"));
    selected.forEach(q=>{const s=S.stats(store,q),card=node("article","reference-card");
      card.append(node("h3","",`${q.id} ${q.category}・${q.format}`));
      card.append(node("p","",s.total?`直近5回：${s.recent.join(" ")}｜通算${s.total}回｜全正解${s.correct}/${s.graded}回（採点済み）`:"未回答"));
      if(s.latest)card.append(node("p","",`${s.weak?"要復習":"直近は自信あり・全正解"}${s.priority===3?"：自信ありの誤答を優先":""}`));
      card.append(button(s.total?"再挑戦する":"この問題を解く","ghost",()=>{if(store.session&&!store.session.done&&!confirm("今の確認セットの再開位置を、この問題に切り替えますか？回答履歴は残ります。"))return;start("selected",[q.id]);}));
      if(s.latest)card.append(button(q.type==="written"&&s.last.ok===null?"答案を採点・解説確認":"保存した回答と解説", "ghost",()=>{
        historyId=s.latest.id;view="history";redraw();
      }));page.append(card);
    });
    const guide=node("details","reference-card");guide.append(node("summary","","実際の得点の伸びを測るには"),node("p","","未受験の完全版過去問・外部模試を180分で解く → 約14日学習 → 別の未受験の試験を同条件で解く。科目別得点、記述の自己採点幅、時間、他教材の使用を記録します。年度間の難易度差があるため、アプリだけの効果とは断定しません。公式公開の省略版56問を300点換算して合格判定しないでください。"));page.append(guide);
  }
  function homeCard(onOpen){
    const card=node("section","home-card transfer-home-card"),left=S.queue(store,D.questions,"new").length,weak=S.queue(store,D.questions,"weak").length;
    card.append(node("h2","","覚えた知識を別の問題で確認"),node("p","subtitle",`実力確認24問｜未回答 ${left}問・要復習 ${weak}問`));
    card.append(button(store.session&&!store.session.done?`確認の続き：${store.session.question.id}`:"実力確認を始める","primary",()=>{onOpen();if(store.session&&!store.session.done){view="question";redraw();}else if(left){category="";start("new");}}));
    card.append(button("確認問題の一覧・弱点","ghost",()=>{view="menu";onOpen();}),node("p","transfer-status",statusText()));return card;
  }
  function openLessonQuestions(id,onOpen){const ids=D.questions.filter(q=>q.lesson===id).map(q=>q.id);if(store.session&&!store.session.done&&!confirm("現在の確認セットをこの章の問題に切り替えますか？回答履歴は残ります。"))return;if(ids.length&&noteLesson(id)){onOpen();start("lesson",ids);}}
  window.GYOSEI_TRANSFER={render,homeCard,setUser,setNotify:fn=>{notify=fn;},pause,openLessonQuestions,noteLesson};
})();
