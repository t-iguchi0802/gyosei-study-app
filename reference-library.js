(function () {
  "use strict";
  const DATA = window.GYOSEI_REFERENCE_DATA;
  const node = (tag, css, text) => {
    const value = document.createElement(tag);
    if (css) value.className = css;
    if (text !== undefined) value.textContent = text;
    return value;
  };
  const action = (text, css, handler) => {
    const value = node("button", css, text);
    value.type = "button";
    value.addEventListener("click", handler);
    return value;
  };
  function appendSources(parent, refs) {
    if (!refs.length) return;
    const details = node("details", "reference-sources");
    details.append(node("summary", "", "根拠条文を確認"));
    refs.forEach(source => {
      const link = node("a", "", `${source.title} ${source.articles}`);
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      details.append(link);
    });
    details.append(node("small", "", `法令基準日 ${DATA.lawDate}／確認日 ${refs[0]?.checkedAt || DATA.checkedAt}`));
    parent.append(details);
  }
  function searchText(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase("ja").replace(/\s+/g, " ").trim();
  }
  function render(shell, options) {
    const { tab = "lessons", lessonId = null, onTab, onLesson, onBack, onQuestion, fromQuestion = false } = options;
    const page = node("section", "reference-view");
    const header = node("header", "reference-header");
    header.append(action(fromQuestion ? "問題へ戻る" : "ホーム", "ghost", onBack));
    header.append(node("h1", "", "学習ガイド"));
    page.append(header);
    page.append(node("p", "subtitle", "用語から理解するミニ参考書・重要論点・期間一覧"));
    const navigation = node("nav", "reference-tabs");
    navigation.setAttribute("aria-label", "教材の種類");
    [["lessons", "科目別参考書"], ["points", "重要論点"], ["glossary", "用語集"], ["periods", "期間・時効"]].forEach(([id, label]) => {
      const item = action(label, tab === id ? "secondary" : "ghost", () => onTab(id));
      if (tab === id) item.setAttribute("aria-current", "page");
      navigation.append(item);
    });
    page.append(navigation);
    const lesson = DATA.lessons.find(item => item.id === lessonId);
    if (tab === "lessons" && lesson) {
      page.append(action("科目一覧へ", "ghost", () => onTab("lessons")));
      renderLesson(page, lesson, onLesson, fromQuestion ? null : onQuestion, options.onTransfer);
    } else {
      renderIndex(page, tab, onLesson, onTab);
    }
    shell.append(page);
  }
  function renderIndex(page, tab, onLesson, onTab) {
    const labels = { lessons: "科目別ミニ参考書", points: "重要論点をすばやく確認", glossary: "知らない用語を調べる", periods: "期間・時効の早見表" };
    page.append(node("h2", "", labels[tab] || labels.lessons));
    if (tab === "lessons") {
      const intro = node("div", "reference-intro");
      intro.append(node("p", "", "初めて読む方は、行政法の入口から始めてください。各章は用語・具体例・比較・覚えるポイントを短くまとめています。"));
      intro.append(action("処分・裁決とは？ ここから読む", "primary", () => onLesson("admin-map")));
      page.append(intro);
    }
    if (tab === "periods") page.append(node("p", "reference-intro", "数字だけでなく、対象・起算点・例外を一緒に確認。審査請求期間や出訴期間は、民法の時効と同じ制度ではありません。個別法の特則・改正の経過措置も確認します。"));
    const search = node("input", "reference-search");
    search.type = "search";
    search.placeholder = "例：裁決、理由提示、時効、3か月";
    search.setAttribute("aria-label", "教材を検索");
    const label = node("label", "reference-search-label", "教材を検索");
    label.append(search);
    page.append(label);
    const filters = node("div", "reference-filters");
    const select = node("select");
    select.setAttribute("aria-label", "科目で絞り込む");
    select.append(new Option("すべての科目", ""));
    const records = tab === "periods" ? DATA.periods : tab === "glossary" ? DATA.glossary : DATA.lessons;
    const categories = [...new Set(records.map(item => item.category || DATA.lessons.find(lesson => lesson.id === item.lesson)?.category))];
    categories.forEach(category => select.append(new Option(category, category)));
    filters.append(select);
    page.append(filters);
    const count = node("p", "reference-count");
    count.setAttribute("role", "status");
    const results = node("div", "reference-list");
    page.append(count, results);
    function update() {
      results.replaceChildren();
      const words = searchText(search.value).split(" ").filter(Boolean);
      const matches = records.filter(item => {
        const category = item.category || DATA.lessons.find(lesson => lesson.id === item.lesson)?.category;
        return (!select.value || select.value === category) && words.every(word => searchText(JSON.stringify(item)).includes(word));
      });
      count.textContent = `${matches.length}件`;
      if (!matches.length) results.append(node("p", "empty-note", "一致する教材がありません。別の用語で検索してください。"));
      matches.forEach(item => {
        const card = node("article", "reference-card");
        if (tab === "glossary") {
          card.append(node("h3", "", item.term), node("p", "", item.meaning));
          card.append(action("具体例を読む", "ghost", () => onLesson(item.lesson)));
        } else if (tab === "periods") {
          card.append(node("p", "eyebrow", `${item.category}・${item.kind}`), node("h3", "", item.title));
          card.append(node("p", "reference-period", item.period));
          card.append(node("p", "", `いつから：${item.start}`), node("p", "reference-caution", item.note));
          card.append(action("意味から確認する", "ghost", () => onLesson(item.lesson)));
          appendSources(card, item.refs);
        } else {
          card.append(node("p", "eyebrow", item.category), node("h3", "", item.title));
          if (tab === "points") {
            const list = node("ul");
            item.points.forEach(point => list.append(node("li", "", point)));
            card.append(list);
          } else card.append(node("p", "", item.summary));
          card.append(action(tab === "points" ? "理由と具体例を読む" : "この章を読む", "ghost", () => onLesson(item.id)));
        }
        results.append(card);
      });
    }
    search.addEventListener("input", update);
    select.addEventListener("change", update);
    update();
  }
  function renderLesson(page, lesson, onLesson, onQuestion, onTransfer) {
    const article = node("article", "reference-lesson");
    article.append(node("p", "eyebrow", lesson.category), node("h2", "", lesson.title), node("p", "subtitle", lesson.summary));
    const toc = node("nav", "reference-toc");
    toc.setAttribute("aria-label", "この章の目次");
    lesson.sections.forEach((section, index) => {
      const link = node("a", "", section.title);
      link.href = `#reference-section-${index}`;
      toc.append(link);
    });
    article.append(toc);
    lesson.sections.forEach((item, index) => {
      const section = node("section", "reference-section");
      section.id = `reference-section-${index}`;
      section.append(node("h3", "", item.title));
      item.paragraphs.forEach(text => section.append(node("p", "", text)));
      if (item.steps) {
        const list = node("ol", "reference-flow");
        item.steps.forEach(step => list.append(node("li", "", step)));
        section.append(list);
      }
      if (item.table) {
        const table = node("table", "reference-table");
        const caption = node("caption", "sr-only", item.title);
        table.append(caption);
        const head = node("thead");
        const header = node("tr");
        item.table.headers.forEach(label => { const th = node("th", "", label); th.scope = "col"; header.append(th); });
        head.append(header);
        table.append(head);
        const body = node("tbody");
        item.table.rows.forEach(row => { const tr = node("tr"); row.forEach((text, column) => { const cell = node(column === 0 ? "th" : "td", "", text); if (column === 0) cell.scope = "row"; tr.append(cell); }); body.append(tr); });
        table.append(body);
        section.append(table);
      }
      article.append(section);
    });
    const points = node("section", "reference-keypoints");
    points.append(node("h3", "", "覚えるポイント"));
    const list = node("ul");
    lesson.points.forEach(point => list.append(node("li", "", point)));
    points.append(list);
    article.append(points);
    appendSources(article, lesson.refs);
    if (onTransfer && window.GYOSEI_TRANSFER_DATA?.questions.some(q => q.lesson === lesson.id)) {
      article.append(action("この論点の確認問題へ", "secondary", () => onTransfer(lesson.id)));
    }
    if (onQuestion && lesson.questions.length) {
      const related = node("section", "reference-related");
      related.append(node("h3", "", "関連する問題で確認"));
      related.append(node("p", "reference-count", "現行の第1回・論点確認問題へ進みます。"));
      const actions = node("div", "home-actions");
      lesson.questions.forEach(id => actions.append(action(`問${id}`, "ghost", () => onQuestion(id))));
      related.append(actions);
      article.append(related);
    }
    const index = DATA.lessons.indexOf(lesson);
    const navigation = node("div", "reference-next");
    if (index > 0) navigation.append(action("前の章", "ghost", () => onLesson(DATA.lessons[index - 1].id)));
    if (index < DATA.lessons.length - 1) navigation.append(action(`次：${DATA.lessons[index + 1].title}`, "secondary", () => onLesson(DATA.lessons[index + 1].id)));
    article.append(navigation);
    page.append(article);
  }
  function related(questionId) {
    return DATA.lessons.filter(lesson => lesson.questions.includes(Number(questionId)));
  }
  window.GYOSEI_REFERENCE = { render, related };
})();
