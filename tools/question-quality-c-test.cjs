"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const sandbox = { window: {} };
const snapshots = {};
for (const file of ["data.js", "question-revisions.js", "question-revisions-b.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), sandbox, { filename: file });
  snapshots[sandbox.window.GYOSEI_CONTENT?.edition || "original-2026-09-25"] = JSON.stringify(sandbox.window.EXAM_DATA);
}
const previous = sandbox.window.EXAM_DATA;
vm.runInNewContext(fs.readFileSync(path.join(root, "question-revisions-c.js"), "utf8"), sandbox);
const { EXAM_DATA: exam, GYOSEI_CONTENT: content } = sandbox.window;
assert.equal(content.edition, "quality-2026-09-28-c");
assert.equal(Object.keys(content.editions).length, 4);
for (const [id, snapshot] of Object.entries(snapshots)) assert.equal(JSON.stringify(content.getExam(id)), snapshot, `Changed old edition ${id}`);
assert.equal(content.getExam(undefined), sandbox.window.EXAM_ORIGINAL_DATA);
assert.equal(content.getExam("unknown"), sandbox.window.EXAM_ORIGINAL_DATA);
assert.equal(content.getExam(content.edition), exam);
assert.deepEqual(Array.from(content.phaseCIds), [1, 3, 5, 6, 7, 8, 9, 10, 19, 20, 22, 23, 25, 28, 33, 34]);
assert.equal(content.revisedIds.length, 42);
assert.equal(new Set(content.revisedIds).size, 42);
assert.equal(exam.questions.length, 60);
let cLongest = 0, allLongest = 0;
const balances = [];
for (const q of exam.questions) {
  const before = previous.questions.find(item => item.id === q.id);
  for (const field of ["id", "title", "type", "answer", "blanks"]) assert.equal(JSON.stringify(q[field]), JSON.stringify(before[field]));
  if (!content.phaseCIds.includes(q.id)) { assert.equal(JSON.stringify(q), JSON.stringify(before)); continue; }
  assert.equal(q.contentRevision, content.edition);
  assert.notEqual(q.prompt, before.prompt);
  assert.equal(q.choices.length, 5);
  assert.equal(new Set(q.choices.map(choice => choice.label)).size, 5);
  for (const choice of q.choices) {
    assert.ok(q.sections[`肢${choice.value} ${choice.value === q.answer ? "○" : "×"}`]?.length > 25);
    assert.equal(Boolean(choice.trap), choice.value !== q.answer);
    if (choice.trap) assert.ok(choice.trap.length > 15);
  }
  for (const section of ["一緒に覚える周辺知識", "別角度で出るなら"]) assert.equal(q.sections[section], before.sections[section]);
  if (![6, 10, 19, 22, 23, 34].includes(q.id)) assert.equal(q.sections["関連判例"], before.sections["関連判例"]);
  else {
    assert.ok(q.sections["関連判例"].length > 150);
    assert.ok(q.sections["関連判例"].includes("最高裁"));
    assert.ok(q.sections["関連判例"].includes("【"));
  }
  assert.ok(q.sections["一次資料"].includes("https://laws.e-gov.go.jp/"));
  const lengths = q.choices.map(choice => choice.label.length);
  const ratio = Math.max(...lengths) / Math.min(...lengths);
  balances.push({ id: q.id, ratio: Number(ratio.toFixed(2)), lengths });
  assert.ok(ratio < 1.3, `Length imbalance Q${q.id}: ${JSON.stringify(lengths)}`);
  if (q.choices.find(choice => choice.value === q.answer).label.length === Math.max(...lengths) && lengths.filter(n => n === Math.max(...lengths)).length === 1) cLongest++;
}
for (const q of exam.questions.filter(q => q.type === "single")) {
  const lengths = q.choices.map(choice => choice.label.length);
  if (q.choices.find(choice => choice.value === q.answer).label.length === Math.max(...lengths) && lengths.filter(n => n === Math.max(...lengths)).length === 1) allLongest++;
}
assert.ok(cLongest <= 4, `Too many longest correct choices: ${cLongest}`);
for (const id of [6, 10, 34]) assert.ok(exam.questions.find(q => q.id === id).sections["訂正履歴"]?.length > 60);
assert.ok(exam.questions.find(q => q.id === 10).sections["関連判例"].includes("監置"));
assert.ok(exam.questions.find(q => q.id === 6).sections["関連判例"].includes("判断は不要"));
assert.ok(exam.questions.find(q => q.id === 34).sections["訂正履歴"].includes("単一正答性"));
assert.ok(exam.questions.find(q => q.id === 34).sections["肢4 ×"].includes("両方"));
assert.ok(exam.questions.find(q => q.id === 3).prompt.includes("被保佐人"));
assert.ok(exam.questions.find(q => q.id === 3).prompt.includes("警備員"));
assert.ok(exam.questions.find(q => q.id === 3).sections["根拠条文"].includes("22条"));
assert.ok(sandbox.window.EXAM_ORIGINAL_DATA.questions.find(q => q.id === 10).sections["関連判例"].includes("証人"));
console.log(JSON.stringify({ ok: true, revisedTotal: 42, phaseC: 16, editions: 4, previousEditionsPreserved: true, cUniqueLongest: cLongest, allUniqueLongest: allLongest, corrections: [6, 10, 34], balances }, null, 2));
