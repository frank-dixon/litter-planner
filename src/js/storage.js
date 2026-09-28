/**
 * Litter Planner — herd state helpers.
 * Per-user / guest persistence lives in LitterAuth; this module still
 * exposes emptyState, uid, and defaults used by the app and fixture.
 */
(function (global) {
  'use strict';

  var DEFAULT_SETTINGS = {
    nestOffsetDays: 27,
    kindleOffsetDays: 31,
    weanDaysAfterKindle: 28,
    processDaysAfterKindle: 75,
  };

  function uid(prefix) {
    return (
      (prefix || 'id') +
      '-' +
      Date.now().toString(36) +
      '-' +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function emptyState() {
    return {
      animals: [],
      matings: [],
      litters: [],
      chores: [],
      settings: Object.assign({}, DEFAULT_SETTINGS),
      historyNotes: [],
    };
  }

  /** Prefer Auth + SampleFixture; kept for any leftover callers. */
  function sampleHerd() {
    if (global.LitterSampleFixture && typeof global.LitterSampleFixture.build === 'function') {
      return global.LitterSampleFixture.build();
    }
    return emptyState();
  }

  global.LitterStorage = {
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    uid: uid,
    emptyState: emptyState,
    sampleHerd: sampleHerd,
  };
})(typeof window !== 'undefined' ? window : globalThis);
