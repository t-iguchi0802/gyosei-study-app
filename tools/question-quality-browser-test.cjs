"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const base = process.env.APP_URL || "http://127.0.0.1:8771/";
const KEY = "gyosei2026_mock1_learning_v1";
async function layout(page) {
  const size = await page.evaluate(() => ({ width: innerWidth, actual: document.documentElement.scrollWidth }));
  assert.ok(size.actual <= size.width, `Overflow: ${JSON.stringify(size)}`);
}
async function seed(page, { start = 1, legacyExam = false, submitted = false, edition = null, seedOldRecord = false } = {}) {
  await page.goto(base);
  const expected = await page.evaluate(({ start, legacyExam, submitted, edition, seedOldRecord }) => {
    const ids = window.EXAM_DATA.questions.map(q => q.id);
    const blank = () => ({ status: "new", startedAt: null, submittedAt: null, examAnswers: {}, records: {}, writtenScores: {}, updatedAt: 0 });
    const store = { version: 1, updatedAt: 0, rounds: Object.fromEntries([1, 2, 3, 4, 5].map(n => [n, blank()])) };
    store.rounds[2].records[4] = { source: "review", answer: 1, confidence: "confident", status: "ng", earned: 0, max: 4, answeredAt: 10 };
    if (!legacyExam && !submitted && (start !== 1 || seedOldRecord)) store.rounds[1].records[start] = { source: "review", answer: 2, confidence: "unsure", status: "ng", earned: 0, max: 4, answeredAt: 20 };
    if (legacyExam) {
      store.rounds[1].status = "in_progress";
      if (edition) store.rounds[1].contentRevision = edition;
      store.rounds[1].startedAt = Date.now();
      for (let id = 1; id < start; id++) store.rounds[1].examAnswers[id] = { value: 1, confidence: "" };
    }
    if (submitted) {
      store.rounds[1].status = "submitted";
      store.rounds[1].submittedAt = Date.now();
      for (const q of window.EXAM_DATA.questions) store.rounds[1].records[q.id] = { source: "exam", answer: q.type === "written" ? "" : q.type === "multi" ? {} : q.answer, status: "ok", earned: q.type === "multi" ? 8 : q.type === "written" ? 0 : 4, max: q.type === "written" ? 20 : q.type === "multi" ? 8 : 4 };
    }
    const learning = window.GYOSEI_LEARNING_V2.blankStore(ids);
    learning.learning.answeredQuestionIds = ids.filter(id => id < start);
    localStorage.setItem("gyosei2026_mock1_learning_v1", JSON.stringify(store));
    localStorage.setItem(window.GYOSEI_LEARNING_V2.STORAGE_KEY, JSON.stringify(learning));
    return { sentinel: store.rounds[2].records[4], revision: window.EXAM_DATA.questions.find(q => q.id === start).contentRevision, revised: window.EXAM_DATA.questions.find(q => q.id === start).prompt, original: window.EXAM_ORIGINAL_DATA.questions.find(q => q.id === start).prompt, previous: window.GYOSEI_CONTENT.getExam(edition).questions.find(q => q.id === start).prompt };
  }, { start, legacyExam, submitted, edition, seedOldRecord });
  await page.reload();
  return expected;
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    // Never log in or access Firebase production in these isolated fixture tests.
    await context.route("https://**/*", route => route.abort());
    // Expose only in the test response, never in the application's distributed file.
    const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
    await context.route(`${base}app.js`, route => route.fulfill({ contentType: "application/javascript", body: appSource.replace(/\}\)\(\);\s*$/, "window.__testMergeV1 = mergeStores;})();") }));
    const page = await context.newPage();
    page.on("dialog", dialog => dialog.accept());
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    for (const id of [...Array.from({ length: 40 }, (_, i) => i + 1), ...Array.from({ length: 14 }, (_, i) => i + 47)]) {
      const expected = await seed(page, { start: id, seedOldRecord: true });
      assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).rounds[2].records[4], KEY), expected.sentinel, "Old record changed on load");
      await page.getByRole("button", { name: /続きから学習する/ }).click();
      assert.equal(await page.locator(".prompt").innerText(), expected.revised);
      assert.equal(await page.locator(".choices input").count(), 5);
      const renderedValues = await page.locator('.choices input').evaluateAll(inputs => inputs.map(input => Number(input.value)));
      assert.deepEqual(renderedValues, [1, 2, 3, 4, 5]);
      assert.equal(await page.locator(".explanation").count(), 0);
      await page.locator('input[name="answer"]').first().check();
      const reveal = page.getByRole("button", { name: "回答を確定して解説を見る" });
      assert.ok(await reveal.isDisabled());
      await page.getByRole("button", { name: "自信あり", exact: true }).click();
      await reveal.click();
      const record = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)).rounds[1].records[id], { key: KEY, id });
      assert.equal(record.contentRevision, expected.revision);
      assert.equal(record.confidence, "confident");
      assert.equal(record.answer, renderedValues[0], "Fixed UI must preserve original answer mapping");
      assert.deepEqual(await page.locator('.choices input').evaluateAll(inputs => inputs.map(input => Number(input.value))), renderedValues, "Reveal must not reshuffle the choices");
      const archive = await page.evaluate(({ key, id }) => Object.values(JSON.parse(localStorage.getItem(key)).contentArchives || {}).find(item => item.questionId === id), { key: KEY, id });
      assert.equal(archive.record.answer, 2, "Answer to old wording must be archived before replacing its record");
      assert.equal(archive.record.answeredAt, 20);
      assert.equal(archive.contentRevision, "original-2026-09-25");
      assert.equal(await page.locator(".legacy-record-archive").count(), 1);
      assert.equal(await page.locator(".choice-explanation").count(), 5);
      assert.equal(await page.locator(".trap-note").count(), 4);
      assert.ok((await page.locator(".trap-note").first().innerText()).length > 25);
      await layout(page);
      if (id === 4) await page.screenshot({ path: "tools/quality-q4-mobile.png", fullPage: true });
      if (id === 29) {
        assert.ok((await page.locator(".core-box").innerText()).includes("ア○"));
        assert.ok((await page.locator(".core-box").innerText()).includes("エ×"));
        await page.screenshot({ path: "tools/quality-q29-mobile.png", fullPage: true });
      }
      if (id === 40) {
        assert.ok((await page.locator(".explanation").innerText()).includes("原版の肢5と解説"));
        await page.screenshot({ path: "tools/quality-q40-mobile.png", fullPage: true });
      }
      if ([6, 10, 34].includes(id)) {
        assert.equal(await page.locator(".content-correction").count(), 1);
        if (id === 34) {
          assert.ok((await page.locator(".content-correction").innerText()).includes("単一正答性"));
          await page.screenshot({ path: "tools/quality-q34-mobile.png", fullPage: true });
        }
      }
    }
    const old = await seed(page, { start: 4, legacyExam: true });
    await page.getByRole("button", { name: /^通し試験を再開/ }).click();
    assert.equal(await page.locator(".prompt").innerText(), old.original, "Interrupted legacy exam must use original question");
    assert.equal(await page.locator(".explanation, .history-mini, .score-criteria").count(), 0);
    const oldAnswers = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).rounds[1].examAnswers, KEY);
    assert.equal(Object.keys(oldAnswers).length, 3);
    await page.getByRole("button", { name: "終了", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: /^通し試験を再開/ }).click();
    assert.equal(await page.locator(".prompt").innerText(), old.original);

    // A previously started phase-A exam must not fall back to the production original.
    const phaseA = await seed(page, { start: 4, legacyExam: true, edition: "quality-2026-09-28-a" });
    await page.getByRole("button", { name: /^通し試験を再開/ }).click();
    assert.equal(await page.locator(".prompt").innerText(), phaseA.previous);
    assert.notEqual(phaseA.previous, phaseA.original);
    assert.equal(await page.locator(".explanation, .history-mini").count(), 0);
    await page.getByRole("button", { name: "終了", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: /^通し試験を再開/ }).click();
    assert.equal(await page.locator(".prompt").innerText(), phaseA.previous);

    await page.locator(".question-picker summary").click();
    await page.locator(".number-grid button").filter({ hasText: /^29$/ }).click();
    assert.equal(await page.locator(".prompt").innerText(), await page.evaluate(() => window.GYOSEI_CONTENT.getExam("quality-2026-09-28-a").questions.find(q => q.id === 29).prompt));
    await page.locator('input[name="answer"][value="3"]').check();
    await page.locator(".question-picker summary").click();
    await page.locator(".number-grid button").filter({ hasText: /^60$/ }).click();
    await page.getByRole("button", { name: "終了・一括採点", exact: true }).click();
    const phaseARecord = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).rounds[1].records[29], KEY);
    assert.equal(phaseARecord.contentRevision, "original-2026-09-25", "Phase-A Q29 is the original, not the new count question");
    assert.equal(phaseARecord.status, "ok");
    await page.locator(".result-row").filter({ hasText: /^問29/ }).getByRole("button", { name: "確認", exact: true }).click();
    assert.equal(await page.locator(".prompt").innerText(), await page.evaluate(() => window.EXAM_ORIGINAL_DATA.questions.find(q => q.id === 29).prompt));

    // Phase B keeps its own revised case wording when phase C is introduced.
    const phaseB = await seed(page, { start: 34, legacyExam: true, edition: "quality-2026-09-28-b" });
    await page.getByRole("button", { name: /^通し試験を再開/ }).click();
    assert.equal(await page.locator(".prompt").innerText(), phaseB.previous);
    assert.notEqual(phaseB.previous, phaseB.revised);
    assert.equal(await page.locator(".explanation, .content-correction, .history-mini").count(), 0);
    await page.getByRole("button", { name: "終了", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: /^通し試験を再開/ }).click();
    assert.equal(await page.locator(".prompt").innerText(), phaseB.previous);
    await page.locator('input[name="answer"][value="3"]').check();
    await page.locator(".question-picker summary").click();
    await page.locator(".number-grid button").filter({ hasText: /^29$/ }).click();
    assert.equal(await page.locator(".prompt").innerText(), await page.evaluate(() => window.GYOSEI_CONTENT.getExam("quality-2026-09-28-b").questions.find(q => q.id === 29).prompt));
    await page.locator('input[name="answer"][value="3"]').check();
    await page.locator(".question-picker summary").click();
    await page.locator(".number-grid button").filter({ hasText: /^60$/ }).click();
    await page.getByRole("button", { name: "終了・一括採点", exact: true }).click();
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).rounds[1].records[34].contentRevision, KEY), "original-2026-09-25");
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).rounds[1].records[29].contentRevision, KEY), "quality-2026-09-28-b");
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).rounds[1].records[29].status, KEY), "ok");
    await page.locator(".result-row").filter({ hasText: /^問34/ }).getByRole("button", { name: "確認", exact: true }).click();
    assert.equal(await page.locator(".prompt").innerText(), phaseB.previous);
    assert.ok((await page.locator(".content-correction").innerText()).includes("単一正答性"));

    await seed(page);
    await page.getByRole("button", { name: /^通し試験を始める/ }).click();
    await page.locator(".question-picker summary").click();
    await page.locator(".number-grid button").filter({ hasText: /^4$/ }).click();
    assert.equal(await page.locator(".prompt").innerText(), await page.evaluate(() => window.EXAM_DATA.questions.find(q => q.id === 4).prompt));
    await page.locator('input[name="answer"][value="5"]').check();
    await page.getByRole("button", { name: "終了", exact: true }).click();
    await page.reload();
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).rounds[1].contentRevision, KEY), "quality-2026-09-28-d");
    await page.getByRole("button", { name: /^通し試験を再開/ }).click();
    await page.locator(".question-picker summary").click();
    await page.locator(".number-grid button").filter({ hasText: /^29$/ }).click();
    assert.equal(await page.locator(".prompt").innerText(), await page.evaluate(() => window.EXAM_DATA.questions.find(q => q.id === 29).prompt));
    assert.equal(await page.locator(".explanation, .content-correction, .history-mini").count(), 0);

    await seed(page, { submitted: true });
    await page.getByRole("button", { name: "1回目の結果を見る", exact: true }).click();
    await page.locator(".result-row").filter({ hasText: /^問40/ }).getByRole("button", { name: "確認", exact: true }).click();
    assert.equal(await page.locator(".prompt").innerText(), await page.evaluate(() => window.EXAM_ORIGINAL_DATA.questions.find(q => q.id === 40).prompt));
    assert.ok((await page.locator(".content-correction").innerText()).includes("旧版を再現"), "Legacy review must also warn about corrected law");
    await page.getByRole("button", { name: "終了", exact: true }).click();
    await page.getByRole("button", { name: "1回目の結果を見る", exact: true }).click();
    assert.equal(await page.locator(".score-criteria").count(), 1);
    assert.ok((await page.locator(".score-criteria").innerText()).includes("記述式の自己採点後"));
    const score = page.getByRole("spinbutton", { name: "問題44の得点", exact: true });
    await score.fill("10"); await score.blur();
    await page.getByRole("spinbutton", { name: "問題44の得点", exact: true }).fill("");
    await page.getByRole("spinbutton", { name: "問題44の得点", exact: true }).blur();
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).rounds[1].writtenScores[44], KEY), "", "Clearing written grade must preserve ungraded state");
    await layout(page);
    await page.locator(".result-row").filter({ hasText: /^問44/ }).getByRole("button", { name: "確認", exact: true }).click();
    await page.getByRole("button", { name: "○ 正解相当", exact: true }).click();
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).rounds[1].writtenScores[44], KEY), 20, "Inline self grade must update score summary");
    await page.getByRole("button", { name: "終了", exact: true }).click();
    await page.getByRole("button", { name: "1回目の結果を見る", exact: true }).click();
    await page.screenshot({ path: "tools/quality-scores-mobile.png", fullPage: false });
    await page.setViewportSize({ width: 1280, height: 900 }); await layout(page);
    await page.screenshot({ path: "tools/quality-scores-desktop.png", fullPage: false });
    assert.deepEqual(errors, []);
    const mergedArchives = await page.evaluate(key => {
      const local = JSON.parse(localStorage.getItem(key));
      const remote = JSON.parse(JSON.stringify(local));
      local.contentArchives = { localId: { questionId: 4, record: { answer: 1 } } };
      remote.contentArchives = { remoteId: { questionId: 11, record: { answer: 2 } } };
      remote.rounds[1].updatedAt = Date.now() + 100;
      const merged = window.__testMergeV1(local, remote);
      return Object.keys(merged.contentArchives).sort();
    }, KEY);
    assert.deepEqual(mergedArchives, ["localId", "remoteId"], "Archives must survive last-updated round conflict resolution");

    await seed(page, { start: 4 });
    const archivedChoice = await page.evaluate(key => {
      const store = JSON.parse(localStorage.getItem(key));
      store.rounds[1].records = {};
      store.rounds[2].records = {};
      store.contentArchives = { phaseA: { round: 1, questionId: 4, contentRevision: "quality-2026-09-28-a", record: { answer: 3, status: "ng", confidence: "unsure" } } };
      localStorage.setItem(key, JSON.stringify(store));
      return window.GYOSEI_CONTENT.getExam("quality-2026-09-28-a").questions.find(q => q.id === 4).choices[2].label;
    }, KEY);
    await page.reload();
    await page.getByRole("button", { name: /続きから学習する/ }).click();
    await page.locator('input[name="answer"]').first().check();
    await page.getByRole("button", { name: "自信あり", exact: true }).click();
    await page.getByRole("button", { name: "回答を確定して解説を見る" }).click();
    await page.locator(".legacy-record-archive summary").click();
    assert.ok((await page.locator(".legacy-record-archive").innerText()).includes(archivedChoice), "Archived phase-A answer must show phase-A wording");
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, revisedScreens: 54, fixedAnswerOrder: true, confidenceBeforeReveal: true, oldRecordsPreserved: true, legacyExamResumePreserved: true, phaseAResumePreserved: true, phaseBResumePreserved: true, newExamRevisionPersisted: true, writtenClearStaysPending: true, mobileWidth: 390, desktopWidth: 1280 }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
