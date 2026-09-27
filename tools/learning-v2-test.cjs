const assert = require("node:assert/strict");
const learning = require("../learning-v2.js");

const questionIds = Array.from({ length: 60 }, (_, index) => index + 1);

const blank = learning.blankStore(questionIds);
assert.equal(blank.schemaVersion, 2);
assert.equal(blank.learning.cycle, 1);
assert.equal(blank.learning.nextQuestionId, 1);

const legacy = {
  version: 1,
  rounds: {
    1: {
      records: Object.fromEntries([1, 2, 3, 4, 5].map(id => [id, { source: "review", status: "ok" }])),
    },
  },
};
const migrated = learning.migrateFromLegacy(legacy, questionIds, 100);
assert.deepEqual(migrated.learning.answeredQuestionIds, [1, 2, 3, 4, 5]);
assert.equal(migrated.learning.nextQuestionId, 6);
assert.equal(migrated.migration.legacyCursorImported, true);

let progress = learning.blankStore(questionIds);
for (let id = 1; id <= 5; id++) progress = learning.completeQuestion(progress, id, questionIds, id * 100);
assert.equal(progress.learning.nextQuestionId, 6);
assert.equal(learning.nextQuestionIndex(progress, questionIds), 5);

const otherDevice = learning.blankStore(questionIds);
otherDevice.learning.answeredQuestionIds = [1, 2, 6];
otherDevice.learning.nextQuestionId = 3;
otherDevice.learning.updatedAt = 900;
otherDevice.updatedAt = 900;
const merged = learning.mergeStores(progress, otherDevice, questionIds);
assert.deepEqual(merged.learning.answeredQuestionIds, [1, 2, 3, 4, 5, 6]);
assert.equal(merged.learning.nextQuestionId, 7);

let completed = learning.blankStore(questionIds);
for (const id of questionIds) completed = learning.completeQuestion(completed, id, questionIds, 1000 + id);
assert.equal(completed.learning.cycle, 2);
assert.equal(completed.learning.completedCycles, 1);
assert.equal(completed.learning.nextQuestionId, 1);
assert.deepEqual(completed.learning.answeredQuestionIds, []);

console.log(JSON.stringify({
  ok: true,
  migratedNextQuestion: migrated.learning.nextQuestionId,
  resumedNextQuestion: progress.learning.nextQuestionId,
  mergedNextQuestion: merged.learning.nextQuestionId,
  completedCycle: completed.learning.cycle,
}, null, 2));
