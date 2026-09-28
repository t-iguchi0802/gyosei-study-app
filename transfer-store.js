(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GYOSEI_TRANSFER_STORE = api;
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const key = owner => `gyosei2026_transfer_v1:${owner || "guest"}`;
  const blank = () => ({ schema: 1, events: {}, session: null, cursorAt: 0, cursorToken: "", pending: {}, cursorDirty: false });
  const clone = value => JSON.parse(JSON.stringify(value));
  function normalize(value) {
    if (!value) return blank();
    if (value.schema !== 1 || !value.events || typeof value.events !== "object" || Array.isArray(value.events)) throw new Error("実力確認の保存形式を読み込めません。保存内容は変更していません。");
    return { ...blank(), ...clone(value) };
  }
  function compare(a, b) { return (Number(a.cursorAt) || 0) - (Number(b.cursorAt) || 0) || String(a.cursorToken || "").localeCompare(String(b.cursorToken || "")); }
  function merge(local, remote) {
    const out = normalize(local), other = normalize(remote);
    // Immutable event IDs make retries and two-device merges idempotent.
    out.events = { ...other.events, ...out.events };
    if (compare(other, out) > 0) { out.session = other.session; out.cursorAt = other.cursorAt; out.cursorToken = other.cursorToken; out.cursorDirty = false; }
    return out;
  }
  function attempts(store, id, version) {
    return Object.values(store.events).filter(e => e.kind === "attempt" && e.question.id === id && (!version || e.question.version === version))
      .sort((a,b) => a.at-b.at || a.id.localeCompare(b.id));
  }
  function grade(store, attempt) {
    if (attempt.question.type !== "written") return { score: attempt.score, max: attempt.max, ok: attempt.score === attempt.max };
    const grades = Object.values(store.events).filter(e => e.kind === "grade" && e.attemptId === attempt.id).sort((a,b) => a.at-b.at || a.id.localeCompare(b.id));
    const score = grades.at(-1)?.score ?? null;
    return { score, max: 20, ok: score === null ? null : score === 20 };
  }
  function stats(store, q) {
    const all = attempts(store, q.id, q.version), latest=all.at(-1), outcomes=all.map(a=>grade(store,a));
    let streak=0; for(let i=outcomes.length-1;i>=0&&outcomes[i].ok===true;i--) streak++;
    const last = latest ? grade(store,latest) : null;
    return { total:all.length, correct:outcomes.filter(x=>x.ok===true).length, graded:outcomes.filter(x=>x.ok!==null).length,
      recent:outcomes.slice(-5).map(x=>x.ok===null?"未採点":x.ok?"○":"×"), latest, first:all[0], last,
      weak:Boolean(latest && (last.ok!==true || latest.confidence!=="confident")),
      priority:!latest?0:last.ok===false&&latest.confidence==="confident"?3:last.ok!==true?2:latest.confidence==="unsure"?1:0, streak };
  }
  function valid(q, value, confidence) {
    if (!["confident","unsure"].includes(confidence)) return false;
    if(q.type==="written") return typeof value==="string" && value.trim().length>0 && value.length<=200;
    if(q.type==="single") return Number.isInteger(Number(value)) && Number(value)>=1 && Number(value)<=q.choices.length;
    const values=q.blanks.map(k=>Number(value?.[k]));
    return values.every(v=>Number.isInteger(v)&&v>=1&&v<=q.choices.length) && new Set(values).size===values.length;
  }
  function score(q,value) {
    if(q.type==="written") return {score:null,max:20};
    if(q.type==="single") return {score:Number(value)===q.answer?4:0,max:4};
    return {score:q.blanks.filter(k=>Number(value[k])===q.answer[k]).length*2,max:8};
  }
  function queue(store, questions, mode, category="") {
    const candidates=questions.filter(q=>!category||q.category===category);
    return candidates.filter(q=>mode==="new"?!stats(store,q).total:mode==="weak"?stats(store,q).weak:true)
      .sort((a,b)=>mode==="weak"?stats(store,b).priority-stats(store,a).priority:0).map(q=>q.id);
  }
  return {key,blank,clone,normalize,merge,compare,attempts,grade,stats,valid,score,queue};
});
