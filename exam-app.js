(function () {
  const config = window.examAppConfig;
  const allQuestions = window.multiExamQuestionBank || [];
  const examQuestions = allQuestions.filter((q) => q.exam === config.exam);
  const questions = Array.isArray(config.questionIds)
    ? config.questionIds.map((id) => examQuestions.find((q) => q.id === id)).filter(Boolean)
    : examQuestions;
  const categories = [...new Set(questions.map((q) => q.category))];
  const storeKey = `study-app:${config.exam}:v1`;
  const initialState = {
    questions: {},
    cardsSeen: {},
    answered: 0,
    correct: 0,
    streak: 0,
    audioOn: false,
    speechRate: 1.4
  };
  const state = loadState();
  const els = {};
  let currentQuestion = questions[0];
  let cardIndex = 0;

  function loadState() {
    try {
      return { ...initialState, ...(JSON.parse(localStorage.getItem(storeKey)) || {}) };
    } catch {
      return { ...initialState };
    }
  }

  function save() {
    localStorage.setItem(storeKey, JSON.stringify(state));
  }

  function qs(id) {
    if (!state.questions[id]) state.questions[id] = { attempts: 0, correct: 0, wrong: 0, level: 0, dueAt: 0 };
    return state.questions[id];
  }

  function due(qn) {
    return qs(qn.id).dueAt <= Date.now();
  }

  function interval(level) {
    return [5, 30, 180, 1440, 4320, 10080][level] * 60 * 1000;
  }

  function setup() {
    document.title = `${config.title} スマホ学習`;
    document.body.dataset.theme = config.theme || "fp";
    bindElements();
    els.label.textContent = config.label;
    els.title.textContent = config.title;
    els.goal.textContent = config.goal;
    const options = ["全分野", ...categories].map((x) => `<option value="${x}">${x}</option>`).join("");
    els.category.innerHTML = options;
    els.cardCategory.innerHTML = options;
    els.mode.value = "first";
    document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
    els.category.addEventListener("change", pick);
    els.mode.addEventListener("change", pick);
    els.next.addEventListener("click", pick);
    els.reset.addEventListener("click", resetProgress);
    els.audioToggle.addEventListener("click", toggleAudio);
    els.stopAudio.addEventListener("click", stopAudio);
    els.readQuestion.addEventListener("click", () => speakQuestion(true));
    els.speed.addEventListener("input", () => {
      state.speechRate = Number(els.speed.value);
      save();
      renderAudio();
    });
    els.showCard.addEventListener("click", showCardAnswer);
    els.nextCard.addEventListener("click", () => {
      cardIndex += 1;
      renderCard();
    });
    els.prevCard.addEventListener("click", () => {
      cardIndex -= 1;
      renderCard();
    });
    document.querySelector("#subjectList").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-category]");
      if (!button) return;
      els.category.value = button.dataset.category;
      switchView("learn");
      pick();
    });
    els.speed.value = state.speechRate;
    pick();
    renderCard();
    renderStats();
    renderAudio();
  }

  function bindElements() {
    [
      "label", "title", "goal", "mastery", "done", "due", "streak", "coach", "category", "mode",
      "qCat", "qStats", "qText", "choices", "answer", "result", "explain", "next", "reset",
      "audioToggle", "stopAudio", "readQuestion", "speed", "speedLabel", "cardCategory",
      "flashCat", "flashFront", "flashBack", "showCard", "nextCard", "prevCard", "progressList",
      "subjectList"
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function pool() {
    const category = els.category.value;
    const mode = els.mode.value;
    let list = questions.filter((x) => category === "全分野" || x.category === category);
    if (mode === "first") list = list.filter((x) => qs(x.id).attempts === 0);
    if (mode === "weak") list = list.filter((x) => qs(x.id).wrong > 0 || qs(x.id).level < 2);
    if (mode === "due") list = list.filter(due);
    if (!list.length) list = questions.filter((x) => category === "全分野" || x.category === category);
    return list.sort((a, b) => qs(a.id).dueAt - qs(b.id).dueAt || qs(a.id).level - qs(b.id).level || a.id.localeCompare(b.id));
  }

  function pick() {
    currentQuestion = pool()[0] || questions[0];
    renderQuestion();
  }

  function renderQuestion() {
    const s = qs(currentQuestion.id);
    els.qCat.textContent = currentQuestion.category;
    els.qStats.textContent = `正解 ${s.correct} / ミス ${s.wrong}`;
    els.qText.textContent = currentQuestion.prompt;
    els.choices.innerHTML = "";
    els.answer.classList.add("hidden");
    currentQuestion.choices.forEach((choice, i) => {
      const button = document.createElement("button");
      button.className = "choice";
      button.type = "button";
      button.textContent = `${i + 1}. ${choice}`;
      button.addEventListener("click", () => answer(i));
      els.choices.appendChild(button);
    });
  }

  function answer(i) {
    const buttons = [...els.choices.querySelectorAll(".choice")];
    const ok = i === currentQuestion.answer;
    buttons.forEach((button) => {
      button.disabled = true;
    });
    buttons[currentQuestion.answer].classList.add("correct");
    if (!ok) buttons[i].classList.add("wrong");
    const s = qs(currentQuestion.id);
    s.attempts += 1;
    state.answered += 1;
    if (ok) {
      s.correct += 1;
      s.level = Math.min(5, s.level + 1);
      s.dueAt = Date.now() + interval(s.level);
      state.correct += 1;
      state.streak += 1;
    } else {
      s.wrong += 1;
      s.level = Math.max(0, s.level - 1);
      s.dueAt = Date.now() + 5 * 60 * 1000;
      state.streak = 0;
    }
    els.result.textContent = ok ? "正解です" : "不正解です";
    els.explain.textContent = currentQuestion.explain;
    els.answer.classList.remove("hidden");
    save();
    renderStats();
    speakAnswer(ok);
  }

  function cards() {
    return questions.map((q) => ({
      id: q.id,
      category: q.category,
      front: q.prompt,
      back: `${q.choices[q.answer]}。${q.explain}`
    }));
  }

  function cardPool() {
    const category = els.cardCategory.value || "全分野";
    return cards().filter((x) => category === "全分野" || x.category === category);
  }

  function renderCard() {
    const list = cardPool();
    if (cardIndex >= list.length) cardIndex = 0;
    if (cardIndex < 0) cardIndex = list.length - 1;
    const card = list[cardIndex];
    els.flashCat.textContent = card.category;
    els.flashFront.textContent = card.front;
    els.flashBack.textContent = card.back;
    els.flashBack.classList.add("hidden");
    state.cardsSeen[card.id] = true;
    save();
    renderStats();
  }

  function showCardAnswer() {
    els.flashBack.classList.remove("hidden");
    speak(`${els.flashFront.textContent}。答え。${els.flashBack.textContent}`, true);
  }

  function switchView(name) {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === name));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    document.getElementById(`${name}View`).classList.add("active");
    if (name === "cards") renderCard();
    if (name === "progress") renderStats();
  }

  function renderStats() {
    const doneQuestions = questions.filter((x) => qs(x.id).attempts > 0).length;
    const levelSum = questions.reduce((sum, x) => sum + qs(x.id).level, 0);
    const mastery = Math.round(levelSum / (questions.length * 5) * 100);
    const dueCount = questions.filter(due).length;
    const firstRate = Math.round(doneQuestions / questions.length * 100);
    els.mastery.textContent = `${mastery}%`;
    els.done.textContent = `${firstRate}%`;
    els.due.textContent = dueCount;
    els.streak.textContent = state.streak;
    els.coach.textContent = coach(firstRate, mastery, dueCount);
    renderProgress(firstRate, mastery);
  }

  function coach(firstRate, mastery, dueCount) {
    if (firstRate < 100) return `まずは一周です。現在${firstRate}%完了。正答率より、未回答を全部つぶすことを優先しましょう。`;
    if (dueCount > 0) return `一周完了。復習対象が${dueCount}問あります。今日はミスと低理解度を優先すると伸びます。`;
    if (mastery < 60) return "一周済みです。苦手優先で2周目に入り、解説を声に出して確認しましょう。";
    return "良い状態です。本番前は全分野モードで速度を上げて、反射的に選べる問題を増やしましょう。";
  }

  function renderProgress(firstRate, mastery) {
    const header = `<article class="progress-item panel"><div class="progress-head"><span>全体</span><span>${firstRate}%一周</span></div><div class="bar"><span style="width:${firstRate}%"></span></div><p class="small">理解度 ${mastery}% / 問題数 ${questions.length}問。まず一周、その後に苦手優先で仕上げます。</p></article>`;
    els.progressList.innerHTML = header + categories.map((category) => {
      const list = questions.filter((x) => x.category === category);
      const touched = list.filter((x) => qs(x.id).attempts > 0).length;
      const pct = percent(touched, list.length);
      const wrong = list.reduce((sum, x) => sum + qs(x.id).wrong, 0);
      const level = list.reduce((sum, x) => sum + qs(x.id).level, 0);
      const subjectMastery = list.length ? Math.round(level / (list.length * 5) * 100) : 0;
      return `<article class="progress-item panel"><div class="progress-head"><span>${category}</span><span>${pct}%</span></div><div class="bar"><span style="width:${pct}%"></span></div><p class="small">理解度 ${subjectMastery}% / ミス ${wrong}回 / ${touched}/${list.length}問</p></article>`;
    }).join("");
    els.subjectList.innerHTML = categories.map((category) => {
      const list = questions.filter((x) => x.category === category);
      const touched = list.filter((x) => qs(x.id).attempts > 0).length;
      return `<article class="subject-row panel"><div><strong>${category}</strong><div class="subject-stats"><span>${touched}/${list.length}問</span><span>${percent(touched, list.length)}%一周</span></div></div><button type="button" data-category="${category}">出題</button></article>`;
    }).join("");
  }

  function percent(done, total) {
    if (!total) return 0;
    return Math.round(done / total * 100);
  }

  function speechSupported() {
    return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  function toggleAudio() {
    if (!speechSupported()) return;
    state.audioOn = !state.audioOn;
    save();
    renderAudio();
    if (state.audioOn) speak("音声をオンにしました。問題と解説を読み上げます。", true);
    else stopAudio();
  }

  function stopAudio() {
    if (speechSupported()) window.speechSynthesis.cancel();
  }

  function renderAudio() {
    els.audioToggle.textContent = state.audioOn ? "音声ON" : "音声OFF";
    els.speedLabel.textContent = `${Number(state.speechRate).toFixed(1)}倍`;
  }

  function actualSpeechRate() {
    const shownRate = Math.min(3, Math.max(0.8, Number(state.speechRate) || 1));
    if (shownRate <= 1) return shownRate;
    return 1 + (shownRate - 1) * 0.45;
  }

  function speak(text, force) {
    if (!speechSupported()) return;
    if (!force && !state.audioOn) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = actualSpeechRate();
    window.speechSynthesis.speak(utterance);
  }

  function speakQuestion(force) {
    const choices = currentQuestion.choices.map((choice, index) => `${index + 1}番。${choice}`).join("。");
    speak(`${currentQuestion.category}の問題です。${currentQuestion.prompt}。選択肢。${choices}`, force);
  }

  function speakAnswer(ok) {
    const correct = currentQuestion.choices[currentQuestion.answer];
    speak(`${ok ? "正解" : "不正解"}です。答えは${currentQuestion.answer + 1}番、${correct}。${currentQuestion.explain}`, false);
  }

  function resetProgress() {
    if (!confirm(`${config.title}の学習記録をリセットしますか？`)) return;
    localStorage.removeItem(storeKey);
    location.reload();
  }

  setup();
})();
