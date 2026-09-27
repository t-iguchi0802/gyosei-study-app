(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GYOSEI_LEARNING_V2 = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SCHEMA_VERSION = 2;
  const EXAM_ID = "gyosei-2026-mock-1";
  const STORAGE_KEY = "gyosei2026_mock1_learning_v2";

  function uniqueValidIds(values, questionIds) {
    const valid = new Set(questionIds.map(Number));
    return [...new Set((values || []).map(Number).filter(id => valid.has(id)))];
  }

  function firstUnansweredId(answeredQuestionIds, questionIds) {
    const answered = new Set((answeredQuestionIds || []).map(Number));
    return questionIds.map(Number).find(id => !answered.has(id)) ?? null;
  }

  function blankStore(questionIds, timestamp = 0) {
    const ids = questionIds.map(Number);
    return {
      schemaVersion: SCHEMA_VERSION,
      examId: EXAM_ID,
      updatedAt: Number(timestamp) || 0,
      learning: {
        cycle: 1,
        completedCycles: 0,
        answeredQuestionIds: [],
        nextQuestionId: ids[0] ?? null,
        lastCompletedQuestionId: null,
        updatedAt: Number(timestamp) || 0,
      },
      migration: {
        legacyCursorImported: false,
        sourceRound: null,
        importedAt: null,
      },
    };
  }

  function normalizeStore(value, questionIds) {
    const ids = questionIds.map(Number);
    const base = blankStore(ids);
    if (!value || Number(value.schemaVersion) !== SCHEMA_VERSION || value.examId !== EXAM_ID) return base;

    const learning = value.learning || {};
    const answeredQuestionIds = uniqueValidIds(learning.answeredQuestionIds, ids);
    const cycle = Math.max(1, Number(learning.cycle) || 1);
    const completedCycles = Math.max(0, Number(learning.completedCycles) || cycle - 1);
    const nextQuestionId = firstUnansweredId(answeredQuestionIds, ids);

    return {
      schemaVersion: SCHEMA_VERSION,
      examId: EXAM_ID,
      updatedAt: Math.max(Number(value.updatedAt) || 0, Number(learning.updatedAt) || 0),
      learning: {
        cycle,
        completedCycles,
        answeredQuestionIds,
        nextQuestionId: nextQuestionId ?? ids[0] ?? null,
        lastCompletedQuestionId: ids.includes(Number(learning.lastCompletedQuestionId))
          ? Number(learning.lastCompletedQuestionId)
          : null,
        updatedAt: Number(learning.updatedAt) || 0,
      },
      migration: {
        legacyCursorImported: Boolean(value.migration?.legacyCursorImported),
        sourceRound: Number(value.migration?.sourceRound) || null,
        importedAt: Number(value.migration?.importedAt) || null,
      },
    };
  }

  function migrateFromLegacy(legacy, questionIds, timestamp = Date.now()) {
    const ids = questionIds.map(Number);
    const migrated = blankStore(ids, timestamp);
    const candidates = [];

    for (let round = 1; round <= 5; round++) {
      const records = legacy?.rounds?.[round]?.records || legacy?.rounds?.[String(round)]?.records || {};
      const answered = ids.filter(id => records[id]?.source === "review" || records[String(id)]?.source === "review");
      if (answered.length) candidates.push({ round, answered });
    }

    if (!candidates.length) return migrated;
    const latest = candidates[candidates.length - 1];
    const completed = latest.answered.length === ids.length;
    migrated.learning.cycle = completed ? latest.round + 1 : latest.round;
    migrated.learning.completedCycles = completed ? latest.round : Math.max(0, latest.round - 1);
    migrated.learning.answeredQuestionIds = completed ? [] : latest.answered;
    migrated.learning.nextQuestionId = completed
      ? ids[0] ?? null
      : firstUnansweredId(latest.answered, ids);
    migrated.learning.lastCompletedQuestionId = latest.answered[latest.answered.length - 1] ?? null;
    migrated.learning.updatedAt = timestamp;
    migrated.migration = {
      legacyCursorImported: true,
      sourceRound: latest.round,
      importedAt: timestamp,
    };
    return normalizeStore(migrated, ids);
  }

  function loadOrMigrate(rawValue, legacy, questionIds, timestamp = Date.now()) {
    if (rawValue && Number(rawValue.schemaVersion) === SCHEMA_VERSION) {
      return normalizeStore(rawValue, questionIds);
    }
    return migrateFromLegacy(legacy, questionIds, timestamp);
  }

  function completeQuestion(value, questionId, questionIds, timestamp = Date.now()) {
    const ids = questionIds.map(Number);
    const next = normalizeStore(value, ids);
    const id = Number(questionId);
    if (!ids.includes(id)) return next;

    next.learning.answeredQuestionIds = uniqueValidIds([...next.learning.answeredQuestionIds, id], ids);
    next.learning.lastCompletedQuestionId = id;
    next.learning.updatedAt = timestamp;
    next.updatedAt = timestamp;

    const unanswered = firstUnansweredId(next.learning.answeredQuestionIds, ids);
    if (unanswered === null) {
      next.learning.completedCycles += 1;
      next.learning.cycle += 1;
      next.learning.answeredQuestionIds = [];
      next.learning.nextQuestionId = ids[0] ?? null;
    } else {
      next.learning.nextQuestionId = unanswered;
    }
    return next;
  }

  function mergeStores(localValue, remoteValue, questionIds) {
    const ids = questionIds.map(Number);
    const local = normalizeStore(localValue, ids);
    const remote = normalizeStore(remoteValue, ids);
    let merged;

    if (local.learning.cycle > remote.learning.cycle) merged = local;
    else if (remote.learning.cycle > local.learning.cycle) merged = remote;
    else {
      const newer = remote.learning.updatedAt > local.learning.updatedAt ? remote : local;
      merged = normalizeStore(newer, ids);
      merged.learning.answeredQuestionIds = uniqueValidIds([
        ...local.learning.answeredQuestionIds,
        ...remote.learning.answeredQuestionIds,
      ], ids);
      merged.learning.completedCycles = Math.max(local.learning.completedCycles, remote.learning.completedCycles);
      merged.learning.updatedAt = Math.max(local.learning.updatedAt, remote.learning.updatedAt);
      merged.updatedAt = Math.max(local.updatedAt, remote.updatedAt, merged.learning.updatedAt);
      merged.learning.nextQuestionId = firstUnansweredId(merged.learning.answeredQuestionIds, ids);
      if (merged.learning.nextQuestionId === null) {
        merged.learning.completedCycles += 1;
        merged.learning.cycle += 1;
        merged.learning.answeredQuestionIds = [];
        merged.learning.nextQuestionId = ids[0] ?? null;
      }
    }

    merged.migration = {
      legacyCursorImported: local.migration.legacyCursorImported || remote.migration.legacyCursorImported,
      sourceRound: remote.migration.importedAt > local.migration.importedAt
        ? remote.migration.sourceRound
        : local.migration.sourceRound,
      importedAt: Math.max(local.migration.importedAt || 0, remote.migration.importedAt || 0) || null,
    };
    return normalizeStore(merged, ids);
  }

  function nextQuestionIndex(value, questionIds) {
    const normalized = normalizeStore(value, questionIds);
    const index = questionIds.map(Number).indexOf(Number(normalized.learning.nextQuestionId));
    return index < 0 ? 0 : index;
  }

  return {
    SCHEMA_VERSION,
    EXAM_ID,
    STORAGE_KEY,
    blankStore,
    normalizeStore,
    migrateFromLegacy,
    loadOrMigrate,
    completeQuestion,
    mergeStores,
    nextQuestionIndex,
  };
});
