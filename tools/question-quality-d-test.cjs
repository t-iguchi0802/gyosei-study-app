"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const sandbox = { window: {} }, snapshots = {};
for (const file of ["data.js", "question-revisions.js", "question-revisions-b.js", "question-revisions-c.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), sandbox, { filename: file });
  snapshots[sandbox.window.GYOSEI_CONTENT?.edition || "original-2026-09-25"] = JSON.stringify(sandbox.window.EXAM_DATA);
}
const before = sandbox.window.EXAM_DATA;
vm.runInNewContext(fs.readFileSync(path.join(root, "question-revisions-d.js"), "utf8"), sandbox);
const { EXAM_DATA: exam, GYOSEI_CONTENT: content } = sandbox.window;
assert.equal(exam.questions.length, 60);
assert.equal(content.edition, "quality-2026-09-28-d");
assert.equal(Object.keys(content.editions).length, 5);
assert.equal(content.revisedIds.length, 60);
assert.equal(new Set(content.revisedIds).size, 60);
assert.equal(content.phaseDIds.length, 18);
for (const [revision, json] of Object.entries(snapshots)) assert.equal(JSON.stringify(content.getExam(revision)), json);
let singles = 0, multi = 0, written = 0, longest = 0;
for (const q of exam.questions) {
  const old = before.questions.find(old => old.id === q.id);
  for (const field of ["id", "type", "title", "blanks"]) assert.equal(JSON.stringify(q[field]), JSON.stringify(old[field]));
  assert.ok(q.contentRevision !== "original-2026-09-25");
  if (!content.phaseDIds.includes(q.id)) assert.equal(JSON.stringify(q), JSON.stringify(old));
  for (const name of ["この問題の核心", "一緒に覚える周辺知識", "解答テクニック", "別角度で出るなら", "一次資料"]) assert.ok(q.sections[name]?.length > 10, `Q${q.id} ${name}`);
  if (q.type === "single") {
    singles++;
    assert.equal(q.answer, old.answer);
    assert.equal(q.choices.length, 5);
    assert.equal(new Set(q.choices.map(c => c.label)).size, 5);
    for (const c of q.choices) {
      assert.ok(q.sections[`肢${c.value} ${c.value === q.answer ? "○" : "×"}`]?.length > 25);
      assert.equal(Boolean(c.trap), c.value !== q.answer);
    }
    const lengths = q.choices.map(c => c.label.length), max = Math.max(...lengths);
    assert.ok(max / Math.min(...lengths) < 1.3, `Length imbalance Q${q.id}`);
    if (lengths[q.answer - 1] === max && lengths.filter(n => n === max).length === 1) longest++;
  } else if (q.type === "multi") {
    multi++;
    assert.equal(JSON.stringify(q.answer), JSON.stringify(old.answer));
    assert.equal(q.choices.length, 20);
    assert.equal(q.choiceExplanations.length, 20);
    assert.equal(new Set(q.choiceExplanations.map(e => e.value)).size, 20);
    for (const c of q.choices) {
      const explanation = q.choiceExplanations.find(e => e.value === c.value);
      assert.ok(explanation.reason.length > 35, `Short reason Q${q.id} candidate${c.value}`);
      assert.equal(JSON.stringify(explanation.blanks), JSON.stringify(q.blanks.filter(b => q.answer[b] === c.value)));
    }
    for (const b of q.blanks) assert.ok(q.sections[`${b}の理由`].length > 20);
    assert.ok(q.sections["関連判例"].includes("最高裁"));
  } else {
    written++;
    assert.equal(q.rubric.reduce((total, e) => total + e.points, 0), 20);
    assert.ok(q.rubric.every(e => e.points > 0 && e.description.length > 15));
    assert.ok(q.acceptedAnswers.length >= 2);
    assert.equal(q.commonMistakes.length, 4);
    assert.ok(q.commonMistakes.every(m => m.reason.length > 30));
    assert.ok(Array.from(q.answer).length >= 36 && Array.from(q.answer).length <= 44);
    assert.ok(!q.answer.includes("字数"));
  }
}
assert.deepEqual([singles, multi, written], [54, 3, 3]);
const q44 = exam.questions.find(q => q.id === 44);
assert.ok(q44.sections["訂正履歴"].includes("差止めも"));
assert.ok(!q44.sections["なぜこの表現になるのか"].includes("差止訴訟の文言"));
assert.ok(exam.questions.find(q => q.id === 43).sections["関連判例"].includes("本案では認められない"));
assert.ok(exam.questions.find(q => q.id === 45).sections["関連判例"].includes("供託金還付"));
assert.ok(exam.questions.find(q => q.id === 46).acceptedAnswers[1].includes("必須にしない"));
assert.equal(require("node:crypto").createHash("sha256").update(fs.readFileSync(path.join(root, "data.js"))).digest("hex"), "7e437d413286077fc87856960cf6d8e01c88f7e1f22b3b0f448567368532fb38");
console.log(JSON.stringify({ ok: true, reviewed: 60, singles, multi, written, candidateReasons: 60, rubricTotal: 60, editions: 5, previousEditionsPreserved: true, uniqueLongestCorrect: longest, originalUniqueLongestCorrect: 48, correction: 44 }, null, 2));
