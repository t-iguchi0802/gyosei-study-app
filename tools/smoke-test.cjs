const { chromium } = require("playwright");

const base = process.env.APP_URL || "http://127.0.0.1:8765/";

function check(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on("dialog", dialog => dialog.accept());

  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  check(await page.getByRole("button", { name: "Googleでログインして同期" }).isVisible(), "Google同期ボタンが見つからない");
  check(await page.getByText("同期コード", { exact: false }).count() === 0, "旧同期コードUIが残っている");
  check(await page.getByRole("button", { name: /続きから学習する/ }).isVisible(), "続きから学習ボタンが見つからない");
  await page.getByRole("button", { name: /続きから学習する/ }).click();
  check(await page.locator(".question-card").count() === 1, "復習画面に複数問題が表示されている");
  check(await page.locator(".bottom-nav .nav-button").count() === 2, "復習画面の下部ボタンが2個でない");
  check(await page.locator(".explanation").count() === 0, "回答前に解説が表示されている");
  check(await page.locator(".history-mini").count() === 0, "回答前に履歴が表示されている");
  await page.screenshot({ path: "tools/review-before-mobile.png", fullPage: true });

  const firstAnswer = page.locator('input[name="answer"]').first();
  await firstAnswer.scrollIntoViewIfNeeded();
  const yBefore = await page.evaluate(() => scrollY);
  await firstAnswer.check();
  const yAfter = await page.evaluate(() => scrollY);
  check(Math.abs(yBefore - yAfter) <= 1, `選択時にスクロール位置が変化した: ${yBefore} -> ${yAfter}`);
  const revealButton = page.getByRole("button", { name: "回答を確定して解説を見る" });
  check(await revealButton.isDisabled(), "自信度を選ぶ前に回答確定できてしまう");
  const unsure = page.getByRole("button", { name: "迷いあり" });
  await unsure.scrollIntoViewIfNeeded();
  const confidenceY = await page.evaluate(() => scrollY);
  await unsure.click();
  const confidenceAfterY = await page.evaluate(() => scrollY);
  check(Math.abs(confidenceY - confidenceAfterY) <= 1, `自信度選択時にスクロール位置が変化した: ${confidenceY} -> ${confidenceAfterY}`);
  check(await revealButton.isEnabled(), "回答と自信度を選んでも回答確定できない");
  check(await page.locator(".explanation").count() === 0, "ボタン前に解説が表示された");

  await revealButton.click();
  check(await page.locator(".explanation").count() === 1, "現在問題の解説が1件表示されていない");
  check(await page.locator(".question-card").count() === 1, "解説後に複数問題が表示された");
  check(await page.locator(".detail-toggle:not([open])").count() === 1, "詳細解説が初期状態で閉じていない");
  check(await page.locator(".history-mini").count() === 1, "解答後に5回履歴が表示されない");
  await page.screenshot({ path: "tools/review-after-mobile.png", fullPage: true });

  for (let questionNumber = 2; questionNumber <= 5; questionNumber++) {
    await page.getByRole("button", { name: "次の問題" }).click();
    check((await page.locator(".question-number").textContent()).includes(`問題 ${questionNumber}`), `問題${questionNumber}へ進めない`);
    check(await page.locator(".explanation").count() === 0, "次問で前問の解説が残っている");
    await page.locator('input[name="answer"]').first().check();
    await page.getByRole("button", { name: "自信あり" }).click();
    await page.getByRole("button", { name: "回答を確定して解説を見る" }).click();
  }

  await page.getByRole("button", { name: "終了", exact: true }).click();
  check(await page.getByText("1周目・問6/60", { exact: true }).isVisible(), "ホームに問6からの再開位置が表示されない");
  await page.screenshot({ path: "tools/home-resume-mobile.png", fullPage: true });
  await page.reload({ waitUntil: "networkidle" });
  check(await page.getByText("1周目・問6/60", { exact: true }).isVisible(), "再読込後に問6の再開位置が残らない");
  await page.getByRole("button", { name: /続きから学習する/ }).click();
  check((await page.locator(".question-number").textContent()).includes("問題 6"), "保存位置の問6から再開できない");
  await page.getByRole("button", { name: "終了", exact: true }).click();
  await page.getByRole("button", { name: /通し試験を始める/ }).click();
  check(await page.locator(".explanation").count() === 0, "通し試験で解説が表示されている");
  check(await page.locator(".history-mini").count() === 0, "通し試験で履歴が表示されている");
  check(await page.locator(".bottom-nav .nav-button").count() === 2, "通し試験の下部ボタンが2個でない");
  check(await page.locator(".bottom-nav .nav-button", { hasText: /^次へ$/ }).count() === 1, "通し試験の「次へ」が1個でない");

  await page.locator(".question-picker summary").click();
  await page.locator(".number-grid button", { hasText: /^41$/ }).click();
  check(await page.locator(".multi-field").count() === 4, "多肢選択が4空欄でない");
  await page.locator(".question-picker summary").click();
  await page.locator(".number-grid button", { hasText: /^44$/ }).click();
  await page.locator("textarea").fill("行政庁に対して必要な措置を求める。行政庁はこれに応答する。");
  check((await page.locator(".char-count").textContent()).endsWith("字"), "記述式の字数表示がない");

  const overflow = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  check(overflow.scrollWidth <= overflow.innerWidth, `スマホ幅で横にはみ出す: ${JSON.stringify(overflow)}`);

  await page.screenshot({ path: "tools/smoke-mobile.png", fullPage: true });

  await page.locator(".question-picker summary").click();
  await page.locator(".number-grid button", { hasText: /^60$/ }).click();
  await page.getByRole("button", { name: "終了・一括採点" }).click();
  check(await page.getByRole("heading", { name: "一括採点結果" }).isVisible(), "一括採点結果へ遷移しない");
  check(await page.locator(".result-row").count() === 60, "一括採点結果が60問分でない");
  await page.locator(".result-row").first().getByRole("button", { name: "確認" }).click();
  check(await page.locator(".question-card").count() === 1 && await page.locator(".explanation").count() === 1, "結果から1問確認へ遷移できない");

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await desktop.goto(base, { waitUntil: "networkidle" });
  const desktopOverflow = await desktop.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  check(desktopOverflow.scrollWidth <= desktopOverflow.innerWidth, `PC幅で横にはみ出す: ${JSON.stringify(desktopOverflow)}`);
  await desktop.screenshot({ path: "tools/smoke-desktop.png", fullPage: true });

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("gyosei2026_mock1_learning_v1")));
  const learningV2 = await page.evaluate(() => JSON.parse(localStorage.getItem("gyosei2026_mock1_learning_v2")));
  check(stored && Object.keys(stored.rounds).length === 5, "5回分の保存領域がない");
  check(learningV2?.schemaVersion === 2, "v2学習状態が保存されていない");
  check(learningV2?.learning?.nextQuestionId === 6, "v2再開位置が問6になっていない");
  console.log(JSON.stringify({
    ok: true,
    mobile: overflow,
    desktop: desktopOverflow,
    rounds: Object.keys(stored.rounds).length,
    learningSchemaVersion: learningV2.schemaVersion,
    resumeQuestionId: learningV2.learning.nextQuestionId,
    reviewCurrentOnly: true,
    hiddenBeforeReveal: true
  }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
