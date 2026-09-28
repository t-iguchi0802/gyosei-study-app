"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.APP_URL || "http://127.0.0.1:8771/";
const KEY = "gyosei2026_mock1_learning_v1";
async function seed(page, id, edition = null) {
  await page.goto(base);
  const expected = await page.evaluate(({ id, edition, key }) => {
    const blank = () => ({ status: "new", startedAt: null, submittedAt: null, examAnswers: {}, records: {}, writtenScores: {}, updatedAt: 0 });
    const store = { version: 1, updatedAt: 0, rounds: Object.fromEntries([1, 2, 3, 4, 5].map(n => [n, blank()])) };
    const q = window.EXAM_DATA.questions.find(q => q.id === id);
    const old = window.EXAM_ORIGINAL_DATA.questions.find(q => q.id === id);
    if (edition) {
      store.rounds[1].status = "in_progress";
      store.rounds[1].contentRevision = edition;
      store.rounds[1].startedAt = Date.now();
      for (const question of window.GYOSEI_CONTENT.getExam(edition).questions.filter(q => q.id < id)) store.rounds[1].examAnswers[question.id] = { value: question.answer, confidence: "" };
    } else {
      store.rounds[1].records[id] = { answer: q.type === "multi" ? { ア: 1, イ: 2, ウ: 3, エ: 4 } : "旧答案", source: "review", status: "ng", earned: 0, max: q.type === "multi" ? 8 : 20, answeredAt: 20, confidence: "unsure" };
    }
    const ids = window.EXAM_DATA.questions.map(q => q.id);
    const learning = window.GYOSEI_LEARNING_V2.blankStore(ids);
    learning.learning.answeredQuestionIds = ids.filter(n => n < id);
    localStorage.setItem(key, JSON.stringify(store));
    localStorage.setItem(window.GYOSEI_LEARNING_V2.STORAGE_KEY, JSON.stringify(learning));
    return { current: q, oldPrompt: old.prompt, previous: window.GYOSEI_CONTENT.getExam(edition).questions.find(q => q.id === id).prompt };
  }, { id, edition, key: KEY });
  await page.reload(); return expected;
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}
async function pick(page, id) {
  await page.locator(".question-picker summary").click();
  await page.locator(".number-grid button").filter({ hasText: new RegExp(`^${id}$`) }).click();
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route("https://**/*", route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("dialog", dialog => dialog.accept());
    for (const id of [41, 42, 43]) {
      const expected = await seed(page, id);
      await page.getByRole("button", { name: /続きから学習する/ }).click();
      assert.equal(await page.locator(".explanation").count(), 0);
      const reveal = page.getByRole("button", { name: "回答を確定して解説を見る" });
      await page.getByRole("button", { name: "自信あり", exact: true }).click();
      await page.locator("select").first().selectOption("1");
      assert.ok(await reveal.isDisabled(), "All four blanks required before revealing");
      for (const blank of expected.current.blanks) await page.locator(`[id="blank-${blank}"]`).selectOption("1");
      assert.ok(await reveal.isDisabled(), "Repeated candidate must not be accepted");
      for (const blank of expected.current.blanks) await page.locator(`[id="blank-${blank}"]`).selectOption(String(expected.current.answer[blank]));
      await page.locator('[id="blank-ア"]').selectOption("1");
      assert.ok(await reveal.isEnabled()); await reveal.click();
      assert.equal(await page.locator(".blank-explanation").count(), 4);
      assert.equal(await page.locator(".multi-option-explanation").count(), 20);
      await page.locator(".multi-option-explanations summary").click();
      assert.ok((await page.locator(".multi-option-explanations").innerText()).includes("法的に誤っているとは限りません"));
      assert.ok((await page.locator(".blank-explanation").first().innerText()).includes("あなたの解答：1"));
      const store = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
      assert.equal(store.rounds[1].records[id].earned, 6);
      assert.equal(store.rounds[1].records[id].contentRevision, "quality-2026-09-28-d");
      assert.ok(Object.values(store.contentArchives).some(a => a.questionId === id && a.record.answeredAt === 20));
      await noOverflow(page);
      if (id === 43) await page.screenshot({ path: "tools/quality-q43-mobile.png", fullPage: true });
    }
    for (const id of [44, 45, 46]) {
      const expected = await seed(page, id);
      await page.getByRole("button", { name: /続きから学習する/ }).click();
      assert.equal(await page.locator(".written-rubric").count(), 0);
      await page.locator("textarea").fill(expected.current.answer);
      const reveal = page.getByRole("button", { name: "回答を確定して解説を見る" });
      assert.ok(await reveal.isDisabled());
      await page.getByRole("button", { name: "自信あり", exact: true }).click(); await reveal.click();
      assert.equal(await page.locator(".rubric-element").count(), expected.current.rubric.length);
      assert.equal(await page.locator(".written-mistake").count(), 4);
      assert.equal(await page.locator(".accepted-answer").count(), 2);
      assert.ok((await page.locator(".written-rubric").innerText()).includes("公式の配点"));
      assert.ok((await page.locator(".written-rubric").innerText()).includes(`模範解答${Array.from(expected.current.answer).length}字`));
      if (id === 44) assert.ok((await page.locator(".content-correction").innerText()).includes("差止めも"));
      let score = page.getByRole("spinbutton", { name: `問題${id}の学習用得点`, exact: true });
      await score.fill("14"); await score.blur();
      let saved = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)).rounds[1], { key: KEY, id });
      assert.equal(saved.writtenScores[id], 14); assert.equal(saved.records[id].earned, 14); assert.equal(saved.records[id].status, "partial");
      score = page.getByRole("spinbutton", { name: `問題${id}の学習用得点`, exact: true });
      await score.fill(""); await score.blur();
      saved = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)).rounds[1], { key: KEY, id });
      assert.equal(saved.records[id].status, "pending"); assert.equal(saved.writtenScores[id], "");
      await page.getByRole("button", { name: "○ 正解相当", exact: true }).click();
      assert.equal(await page.getByRole("spinbutton", { name: `問題${id}の学習用得点`, exact: true }).inputValue(), "20");
      await noOverflow(page);
      if (id === 44) await page.screenshot({ path: "tools/quality-q44-mobile.png", fullPage: true });
      await page.setViewportSize({ width: 1280, height: 900 }); await noOverflow(page);
      await page.setViewportSize({ width: 390, height: 844 });
    }
    // A phase-C interrupted exam retains ALL six old questions, not just old singles.
    await seed(page, 41, "quality-2026-09-28-c");
    await page.getByRole("button", { name: /^通し試験を再開/ }).click();
    for (const id of [41, 42, 43, 44, 45, 46]) {
      if (id !== 41) await pick(page, id);
      const oldPrompt = await page.evaluate(id => window.GYOSEI_CONTENT.getExam("quality-2026-09-28-c").questions.find(q => q.id === id).prompt, id);
      assert.equal(await page.locator(".prompt").innerText(), oldPrompt);
      assert.equal(await page.locator(".explanation, .written-rubric, .multi-explanations, .content-correction, .history-mini").count(), 0);
    }
    await page.getByRole("button", { name: "終了", exact: true }).click(); await page.reload();
    await page.getByRole("button", { name: /^通し試験を再開/ }).click();
    assert.equal(await page.locator(".prompt").innerText(), await page.evaluate(() => window.GYOSEI_CONTENT.getExam("quality-2026-09-28-c").questions.find(q => q.id === 41).prompt));
    // Three multi questions are scored at 2 points per blank; written stays pending.
    await seed(page, 41, "quality-2026-09-28-d");
    await page.getByRole("button", { name: /^通し試験を再開/ }).click();
    for (const id of [41, 42, 43]) {
      if (id !== 41) await pick(page, id);
      const answer = await page.evaluate(id => window.EXAM_DATA.questions.find(q => q.id === id).answer, id);
      for (const [blank, value] of Object.entries(answer)) await page.locator(`[id="blank-${blank}"]`).selectOption(String(value));
    }
    await page.getByRole("button", { name: "終了", exact: true }).click(); await page.reload();
    await page.getByRole("button", { name: /^通し試験を再開/ }).click();
    assert.ok((await page.locator(".prompt").innerText()).includes("原告適格")); // first unanswered = 44
    await pick(page, 60); await page.getByRole("button", { name: "終了・一括採点", exact: true }).click();
    const records = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).rounds[1].records, KEY);
    for (const id of [41, 42, 43]) { assert.equal(records[id].earned, 8); assert.equal(records[id].contentRevision, "quality-2026-09-28-d"); }
    for (const id of [44, 45, 46]) assert.equal(records[id].status, "pending");
    await page.locator(".result-row").filter({ hasText: /^問44/ }).getByRole("button", { name: "確認", exact: true }).click();
    assert.equal(await page.locator(".written-rubric").count(), 1);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, additionalScreens: 6, multiCandidateReasons: 60, writtenRubrics: 3, incorrectReasons: 12, exactPartialScore: 14, oldEditionResume: true, multiTotal: 24, writtenPending: true, mobile: 390, desktop: 1280 }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
