"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const sandbox = { window: {} };
function load(file) { vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), sandbox, { filename: file }); }
load("data.js");
const originalBytes = JSON.stringify(sandbox.window.EXAM_DATA);
load("question-revisions.js");
load("exam-scoring.js");
const { EXAM_DATA: exam, EXAM_ORIGINAL_DATA: original, GYOSEI_CONTENT: content, GYOSEI_SCORING: scoring } = sandbox.window;
assert.equal(JSON.stringify(original), originalBytes, "Preserved original must not be mutated");
assert.equal(exam.questions.length, 60);
assert.equal(new Set(exam.questions.map(q => q.id)).size, 60);
assert.equal(content.revisedIds.length, 12);
let revisedLongest = 0;
for (const q of exam.questions) {
  const previous = original.questions.find(item => item.id === q.id);
  assert.equal(JSON.stringify(q.answer), JSON.stringify(previous.answer), `Answer mapping changed: Q${q.id}`);
  if (!content.revisedIds.includes(q.id)) {
    const withoutVersion = { ...q }; delete withoutVersion.contentRevision;
    assert.equal(JSON.stringify(withoutVersion), JSON.stringify(previous), `Unrelated content changed: Q${q.id}`);
    continue;
  }
  assert.notEqual(q.prompt, previous.prompt);
  assert.equal(q.choices.length, 5);
  assert.equal(new Set(q.choices.map(choice => choice.label)).size, 5);
  const lengths = q.choices.map(choice => choice.label.length);
  assert.ok(Math.max(...lengths) / Math.min(...lengths) < 1.3, `Length imbalance: Q${q.id}`);
  if (q.choices.find(c => c.value === q.answer).label.length === Math.max(...lengths) && lengths.filter(n => n === Math.max(...lengths)).length === 1) revisedLongest++;
  for (const choice of q.choices) {
    assert.ok(q.sections[`肢${choice.value} ${choice.value === q.answer ? "○" : "×"}`]?.length > 25);
    if (choice.value !== q.answer) assert.ok(choice.trap?.length > 15, `Missing explicit trap: Q${q.id}/${choice.value}`);
  }
  for (const section of ["関連判例", "一緒に覚える周辺知識", "別角度で出るなら"]) assert.equal(q.sections[section], previous.sections[section], `Preservation failed: Q${q.id}/${section}`);
  assert.ok(q.sections["出題者の罠"].length > 35);
}
assert.ok(revisedLongest <= 3, "Revised set still systematically gives away longest answer");

function recordsFor(legalSingles, basicSingles, multiPoints = 0) {
  const records = {};
  for (const q of exam.questions) records[q.id] = { source: "exam", status: "ng", earned: 0 };
  for (let id = 1; id <= legalSingles; id++) records[id].earned = 4;
  for (let id = 47; id < 47 + basicSingles; id++) records[id].earned = 4;
  records[41].earned = multiPoints;
  return records;
}
// Total above 180 does NOT overcome the basic-knowledge floor.
let summary = scoring.summarize(exam.questions, recordsFor(40, 5), { 44: 20, 45: 20, 46: 20 });
assert.equal(summary.total, 240); assert.equal(summary.basic, 20); assert.equal(summary.benchmarkMet, false);
// Legal 120 + basic 56 + written 6 = total 182, with legal 126: all floors met.
summary = scoring.summarize(exam.questions, recordsFor(30, 14), { 44: 6, 45: 0, 46: 0 });
assert.equal(summary.total, 182); assert.equal(summary.benchmarkMet, true);
// Legal 120 + basic 56 = 176: legal floor not met, although basic is perfect.
summary = scoring.summarize(exam.questions, recordsFor(30, 14), { 44: 0, 45: 0, 46: 0 });
assert.equal(summary.meets.legal, false); assert.equal(summary.benchmarkMet, false);
summary = scoring.summarize(exam.questions, recordsFor(30, 14, 2), { 44: 0, 45: 0, 46: 0 });
assert.equal(summary.legal, 122); assert.equal(summary.meets.legal, true); assert.equal(summary.meets.total, false);
// Exact legal boundary, partial multi points, and total boundary.
summary = scoring.summarize(exam.questions, recordsFor(30, 6, 2), { 44: 20, 45: 14, 46: 0 });
assert.equal(summary.legal, 156); assert.equal(summary.basic, 24); assert.equal(summary.total, 180); assert.equal(summary.benchmarkMet, true);
summary = scoring.summarize(exam.questions, recordsFor(40, 14), { 44: "", 45: 0, 46: null });
assert.equal(summary.pending, 2); assert.equal(summary.benchmarkMet, false);
const mixed = recordsFor(40, 14); mixed[1].source = "review";
assert.equal(scoring.summarize(exam.questions, mixed, { 44: 20, 45: 20, 46: 20 }).benchmarkMet, false);
assert.equal(scoring.summarize(exam.questions, recordsFor(40, 14), { 44: 100, 45: -10, 46: "" }).written, 20);
console.log(JSON.stringify({ ok: true, questions: 60, revised: content.revisedIds.length, originalPreserved: true, revisedUniqueLongest: revisedLongest, scoringCases: 8 }, null, 2));
