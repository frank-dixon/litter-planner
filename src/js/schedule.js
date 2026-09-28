/**
 * Litter Planner — schedule date math from a mating date.
 * nest / kindle from mating; wean / process from recorded or estimated kindle.
 */
(function (global) {
  'use strict';

  var DEFAULTS = {
    nestOffsetDays: 27,
    kindleOffsetDays: 31,
    weanDaysAfterKindle: 28,
    processDaysAfterKindle: 75,
  };

  function settingsOrDefault(settings) {
    return Object.assign({}, DEFAULTS, settings || {});
  }

  /** Parse YYYY-MM-DD as local noon to avoid DST edge flips. */
  function parseIsoDate(iso) {
    if (!iso || typeof iso !== 'string') return null;
    var parts = iso.slice(0, 10).split('-');
    if (parts.length !== 3) return null;
    var y = Number(parts[0]);
    var m = Number(parts[1]);
    var d = Number(parts[2]);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }

  function toIsoDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return null;
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function addDays(isoOrDate, days) {
    var base =
      isoOrDate instanceof Date ? new Date(isoOrDate.getTime()) : parseIsoDate(isoOrDate);
    if (!base) return null;
    var next = new Date(base.getTime());
    next.setDate(next.getDate() + (Number(days) || 0));
    return toIsoDate(next);
  }

  function todayIso() {
    return toIsoDate(new Date());
  }

  function nestDueDate(matingDate, settings) {
    var s = settingsOrDefault(settings);
    return addDays(matingDate, s.nestOffsetDays);
  }

  function kindleDueDate(matingDate, settings) {
    var s = settingsOrDefault(settings);
    return addDays(matingDate, s.kindleOffsetDays);
  }

  /** Recorded kindle wins; otherwise estimated kindle from mating. */
  function effectiveKindleDate(matingDate, recordedKindleDate, settings) {
    if (recordedKindleDate) return String(recordedKindleDate).slice(0, 10);
    return kindleDueDate(matingDate, settings);
  }

  function weanDueDate(matingDate, recordedKindleDate, settings) {
    var s = settingsOrDefault(settings);
    var kindle = effectiveKindleDate(matingDate, recordedKindleDate, s);
    return addDays(kindle, s.weanDaysAfterKindle);
  }

  function processDueDate(matingDate, recordedKindleDate, settings) {
    var s = settingsOrDefault(settings);
    var kindle = effectiveKindleDate(matingDate, recordedKindleDate, s);
    return addDays(kindle, s.processDaysAfterKindle);
  }

  /**
   * Build the four-chore chain for a mating.
   * @returns {{ type, dueDate }[]}
   */
  function buildChoreDates(matingDate, recordedKindleDate, settings) {
    var s = settingsOrDefault(settings);
    return [
      { type: 'nest', dueDate: nestDueDate(matingDate, s) },
      { type: 'kindle', dueDate: kindleDueDate(matingDate, s) },
      { type: 'wean', dueDate: weanDueDate(matingDate, recordedKindleDate, s) },
      { type: 'process', dueDate: processDueDate(matingDate, recordedKindleDate, s) },
    ];
  }

  /** Days from today to due (negative = overdue). */
  function daysUntil(dueIso, fromIso) {
    var due = parseIsoDate(dueIso);
    var from = parseIsoDate(fromIso || todayIso());
    if (!due || !from) return null;
    var ms = due.getTime() - from.getTime();
    return Math.round(ms / 86400000);
  }

  function effectiveDue(chore) {
    if (!chore) return null;
    if (chore.snoozedTo) return chore.snoozedTo;
    return chore.dueDate;
  }

  global.LitterSchedule = {
    DEFAULTS: DEFAULTS,
    parseIsoDate: parseIsoDate,
    toIsoDate: toIsoDate,
    addDays: addDays,
    todayIso: todayIso,
    nestDueDate: nestDueDate,
    kindleDueDate: kindleDueDate,
    effectiveKindleDate: effectiveKindleDate,
    weanDueDate: weanDueDate,
    processDueDate: processDueDate,
    buildChoreDates: buildChoreDates,
    daysUntil: daysUntil,
    effectiveDue: effectiveDue,
  };
})(typeof window !== 'undefined' ? window : globalThis);
