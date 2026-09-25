(function () {
  "use strict";

  const EXAM = window.EXAM_DATA;
  const STORAGE_KEY = "gyosei2026_mock1_learning_v1";
  const app = document.getElementById("app");
  let auth = null;
  let db = null;
  const state = {
    view: "home",
    round: 1,
    mode: null,
    index: 0,
    revealed: false,
    reviewDraft: null,
    tick: null,
    sync: {
      user: null,
      status: "loading",
      message: "クラウド同期を確認中…",
      busy: false,
      pending: false,
      timer: null,
      unsubscribe: null,
    },
  };

  function blankRound() {
    return { status: "new", startedAt: null, submittedAt: null, examAnswers: {}, records: {}, writtenScores: {}, updatedAt: 0 };
  }

  function blankStore() {
    return { version: 1, updatedAt: 0, rounds: Object.fromEntries([1, 2, 3, 4, 5].map(n => [n, blankRound()])) };
  }

  function roundUpdatedAt(round) {
    const recordTimes = Object.values(round?.records || {}).map(record => Number(record?.answeredAt) || 0);
    return Math.max(Number(round?.updatedAt) || 0, Number(round?.submittedAt) || 0, Number(round?.startedAt) || 0, ...recordTimes, 0);
  }

  function normalizeStore(value) {
    const normalized = value && value.version === 1 && value.rounds ? value : blankStore();
    normalized.updatedAt = Number(normalized.updatedAt) || 0;
    for (let n = 1; n <= 5; n++) {
      normalized.rounds[n] ||= blankRound();
      normalized.rounds[n].updatedAt = roundUpdatedAt(normalized.rounds[n]);
    }
    return normalized;
  }

  function loadStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed && parsed.version === 1 && parsed.rounds) return normalizeStore(parsed);
    } catch (_) {}
    return blankStore();
  }

  let store = loadStore();

  function saveStore() {
    const now = Date.now();
    store.updatedAt = now;
    if (store.rounds[state.round]) store.rounds[state.round].updatedAt = now;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    scheduleSync();
  }
  function roundData() { return store.rounds[state.round]; }
  function q() { return EXAM.questions[state.index]; }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, className, onClick) {
    const node = el("button", className, text);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  }

  function syncStatus(status, message) {
    state.sync.status = status;
    state.sync.message = message;
    const label = document.querySelector(".sync-status");
    if (label) {
      label.className = `sync-status ${status}`;
      label.textContent = message;
    }
  }

  function cloneStore(value) {
    return JSON.parse(JSON.stringify(value || blankStore()));
  }

  function mergeStores(localValue, remoteValue) {
    const local = normalizeStore(cloneStore(localValue));
    const remote = normalizeStore(cloneStore(remoteValue));
    const merged = blankStore();
    for (let n = 1; n <= 5; n++) {
      const localTime = roundUpdatedAt(local.rounds[n]);
      const remoteTime = roundUpdatedAt(remote.rounds[n]);
      merged.rounds[n] = remoteTime > localTime ? remote.rounds[n] : local.rounds[n];
    }
    merged.updatedAt = Math.max(Number(local.updatedAt) || 0, Number(remote.updatedAt) || 0);
    return normalizeStore(merged);
  }

  function scheduleSync() {
    if (!state.sync.user || !db) return;
    clearTimeout(state.sync.timer);
    syncStatus("pending", "保存内容を同期待ち");
    state.sync.timer = setTimeout(() => syncNow(), 500);
  }

  async function syncNow() {
    if (!state.sync.user || !db) return;
    if (state.sync.busy) {
      state.sync.pending = true;
      return;
    }
    state.sync.busy = true;
    syncStatus("syncing", "同期中…");
    try {
      const reference = db.collection("users").doc(state.sync.user.uid).collection("mockExams").doc("mock1");
      await reference.set({
        data: store,
        clientUpdatedAt: Number(store.updatedAt) || Date.now(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      syncStatus("ok", `同期済み ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    } catch (error) {
      syncStatus("error", `${error.message}（端末内には保存済み）`);
    } finally {
      state.sync.busy = false;
      if (state.sync.pending) {
        state.sync.pending = false;
        scheduleSync();
      }
    }
  }

  function startCloudListener(user) {
    if (state.sync.unsubscribe) state.sync.unsubscribe();
    const reference = db.collection("users").doc(user.uid).collection("mockExams").doc("mock1");
    state.sync.unsubscribe = reference.onSnapshot(snapshot => {
      if (!snapshot.exists) {
        scheduleSync();
        return;
      }
      const remoteStore = snapshot.data()?.data;
      if (!remoteStore) return;
      const remoteText = JSON.stringify(normalizeStore(cloneStore(remoteStore)));
      const merged = mergeStores(store, remoteStore);
      const mergedText = JSON.stringify(merged);
      const localChanged = JSON.stringify(store) !== mergedText;
      store = merged;
      localStorage.setItem(STORAGE_KEY, mergedText);
      syncStatus("ok", "クラウドと同期済み");
      if (localChanged && state.view !== "solve") render();
      if (remoteText !== mergedText) scheduleSync();
    }, error => syncStatus("error", `${error.message}（端末内には保存済み）`));
  }

  async function signInGoogle() {
    if (!auth) return;
    syncStatus("syncing", "Googleログインを開いています…");
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const mobile = window.matchMedia("(max-width: 700px)").matches;
      if (mobile) await auth.signInWithRedirect(provider);
      else await auth.signInWithPopup(provider);
    } catch (error) {
      if (["auth/popup-blocked", "auth/cancelled-popup-request"].includes(error.code)) {
        await auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
      } else {
        syncStatus("error", error.message);
      }
    }
  }

  async function signOutGoogle() {
    if (auth) await auth.signOut();
  }

  function initializeFirebaseSync() {
    if (!window.firebase || !window.FIREBASE_CONFIG) {
      syncStatus("error", "Firebaseを読み込めません。端末内には保存できます");
      return;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
      auth.useDeviceLanguage();
      auth.getRedirectResult().catch(error => syncStatus("error", error.message));
      auth.onAuthStateChanged(user => {
        state.sync.user = user || null;
        if (user) {
          syncStatus("syncing", "クラウド履歴を確認中…");
          startCloudListener(user);
        } else {
          if (state.sync.unsubscribe) state.sync.unsubscribe();
          state.sync.unsubscribe = null;
          syncStatus("local", "この端末内に保存中");
        }
        if (state.view !== "solve") render();
      });
    } catch (error) {
      syncStatus("error", `${error.message}（端末内には保存できます）`);
    }
  }

  function answerExists(question, value) {
    if (question.type === "single") return value !== null && value !== undefined && value !== "";
    if (question.type === "multi") return value && question.blanks.some(key => value[key]);
    return Boolean(value && String(value).trim());
  }

  function emptyAnswer(question) {
    if (question.type === "multi") return Object.fromEntries(question.blanks.map(key => [key, ""]));
    return "";
  }

  function answerText(question, value) {
    if (!answerExists(question, value)) return "未解答";
    if (question.type === "multi") return question.blanks.map(k => `${k}:${value[k] || "－"}`).join(" / ");
    return String(value);
  }

  function correctText(question) {
    if (question.type === "multi") return question.blanks.map(k => `${k}:${question.answer[k]}`).join(" / ");
    return String(question.answer);
  }

  function evaluate(question, value) {
    if (question.type === "written") return { status: "pending", earned: null, max: 20 };
    if (question.type === "multi") {
      const correctCount = question.blanks.filter(k => Number(value?.[k]) === Number(question.answer[k])).length;
      return { status: correctCount === 4 ? "ok" : "ng", earned: correctCount * 2, max: 8, correctCount };
    }
    const ok = Number(value) === Number(question.answer);
    return { status: ok ? "ok" : "ng", earned: ok ? 4 : 0, max: 4 };
  }

  function roundStatusLabel(data) {
    if (data.status === "submitted") return "完了";
    if (data.status === "in_progress") return "途中";
    const count = Object.keys(data.records || {}).length;
    return count ? `${count}/60` : "未実施";
  }

  function render() {
    clearInterval(state.tick);
    state.tick = null;
    app.innerHTML = "";
    const shell = el("main", "app-shell");
    app.appendChild(shell);
    if (state.view === "home") renderHome(shell);
    else if (state.view === "solve") renderSolve(shell);
    else if (state.view === "results") renderResults(shell);
    else if (state.view === "history") renderHistory(shell);
  }

  function renderHome(shell) {
    const page = el("section", "home");
    page.append(el("p", "eyebrow", "令和8年度 行政書士試験"));
    page.append(el("h1", "", EXAM.title));
    page.append(el("p", "subtitle", `${EXAM.subtitle}｜全60問｜試験時間3時間`));

    const card = el("section", "home-card");
    card.append(el("h2", "", "学習回を選ぶ"));
    card.append(el("p", "subtitle", "問題を解いている間は、過去の正誤を表示しません。"));
    const rounds = el("div", "round-selector");
    for (let n = 1; n <= 5; n++) {
      const b = el("button", `round-button${state.round === n ? " active" : ""}`);
      b.type = "button";
      b.append(document.createTextNode(`${n}回目`));
      b.append(el("small", "", roundStatusLabel(store.rounds[n])));
      b.addEventListener("click", () => { state.round = n; render(); });
      rounds.append(b);
    }
    card.append(rounds);

    const modes = el("div", "mode-grid");
    const examBtn = button(roundData().status === "in_progress" ? "通し試験を再開" : "通し試験を始める", "primary", startExam);
    examBtn.append(el("span", "button-note", "終了するまで正解・解説・過去成績は表示しません"));
    const reviewBtn = button("1問ずつ復習する", "secondary", startReview);
    reviewBtn.append(el("span", "button-note", "1問だけ解き、ボタンを押した時だけ解答・解説を表示"));
    modes.append(examBtn, reviewBtn);
    card.append(modes);

    const actions = el("div", "home-actions");
    actions.append(button("5回の履歴を見る", "ghost", () => { state.view = "history"; render(); }));
    if (roundData().status === "submitted") {
      actions.append(button(`${state.round}回目の結果を見る`, "ghost", () => { state.view = "results"; render(); }));
    }
    actions.append(button("この回をリセット", "danger", resetCurrentRound));
    card.append(actions);
    page.append(card);
    page.append(renderSyncCard());
    shell.append(page);
  }

  function renderSyncCard() {
    const card = el("section", "sync-card");
    const heading = el("div", "sync-heading");
    const title = el("div");
    title.append(el("h2", "", "PC・スマホの学習履歴を共有"));
    title.append(el("p", "subtitle", "両方の端末で同じGoogleアカウントにログインすると、5回分の履歴が自動で同期されます。"));
    heading.append(title);
    card.append(heading);

    const status = el("p", `sync-status ${state.sync.status}`, state.sync.message);
    card.append(status);

    if (state.sync.user) {
      const account = el("div", "sync-account");
      account.append(el("span", "sync-account-label", "ログイン中"));
      account.append(el("strong", "", state.sync.user.displayName || state.sync.user.email || "Googleアカウント"));
      if (state.sync.user.displayName && state.sync.user.email) account.append(el("small", "", state.sync.user.email));
      card.append(account);
      const actions = el("div", "sync-actions");
      actions.append(button("今すぐ同期", "secondary", syncNow));
      actions.append(button("ログアウト", "ghost", signOutGoogle));
      card.append(actions);
      card.append(el("p", "sync-note", "別の端末でも同じGoogleアカウントでログインしてください。ログアウトしても端末内の履歴は残ります。"));
    } else {
      const actions = el("div", "sync-actions");
      const login = button("Googleでログインして同期", "primary", signInGoogle);
      login.disabled = !auth;
      actions.append(login);
      card.append(actions);
      card.append(el("p", "sync-note", "ログイン前もこの端末内には保存されます。Googleログイン後、既存履歴とクラウド履歴を回ごとに統合します。"));
    }
    return card;
  }

  function startExam() {
    const data = roundData();
    if (data.status === "submitted") {
      const ok = confirm(`${state.round}回目は完了済みです。保存済みの解答を消して通し試験をやり直しますか？`);
      if (!ok) return;
      store.rounds[state.round] = blankRound();
    } else if (data.status !== "in_progress" && (Object.keys(data.records || {}).length || Object.keys(data.examAnswers || {}).length)) {
      const ok = confirm(`${state.round}回目の復習記録を消して、通し試験を開始しますか？`);
      if (!ok) return;
      store.rounds[state.round] = blankRound();
    }
    const fresh = roundData();
    if (fresh.status !== "in_progress") {
      fresh.status = "in_progress";
      fresh.startedAt = Date.now();
      fresh.examAnswers = {};
      fresh.records = {};
      fresh.writtenScores = {};
      saveStore();
    }
    state.mode = "exam";
    state.index = firstUnansweredIndex();
    state.revealed = false;
    state.view = "solve";
    render();
  }

  function firstUnansweredIndex() {
    const answers = roundData().examAnswers || {};
    const idx = EXAM.questions.findIndex(question => !answerExists(question, answers[question.id]?.value));
    return idx < 0 ? 0 : idx;
  }

  function startReview() {
    state.mode = "review";
    state.index = 0;
    state.revealed = false;
    state.reviewDraft = { value: emptyAnswer(EXAM.questions[0]), confidence: "" };
    state.view = "solve";
    render();
  }

  function resetCurrentRound() {
    const ok = confirm(`${state.round}回目の解答・正誤・自信度をすべて消します。よろしいですか？`);
    if (!ok) return;
    store.rounds[state.round] = blankRound();
    saveStore();
    render();
  }

  function currentDraft() {
    if (state.mode === "review") {
      if (!state.reviewDraft) state.reviewDraft = { value: emptyAnswer(q()), confidence: "" };
      return state.reviewDraft;
    }
    const data = roundData();
    data.examAnswers[q().id] ||= { value: emptyAnswer(q()), confidence: "" };
    return data.examAnswers[q().id];
  }

  function renderSolve(shell) {
    const question = q();
    const draft = currentDraft();
    const header = el("header", "solve-header");
    header.append(button("終了", "ghost", exitSolve));
    const title = el("div", "solve-title");
    title.append(el("strong", "", state.mode === "exam" ? "通し試験" : "1問ずつ復習"));
    title.append(el("small", "", `${state.round}回目　問題${question.id}/60`));
    header.append(title);
    const right = el("div", "timer", state.mode === "exam" ? timerText() : `${state.index + 1}/60`);
    header.append(right);
    shell.append(header);
    const progress = el("div", "progress-line");
    const bar = el("span");
    bar.style.width = `${((state.index + 1) / 60) * 100}%`;
    progress.append(bar);
    shell.append(progress);

    if (state.mode === "exam") {
      state.tick = setInterval(() => { right.textContent = timerText(); }, 1000);
    }

    const wrap = el("div", "question-wrap");
    const card = el("article", "question-card");
    card.id = "current-question";
    const meta = el("div", "question-meta");
    meta.append(el("div", "question-number", `問題 ${question.id}`));
    meta.append(el("div", "question-subject", question.title || typeLabel(question)));
    card.append(meta);
    const prompt = el("div", "prompt");
    question.prompt.split(/\n\n+/).forEach(text => prompt.append(el("p", "", text)));
    card.append(prompt);
    card.append(renderAnswerInput(question, draft));
    card.append(renderConfidence(draft));
    if (state.revealed && state.mode === "review") card.append(renderExplanation(question, draft));

    if (state.mode === "exam") card.append(renderQuestionPicker());
    wrap.append(card);
    shell.append(wrap);
    shell.append(renderBottomNav());
  }

  function typeLabel(question) {
    return question.type === "single" ? "5肢択一" : question.type === "multi" ? "多肢選択" : "記述式";
  }

  function renderAnswerInput(question, draft) {
    if (question.type === "single") {
      const box = el("div", "choices");
      question.choices.forEach(choice => {
        const label = el("label", "choice");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "answer";
        input.value = choice.value;
        input.checked = Number(draft.value) === Number(choice.value);
        input.disabled = state.revealed;
        if (input.checked) label.classList.add("selected");
        if (state.revealed) {
          if (Number(choice.value) === Number(question.answer)) label.classList.add("correct");
          else if (input.checked) label.classList.add("wrong");
        }
        input.addEventListener("change", () => {
          draft.value = choice.value;
          persistDraft();
          box.querySelectorAll(".choice").forEach(item => {
            item.classList.toggle("selected", item.querySelector("input")?.checked === true);
          });
        });
        label.append(input, el("span", "choice-text", `${choice.value}. ${choice.label}`));
        box.append(label);
      });
      return box;
    }
    if (question.type === "multi") {
      const grid = el("div", "multi-grid");
      question.blanks.forEach(key => {
        const field = el("div", "multi-field");
        const label = el("label", "", key);
        label.htmlFor = `blank-${key}`;
        const select = document.createElement("select");
        select.id = `blank-${key}`;
        select.disabled = state.revealed;
        select.append(new Option("番号を選ぶ", ""));
        question.choices.forEach(choice => select.append(new Option(`${choice.value}. ${choice.label}`, choice.value)));
        select.value = draft.value?.[key] || "";
        select.addEventListener("change", () => {
          draft.value ||= {};
          draft.value[key] = select.value;
          persistDraft();
        });
        field.append(label, select);
        grid.append(field);
      });
      return grid;
    }
    const box = el("div", "written-answer");
    const area = document.createElement("textarea");
    area.placeholder = "40字程度で解答を入力";
    area.value = draft.value || "";
    area.disabled = state.revealed;
    const count = el("div", "char-count", `${area.value.length}字`);
    area.addEventListener("input", () => { draft.value = area.value; count.textContent = `${area.value.length}字`; persistDraft(); });
    box.append(area, count);
    return box;
  }

  function renderConfidence(draft) {
    const box = el("section", "confidence");
    box.append(el("div", "confidence-title", "この解答の感触（任意）"));
    const buttons = el("div", "confidence-buttons");
    for (const [value, label, css] of [["confident", "自信あり", "confident"], ["unsure", "迷いあり", "unsure"]]) {
      const b = button(label, `confidence-button ${css}${draft.confidence === value ? " active" : ""}`, () => {
        draft.confidence = draft.confidence === value ? "" : value;
        persistDraft();
        buttons.querySelectorAll(".confidence-button").forEach(item => item.classList.remove("active"));
        if (draft.confidence === value) b.classList.add("active");
      });
      b.disabled = state.revealed;
      buttons.append(b);
    }
    box.append(buttons);
    return box;
  }

  function persistDraft() {
    if (state.mode === "exam") saveStore();
  }

  function renderQuestionPicker() {
    const details = el("details", "question-picker");
    details.append(el("summary", "", "問題一覧を開く"));
    const grid = el("div", "number-grid");
    EXAM.questions.forEach((question, idx) => {
      const answered = answerExists(question, roundData().examAnswers?.[question.id]?.value);
      const b = button(String(question.id), `${answered ? "answered " : ""}${idx === state.index ? "current" : ""}`, () => goTo(idx));
      grid.append(b);
    });
    details.append(grid);
    return details;
  }

  function renderBottomNav() {
    const nav = el("nav", "bottom-nav");
    const inner = el("div", "bottom-nav-inner");
    const prev = button("前へ", "nav-button", () => goTo(state.index - 1));
    prev.disabled = state.index === 0;
    let main;
    if (state.mode === "review") {
      main = state.revealed
        ? button(state.index === 59 ? "復習を終える" : "次の問題", "nav-button main", () => state.index === 59 ? exitSolve() : goTo(state.index + 1))
        : button("解答・解説", "nav-button main", revealCurrent);
    } else if (state.index === 59) {
      main = button("終了・一括採点", "nav-button main", submitExam);
    } else {
      main = button("次へ", "nav-button main", () => goTo(state.index + 1));
    }
    inner.append(prev, main);
    nav.append(inner);
    return nav;
  }

  function goTo(index) {
    if (index < 0 || index >= EXAM.questions.length) return;
    state.index = index;
    state.revealed = false;
    if (state.mode === "review") state.reviewDraft = { value: emptyAnswer(q()), confidence: "" };
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function revealCurrent() {
    const question = q();
    const draft = currentDraft();
    const outcome = evaluate(question, draft.value);
    roundData().records[question.id] = {
      answer: draft.value,
      confidence: draft.confidence,
      status: outcome.status,
      earned: outcome.earned,
      max: outcome.max,
      source: "review",
      answeredAt: Date.now(),
    };
    saveStore();
    state.revealed = true;
    render();
    requestAnimationFrame(() => document.querySelector(".explanation")?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }

  function renderExplanation(question, draft) {
    const box = el("section", "explanation");
    const outcome = evaluate(question, draft.value);
    const banner = el("div", `result-banner ${outcome.status}`);
    const iconText = outcome.status === "ok" ? "○" : outcome.status === "ng" ? "×" : "記";
    banner.append(el("span", "result-icon", iconText));
    banner.append(el("span", "", outcome.status === "ok" ? "正解" : outcome.status === "ng" ? "不正解" : "記述式は自己採点"));
    box.append(banner);
    box.append(el("p", "answer-line", `あなたの解答：${answerText(question, draft.value)}`));
    box.append(el("p", "answer-line", `${question.type === "written" ? "模範解答" : "正解"}：${correctText(question)}`));
    if (question.type === "multi") box.append(el("p", "", `4空欄中 ${outcome.correctCount}空欄正解`));
    if (question.type === "written" && question.keywords?.length) {
      box.append(el("p", "", `必須キーワード：${question.keywords.join("／")}`));
      box.append(renderSelfGrade(question.id));
    }
    const core = el("div", "core-box");
    core.append(el("strong", "", "この問題の核心"));
    core.append(el("p", "", question.core || "解説を確認してください。"));
    box.append(core);
    const choiceExplanations = renderChoiceExplanations(question, draft);
    if (choiceExplanations) box.append(choiceExplanations);
    const precedent = renderPrecedentExplanation(question);
    if (precedent) box.append(precedent);
    box.append(renderDetailedExplanation(question));
    box.append(renderMiniHistory(question.id));
    return box;
  }

  function renderSelfGrade(questionId) {
    const box = el("div", "self-grade");
    box.append(el("p", "", "模範解答と比べて自己採点"));
    const buttons = el("div", "self-grade-buttons");
    [["ok", "○ 正解相当", 20], ["partial", "△ 部分点", 10], ["ng", "× 不正解", 0]].forEach(([status, label, score]) => {
      buttons.append(button(label, "", () => {
        const record = roundData().records[questionId];
        if (record) { record.status = status; record.earned = score; }
        saveStore();
        render();
      }));
    });
    box.append(buttons);
    return box;
  }

  const DETAIL_ORDER = [
    "アの理由", "イの理由", "ウの理由", "エの理由", "必須キーワード", "採点要素", "根拠条文", "関連条文", "関連判例",
    "なぜこの表現になるのか", "一緒に覚える周辺知識", "紛らわしい選択肢との違い", "典型的誤答", "部分点を失いやすいポイント",
    "出題者の罠", "解答テクニック", "別角度で出るなら"
  ];

  function normalizedSectionName(name) {
    return String(name || "").replace(/[\s　]+/g, "");
  }

  function choiceExplanationEntries(question) {
    return Object.entries(question.sections || {}).map(([name, text]) => {
      const match = normalizedSectionName(name).match(/^肢(\d+)([×○])$/);
      return match ? { name, text, number: Number(match[1]), mark: match[2] } : null;
    }).filter(Boolean).sort((a, b) => a.number - b.number);
  }

  function renderChoiceExplanations(question, draft) {
    if (question.type !== "single") return null;
    const entries = choiceExplanationEntries(question);
    if (!entries.length) return null;
    const section = el("section", "choice-explanations");
    section.append(el("h2", "", "全肢の解説"));
    entries.forEach(entry => {
      const selected = Number(draft.value) === entry.number;
      const item = el("article", `choice-explanation ${entry.mark === "○" ? "is-correct" : "is-wrong"}${selected ? " is-selected" : ""}`);
      const suffix = selected ? "（あなたの解答）" : "";
      item.append(el("h3", "", `肢${entry.number} ${entry.mark}${suffix}`));
      const choice = question.choices?.find(candidate => Number(candidate.value) === entry.number);
      if (choice?.label) item.append(el("p", "choice-explanation-text", choice.label));
      item.append(el("p", "choice-explanation-reason", entry.text));
      if (entry.mark === "×") item.append(renderTrapNote(choice?.label || "", entry.text));
      section.append(item);
    });
    return section;
  }

  const TRAP_WORDS = [
    "絶対に", "絶対", "必ず", "常に", "一切", "例外なく", "無条件に", "無条件",
    "当然に", "直ちに", "自動的に", "全て", "すべて", "一律に", "いかなる場合も",
    "のみで", "だけで", "問わず", "余地はない"
  ];

  function renderTrapNote(choiceText, explanation) {
    const foundWords = [...new Set(TRAP_WORDS.filter(word => choiceText.includes(word)))];
    const note = el("div", "trap-note");
    note.append(el("strong", "trap-label", "ひっかけポイント"));
    if (foundWords.length) {
      note.append(el("p", "", `注意語「${foundWords.join("・")}」による強い断定です。例外や追加要件を消している可能性があります。ただし、注意語だけで誤りとは決めず、上の正しい要件と照合します。`));
      return note;
    }
    const text = String(explanation || "");
    let message = "正しい知識の一部分を使いながら、対象・要件・効果のどこかをずらした肢です。上の説明で、どこが変えられたかを確認します。";
    if (/結論と逆|逆である|反対の結論|逆転/.test(text)) {
      message = "判例・条文の結論を逆にした肢です。結論だけでなく、理由と適用条件もセットで覚えます。";
    } else if (/混同|別問題|区別|異なる制度|同一ではない/.test(text)) {
      message = "似た制度・主体・法的効果を入れ替えるひっかけです。何と何を区別する問題かを確認します。";
    } else if (/要件|加えて|に加え|足りない|一つだけ|一部.*落/.test(text)) {
      message = "必要な要件の一部を省く、または別の要件に置き換えるひっかけです。要件を一つずつ照合します。";
    } else if (/範囲|一律|一般化|広げ|拡張|当然|直ち|機械的|全て|すべて/.test(text)) {
      message = "適用範囲を広げすぎる、または例外を消すひっかけです。誰に・どの場面で適用されるかを確認します。";
    } else if (/時点|施行|期限|日付|経過措置/.test(text)) {
      message = "基準時・施行日・期限を入れ替えるひっかけです。日付を時間軸に置いて確認します。";
    }
    note.append(el("p", "", message));
    return note;
  }

  function hasConcretePrecedent(text) {
    if (!text || /^(なし|判例なし)[。．]?$/.test(text.trim())) return false;
    if (/^(条文中心|特定判例|一般理論|制度・|制定法律|法務省|統計定義)/.test(text.trim())) return false;
    return /最高裁|大法廷|小法廷|判決|事件/.test(text);
  }

  function renderPrecedentExplanation(question) {
    const text = question.sections?.["関連判例"];
    if (!hasConcretePrecedent(text)) return null;
    const section = el("section", "precedent-explanation");
    section.append(el("h2", "", "関連する最高裁判例・裁判例"));
    section.append(el("p", "", text));
    return section;
  }

  function renderDetailedExplanation(question) {
    const details = el("details", "detail-toggle");
    details.append(el("summary", "", "ひっかけ・解答テクニック・周辺知識を見る"));
    const seen = new Set();
    DETAIL_ORDER.forEach(name => {
      const entry = Object.entries(question.sections || {}).find(([sectionName]) => normalizedSectionName(sectionName) === normalizedSectionName(name));
      if (!entry) return;
      const [actualName, text] = entry;
      if (!text || seen.has(actualName)) return;
      if (actualName === "関連判例" && hasConcretePrecedent(text)) return;
      seen.add(actualName);
      const section = el("section", "detail-section");
      section.append(el("h3", "", actualName));
      section.append(el("p", "", text));
      details.append(section);
    });
    return details;
  }

  function renderMiniHistory(questionId) {
    const box = el("div", "history-mini");
    box.append(document.createTextNode("5回の履歴（解答後のみ表示）"));
    const dots = el("span", "history-dots");
    for (let n = 1; n <= 5; n++) {
      const record = store.rounds[n].records?.[questionId];
      const status = record?.status;
      const label = status === "ok" ? "○" : status === "ng" ? "×" : status === "partial" ? "△" : "－";
      dots.append(el("span", `history-dot ${status || ""}`, label));
    }
    box.append(dots);
    return box;
  }

  function timerText() {
    const start = roundData().startedAt || Date.now();
    const remaining = Math.max(0, EXAM.timeMinutes * 60 - Math.floor((Date.now() - start) / 1000));
    const h = String(Math.floor(remaining / 3600)).padStart(2, "0");
    const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
    const s = String(remaining % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function exitSolve() {
    state.view = "home";
    state.mode = null;
    state.revealed = false;
    render();
    window.scrollTo({ top: 0 });
  }

  function submitExam() {
    const answers = roundData().examAnswers || {};
    const unanswered = EXAM.questions.filter(question => !answerExists(question, answers[question.id]?.value)).length;
    const message = unanswered
      ? `未解答が${unanswered}問あります。終了して一括採点しますか？`
      : "試験を終了して一括採点しますか？終了後は正答・解説が表示されます。";
    if (!confirm(message)) return;
    const data = roundData();
    data.records = {};
    EXAM.questions.forEach(question => {
      const draft = answers[question.id] || { value: emptyAnswer(question), confidence: "" };
      const outcome = evaluate(question, draft.value);
      data.records[question.id] = {
        answer: draft.value,
        confidence: draft.confidence,
        status: outcome.status,
        earned: outcome.earned,
        max: outcome.max,
        source: "exam",
        answeredAt: Date.now(),
      };
    });
    data.status = "submitted";
    data.submittedAt = Date.now();
    saveStore();
    state.view = "results";
    state.mode = null;
    render();
    window.scrollTo({ top: 0 });
  }

  function scoreSummary() {
    const records = roundData().records || {};
    let auto = 0, written = 0, pending = 0, correct = 0, wrong = 0, unsure = 0;
    EXAM.questions.forEach(question => {
      const record = records[question.id];
      if (!record) return;
      if (question.type === "written") {
        const value = roundData().writtenScores?.[question.id];
        if (value === undefined || value === "") pending++;
        else written += Number(value) || 0;
      } else auto += Number(record.earned) || 0;
      if (record.status === "ok") correct++;
      else if (record.status === "ng") wrong++;
      if (record.confidence === "unsure") unsure++;
    });
    return { auto, written, pending, total: auto + written, correct, wrong, unsure };
  }

  function renderResults(shell) {
    const page = el("section", "results");
    const head = el("div", "results-header");
    const title = el("div");
    title.append(el("p", "eyebrow", `${state.round}回目`), el("h1", "", "一括採点結果"));
    head.append(title, button("ホーム", "ghost", () => { state.view = "home"; render(); }));
    page.append(head);
    page.append(renderScoreCard());
    page.append(renderWrittenScores());

    const list = el("section", "result-list");
    list.append(el("h2", "", "問題別結果"));
    EXAM.questions.forEach((question, idx) => {
      const record = roundData().records?.[question.id];
      const row = el("div", "result-row");
      row.append(el("strong", "", `問${question.id}`));
      const status = record?.status || "pending";
      const label = status === "ok" ? "○ 正解" : status === "ng" ? "× 不正解" : status === "partial" ? "△ 部分点" : "記述・未採点";
      const text = el("span", `result-status ${status}`, label + (record?.confidence === "unsure" ? "／迷いあり" : ""));
      row.append(text);
      row.append(button("確認", "small-button", () => {
        state.mode = "review";
        state.index = idx;
        state.reviewDraft = { value: record?.answer ?? emptyAnswer(question), confidence: record?.confidence || "" };
        state.revealed = true;
        state.view = "solve";
        render();
        window.scrollTo({ top: 0 });
      }));
      list.append(row);
    });
    page.append(list);
    shell.append(page);
  }

  function renderScoreCard() {
    const s = scoreSummary();
    const card = el("section", "score-card");
    card.append(el("div", "score-main", `${s.total} / 300点`));
    card.append(el("div", "score-sub", s.pending ? `自動採点 ${s.auto}/240点　記述式${s.pending}問は自己採点してください` : `自動採点 ${s.auto}/240点＋記述 ${s.written}/60点`));
    const stats = el("div", "result-stats");
    [[s.correct, "正解"], [s.wrong, "不正解"], [s.unsure, "迷いあり"]].forEach(([value, label]) => {
      const stat = el("div", "stat");
      stat.append(el("strong", "", String(value)), document.createTextNode(label));
      stats.append(stat);
    });
    card.append(stats);
    return card;
  }

  function renderWrittenScores() {
    const card = el("section", "written-score-card");
    card.append(el("h2", "", "記述式の自己採点"));
    card.append(el("p", "subtitle", "模範解答を確認し、各問0～20点で入力してください。"));
    [44, 45, 46].forEach(id => {
      const row = el("div", "written-score-row");
      row.append(el("strong", "", `問題${id}`));
      row.append(button("解答を確認", "small-button", () => {
        const idx = EXAM.questions.findIndex(question => question.id === id);
        const record = roundData().records[id];
        state.mode = "review";
        state.index = idx;
        state.reviewDraft = { value: record?.answer || "", confidence: record?.confidence || "" };
        state.revealed = true;
        state.view = "solve";
        render();
      }));
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = "20";
      input.step = "1";
      input.placeholder = "0～20";
      input.value = roundData().writtenScores?.[id] ?? "";
      input.setAttribute("aria-label", `問題${id}の得点`);
      input.addEventListener("change", () => {
        const value = Math.max(0, Math.min(20, Number(input.value)));
        roundData().writtenScores[id] = value;
        const record = roundData().records[id];
        if (record) { record.earned = value; record.status = value === 20 ? "ok" : value === 0 ? "ng" : "partial"; }
        saveStore();
        render();
      });
      row.append(input);
      card.append(row);
    });
    return card;
  }

  function renderHistory(shell) {
    const page = el("section", "history-view");
    const head = el("div", "history-header");
    const title = el("div");
    title.append(el("p", "eyebrow", "全5回"), el("h1", "", "問題別の正誤履歴"));
    head.append(title, button("ホーム", "ghost", () => { state.view = "home"; render(); }));
    page.append(head);
    page.append(el("p", "legend", "○ 正解　△ 部分点　× 不正解　－ 未実施　※この画面は解答中には表示されません。"));
    const wrap = el("div", "history-table-wrap");
    const table = el("table", "history-table");
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    ["問題", "1回目", "2回目", "3回目", "4回目", "5回目"].forEach(text => hr.append(el("th", "", text)));
    thead.append(hr);
    table.append(thead);
    const tbody = document.createElement("tbody");
    EXAM.questions.forEach(question => {
      const tr = document.createElement("tr");
      tr.append(el("td", "", String(question.id)));
      for (let n = 1; n <= 5; n++) {
        const record = store.rounds[n].records?.[question.id];
        const mark = record?.status === "ok" ? "○" : record?.status === "ng" ? "×" : record?.status === "partial" ? "△" : "－";
        const td = el("td", record?.status || "", mark + (record?.confidence === "unsure" ? "※" : ""));
        td.title = record?.confidence === "unsure" ? "迷いあり" : record?.confidence === "confident" ? "自信あり" : "";
        tr.append(td);
      }
      tbody.append(tr);
    });
    table.append(tbody);
    wrap.append(table);
    page.append(wrap);
    shell.append(page);
  }

  render();
  initializeFirebaseSync();
})();
