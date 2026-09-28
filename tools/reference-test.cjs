"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");
const base = process.env.APP_URL || "http://127.0.0.1:8771/";
global.window = {};
require("../reference-data.js");
require("../transfer-content.js");
require("../data.js");
const data = window.GYOSEI_REFERENCE_DATA;
const ids = new Set(data.lessons.map(lesson => lesson.id));
assert.equal(ids.size, data.lessons.length, "duplicate lesson ID");
for (const item of [...data.periods, ...data.glossary]) assert(ids.has(item.lesson), `invalid lesson ${item.lesson}`);
for (const lesson of data.lessons) {
  for (const question of lesson.questions) assert(window.EXAM_DATA.questions.some(item => item.id === question), `invalid question ${question}`);
  for (const source of lesson.refs) assert.equal(new URL(source.url).hostname, "laws.e-gov.go.jp");
}
async function noOverflow(page, label) {
  const layout = await page.evaluate(() => ({ width: innerWidth, actual: document.documentElement.scrollWidth }));
  assert(layout.actual <= layout.width, `${label}: overflow ${JSON.stringify(layout)}`);
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route("https://**/*", route => route.abort());
    const page = await context.newPage();
    page.on("dialog", dialog => dialog.accept());
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base);
    await page.getByRole("button", { name: "科目別ミニ参考書", exact: true }).click();
    assert.equal(await page.locator(".reference-card").count(), data.lessons.length);
    for (const lesson of data.lessons) {
      const card = page.locator(".reference-card").filter({ has: page.getByRole("heading", { name: lesson.title, exact: true }) });
      await card.getByRole("button", { name: "この章を読む", exact: true }).click();
      await page.getByRole("heading", { level: 2, name: lesson.title, exact: true }).waitFor();
      assert.equal(await page.locator(".reference-section").count(), lesson.sections.length);
      assert.equal(await page.getByRole("button", { name: /^(読み上げ|停止)$/ }).count(), 0, "speech controls removed");
      assert.equal(await page.getByRole("combobox", { name: "読み上げ速度" }).count(), 0, "speech speed removed");
      await noOverflow(page, lesson.id);
      await page.getByRole("button", { name: "科目一覧へ", exact: true }).click();
    }
    await page.getByRole("button", { name: "期間・時効", exact: true }).click();
    assert.equal(await page.locator(".reference-card").count(), 13);
    await page.getByRole("searchbox", { name: "教材を検索" }).fill("不法行為");
    assert.equal(await page.locator(".reference-card").count(), 3);
    await page.getByRole("searchbox", { name: "教材を検索" }).fill("３か月");
    assert.equal(await page.locator(".reference-card").count(), 2, "NFKC search");
    await page.getByRole("searchbox", { name: "教材を検索" }).fill("");
    await page.getByRole("combobox", { name: "科目で絞り込む" }).selectOption("行政");
    assert.equal(await page.locator(".reference-card").count(), 3);
    await noOverflow(page, "periods");
    await page.screenshot({ path: path.join(__dirname, "reference-periods-mobile.png"), fullPage: true });
    await page.getByRole("button", { name: "用語集", exact: true }).click();
    await page.getByRole("searchbox", { name: "教材を検索" }).fill("裁決");
    assert(await page.locator(".reference-card").count() > 0);
    await page.getByRole("button", { name: "重要論点", exact: true }).click();
    assert.equal(await page.locator(".reference-card").count(), data.lessons.length);
    await page.getByRole("button", { name: "科目別参考書", exact: true }).click();
    await page.getByRole("searchbox", { name: "教材を検索" }).fill("原処分主義");
    await page.getByRole("button", { name: "この章を読む", exact: true }).click();
    await page.screenshot({ path: path.join(__dirname, "reference-cancel-mobile.png"), fullPage: true });
    await page.getByRole("button", { name: "問21", exact: true }).click();
    const radio = page.locator('input[name="answer"]').first();
    const selected = await radio.getAttribute("value");
    await radio.check();
    await page.getByRole("button", { name: "自信あり", exact: true }).click();
    const before = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([key]) => !key.startsWith("gyosei2026_transfer_")))));
    await page.getByText("用語・基本から確認する", { exact: true }).click();
    await page.getByRole("button", { name: "処分の取消しと裁決の取消しはどう違う？", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "問21", exact: true }).count(), 0, "related launch must not replace active draft");
    await page.getByRole("button", { name: "問題へ戻る", exact: true }).click();
    assert.equal(await page.locator('input[name="answer"]:checked').getAttribute("value"), selected);
    assert(await page.getByRole("button", { name: "自信あり", exact: true }).evaluate(element => element.classList.contains("active")));
    assert.equal(await page.locator(".explanation").count(), 0);
    assert.equal(await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([key]) => !key.startsWith("gyosei2026_transfer_"))))), before, "reading must not save original answer or advance cycle");
    await page.locator(".bottom-nav .main").click();
    assert.equal(await page.locator(".explanation").count(), 1);
    await page.getByText("用語・基本から確認する", { exact: true }).click();
    await page.getByRole("button", { name: "処分の取消しと裁決の取消しはどう違う？", exact: true }).click();
    await page.getByRole("button", { name: "問題へ戻る", exact: true }).click();
    assert.equal(await page.locator(".explanation").count(), 1, "revealed state preserved");
    await page.getByRole("button", { name: "終了", exact: true }).click();
    await page.getByRole("button", { name: /^通し試験を始める/ }).click();
    await page.getByRole("button", { name: "終了", exact: true }).waitFor();
    assert.equal(await page.locator(".reference-question-links").count(), 0, "no reference in exam");
    assert.equal(await page.locator(".explanation").count(), 0);
    await page.getByRole("button", { name: "終了", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "科目別ミニ参考書", exact: true }).click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("button", { name: "処分・裁決とは？ ここから読む", exact: true }).click();
    await noOverflow(page, "desktop");
    await page.screenshot({ path: path.join(__dirname, "reference-map-desktop.png"), fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`PASS: ${data.lessons.length} lessons, search/filter, periods, question draft/reveal preservation, no exam guide, mobile/desktop layout.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
