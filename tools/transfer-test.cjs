"use strict";
const assert=require('node:assert/strict');
global.window={};require('../reference-data.js');require('../transfer-content.js');require('../data.js');
const S=require('../transfer-store.js'),D=window.GYOSEI_TRANSFER_DATA;
assert.equal(D.questions.length,24);assert.equal(D.lessons.length,6);assert.equal(window.GYOSEI_REFERENCE_DATA.lessons.length,21);
assert.equal(new Set(D.questions.map(q=>q.id)).size,24);
const lessons=new Set(window.GYOSEI_REFERENCE_DATA.lessons.map(l=>l.id));
const baseline=JSON.stringify(window.EXAM_DATA);let store=S.blank();
for(const q of D.questions){
  assert(lessons.has(q.lesson));assert(q.refs.every(r=>new URL(r.url).hostname==='laws.e-gov.go.jp'));
  assert(q.basic.every(id=>window.EXAM_DATA.questions.some(q=>q.id===id)));
  if(q.type==='written') {assert(q.rubric.length>=2);assert(q.mistakes.length>=3);assert(q.answer.length>=35&&q.answer.length<=45,`${q.id}: ${q.answer.length}`);}
  else {assert.equal(q.choices.length,q.type==='single'?5:20);assert.equal(q.reasons.length,q.choices.length);assert(q.reasons.every(r=>r.length>10));}
  if(q.statements)assert.equal(q.choices[q.answer-1],q.statements.filter(s=>s.correct).map(s=>s.label).join('・'));
  assert(!S.valid(q,'',''));assert(!S.valid(q,q.answer,''));assert(S.valid(q,q.answer,'confident'));
  if(q.type==='multi'){assert(!S.valid(q,{ア:1,イ:1,ウ:2,エ:3},'confident'));assert(!S.valid(q,{ア:1},'confident'));}
  const score=S.score(q,q.answer);assert(q.type==='written'?score.score===null:score.score===score.max);
  const e={id:q.id,kind:'attempt',at:1,question:q,value:q.answer,confidence:'confident',...score};store.events[e.id]=e;
}
assert.equal(S.queue(store,D.questions,'new').length,0);assert.equal(S.queue(store,D.questions,'weak').length,4);
for(let n=0;n<8;n++)store.events[`r${n}`]={...store.events.T01,id:`r${n}`,at:2+n,score:n===7?0:4};
const stats=S.stats(store,D.questions[0]);assert.equal(stats.total,9);assert.equal(stats.recent.length,5);assert.equal(stats.priority,3);
store.events.g={id:'g',kind:'grade',attemptId:'T21',at:20,score:14};assert.equal(S.grade(store,store.events.T21).score,14);
const remote=S.blank();remote.events.remote={...store.events.T02,id:'remote'};remote.cursorAt=99;remote.cursorToken='r';remote.session={index:3};
const merged=S.merge(store,remote);assert.equal(Object.keys(merged.events).length,Object.keys(store.events).length+1);assert.equal(merged.session.index,3);
assert.deepEqual(S.merge(merged,remote),merged);assert.equal(S.key('a')===S.key('b'),false);assert.throws(()=>S.normalize({schema:9}));
assert.equal(JSON.stringify(window.EXAM_DATA),baseline);
const singles=D.questions.filter(q=>q.type==='single');
const longest=singles.filter(q=>q.choices[q.answer-1].length===Math.max(...q.choices.map(c=>c.length))&&q.choices.filter(c=>c.length===q.choices[q.answer-1].length).length===1).length;
console.log(JSON.stringify({pass:true,questions:24,lessons:21,negative:singles.filter(q=>q.format==='誤り選択').length,combination:singles.filter(q=>q.format==='組合せ').length,uniqueLongestCorrect:longest,writtenChars:D.questions.filter(q=>q.type==='written').map(q=>q.answer.length)}));
