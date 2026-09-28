"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const sandbox = { window: {} };
function load(file) { vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), sandbox, { filename: file }); }
load("data.js"); const originalBytes = JSON.stringify(sandbox.window.EXAM_DATA);
load("question-revisions.js"); const phaseABytes = JSON.stringify(sandbox.window.EXAM_DATA);
const phaseAId = sandbox.window.GYOSEI_CONTENT.edition;
load("question-revisions-b.js");
const { EXAM_DATA: exam, EXAM_ORIGINAL_DATA: original, GYOSEI_CONTENT: content } = sandbox.window;
assert.equal(JSON.stringify(original), originalBytes);
assert.equal(JSON.stringify(content.getExam(phaseAId)), phaseABytes, "Phase A must remain exactly reproducible");
assert.equal(content.getExam(undefined), original);
assert.equal(content.getExam("unknown-future-version"), original, "Unknown version must not silently use today's questions");
assert.equal(content.getExam(content.edition), exam);
assert.equal(Object.keys(content.editions).length, 3);
assert.equal(content.revisedIds.length, 26);
assert.equal(content.phaseBIds.length, 14);
assert.equal(exam.questions.length, 60);
assert.equal(new Set(exam.questions.map(q => q.id)).size, 60);
let bLongest = 0, allLongest = 0;
for (const q of exam.questions) {
  const base = original.questions.find(item => item.id === q.id);
  const a = content.getExam(phaseAId).questions.find(item => item.id === q.id);
  assert.equal(JSON.stringify(q.answer), JSON.stringify(base.answer));
  assert.equal(q.title, base.title);
  assert.equal(q.type, base.type);
  assert.equal(JSON.stringify(q.blanks), JSON.stringify(base.blanks));
  if (!content.phaseBIds.includes(q.id)) { assert.equal(JSON.stringify(q), JSON.stringify(a)); continue; }
  assert.equal(q.contentRevision, content.edition);
  assert.notEqual(q.prompt, base.prompt);
  assert.equal(q.choices.length, 5);
  assert.equal(new Set(q.choices.map(choice => choice.label)).size, 5);
  const lengths = q.choices.map(choice => choice.label.length);
  assert.ok(Math.max(...lengths) / Math.min(...lengths) < 1.3, `Length imbalance Q${q.id}`);
  const uniqueLongest = q.choices.find(choice => choice.value === q.answer).label.length === Math.max(...lengths) && lengths.filter(length => length === Math.max(...lengths)).length === 1;
  if (uniqueLongest) bLongest++;
  for (const choice of q.choices) {
    assert.ok(q.sections[`肢${choice.value} ${choice.value === q.answer ? "○" : "×"}`]?.length > 25, `Missing reason Q${q.id}/${choice.value}`);
    assert.equal(Boolean(choice.trap), choice.value !== q.answer);
    if (choice.value !== q.answer) assert.ok(choice.trap.length > 15);
  }
  for (const section of ["関連判例", "一緒に覚える周辺知識", "別角度で出るなら"]) assert.equal(q.sections[section], base.sections[section]);
  assert.ok(q.sections["一次資料"].includes("https://laws.e-gov.go.jp/law/"));
}
for (const q of exam.questions.filter(q => q.type === "single")) {
  const lengths = q.choices.map(choice => choice.label.length);
  if (q.choices.find(choice => choice.value === q.answer).label.length === Math.max(...lengths) && lengths.filter(length => length === Math.max(...lengths)).length === 1) allLongest++;
}
assert.ok(bLongest <= 4);
const count = exam.questions.find(q => q.id === 29);
assert.equal(count.answer, 3);
for (const letter of ["ア○", "イ×", "ウ○", "エ×", "オ○"]) assert.ok(count.core.includes(letter), `Count question missing ${letter}`);
const corrected = exam.questions.find(q => q.id === 40);
assert.ok(corrected.prompt.includes("別段の合意"));
assert.ok(corrected.sections["訂正履歴"].includes("正当な理由"));
assert.ok(corrected.sections["肢5 ○"].includes("別段の合意"));
assert.ok(original.questions.find(q => q.id === 40).choices[4].label.includes("正当な理由"), "Original remains preserved for history only");
console.log(JSON.stringify({ ok: true, revisedTotal: 26, phaseB: 14, bUniqueLongest: bLongest, allUniqueLongest: allLongest, originalPreserved: true, phaseAPreserved: true, editions: 3, countQuestionWithAllReasons: true, correctionQ40: true }, null, 2));
