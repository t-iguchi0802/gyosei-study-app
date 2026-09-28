(function (root) {
  "use strict";
  // Practice benchmark based on published 2025 allocation. Not a 2026 official result.
  const RULES = Object.freeze({ legalMax: 244, basicMax: 56, totalMax: 300, legalFloor: 122, basicFloor: 24, totalFloor: 180 });
  function points(value, max) {
    return Math.max(0, Math.min(max, Number(value) || 0));
  }
  function summarize(questions, records = {}, writtenScores = {}) {
    let auto = 0, written = 0, pending = 0, legal = 0, basic = 0;
    let correct = 0, wrong = 0, unsure = 0, mixed = false;
    for (const question of questions) {
      const record = records[question.id];
      let earned = 0;
      if (question.type === "written") {
        const score = writtenScores[question.id];
        if (score === undefined || score === "" || score === null || !Number.isFinite(Number(score))) pending++;
        else { earned = points(score, 20); written += earned; }
      } else {
        earned = points(record?.earned, question.type === "multi" ? 8 : 4);
        auto += earned;
      }
      if (question.id <= 46) legal += earned;
      else basic += earned;
      if (record?.status === "ok") correct++;
      if (record?.status === "ng") wrong++;
      if (record?.confidence === "unsure") unsure++;
      if (record && record.source !== "exam") mixed = true;
    }
    const total = legal + basic;
    const meets = { legal: legal >= RULES.legalFloor, basic: basic >= RULES.basicFloor, total: total >= RULES.totalFloor };
    return { auto, written, pending, legal, basic, total, correct, wrong, unsure, mixed, meets,
      benchmarkMet: pending === 0 && !mixed && meets.legal && meets.basic && meets.total };
  }
  root.GYOSEI_SCORING = Object.freeze({ RULES, summarize });
})(typeof window === "undefined" ? globalThis : window);
