/**
 * Litter Planner — localStorage persistence.
 * Animals, matings, litters, chores, settings. Sample herd for first open.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'litter-planner-v1';

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
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyState();
      return {
        animals: Array.isArray(parsed.animals) ? parsed.animals : [],
        matings: Array.isArray(parsed.matings) ? parsed.matings : [],
        litters: Array.isArray(parsed.litters) ? parsed.litters : [],
        chores: Array.isArray(parsed.chores) ? parsed.chores : [],
        settings: Object.assign({}, DEFAULT_SETTINGS, parsed.settings || {}),
      };
    } catch (err) {
      console.warn('[LitterStorage] load failed; starting empty', err);
      return emptyState();
    }
  }

  function save(state) {
    if (!state || typeof state !== 'object') return;
    var payload = {
      animals: state.animals || [],
      matings: state.matings || [],
      litters: state.litters || [],
      chores: state.chores || [],
      settings: Object.assign({}, DEFAULT_SETTINGS, state.settings || {}),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Sample backyard meat herd with one open mating + chore chain. */
  function sampleHerd() {
    var doeA = {
      id: uid('animal'),
      name: 'Clover',
      sex: 'doe',
      status: 'breeder',
      breed: 'New Zealand White',
      cage: 'A1',
      notes: 'Steady producer. Calm temperament.',
    };
    var doeB = {
      id: uid('animal'),
      name: 'Hazel',
      sex: 'doe',
      status: 'breeder',
      breed: 'Californian',
      cage: 'A2',
      notes: '',
    };
    var buck = {
      id: uid('animal'),
      name: 'Cedar',
      sex: 'buck',
      status: 'breeder',
      breed: 'New Zealand White',
      cage: 'B1',
      notes: 'Primary sire.',
    };
    var growOut = {
      id: uid('animal'),
      name: 'Litter batch — Aug',
      sex: 'grow-out',
      status: 'grow-out',
      breed: 'NZW × Cal',
      cage: 'Grow-3',
      notes: 'Six kits finishing for process.',
    };

    var matingDate = new Date();
    matingDate.setDate(matingDate.getDate() - 20);
    var matingIso = matingDate.toISOString().slice(0, 10);

    var mating = {
      id: uid('mating'),
      doeId: doeA.id,
      buckId: buck.id,
      date: matingIso,
      notes: 'Observed mating. Sample schedule so Today has work.',
      kindleDate: null,
    };

    var settings = Object.assign({}, DEFAULT_SETTINGS);
    var Schedule = global.LitterSchedule;
    var nestDue = Schedule
      ? Schedule.nestDueDate(matingIso, settings)
      : addDaysIso(matingIso, settings.nestOffsetDays);
    var kindleDue = Schedule
      ? Schedule.kindleDueDate(matingIso, settings)
      : addDaysIso(matingIso, settings.kindleOffsetDays);
    var weanDue = Schedule
      ? Schedule.weanDueDate(matingIso, null, settings)
      : addDaysIso(kindleDue, settings.weanDaysAfterKindle);
    var processDue = Schedule
      ? Schedule.processDueDate(matingIso, null, settings)
      : addDaysIso(kindleDue, settings.processDaysAfterKindle);

    var chores = [
      {
        id: uid('chore'),
        matingId: mating.id,
        type: 'nest',
        dueDate: nestDue,
        done: false,
        doneAt: null,
        snoozedTo: null,
      },
      {
        id: uid('chore'),
        matingId: mating.id,
        type: 'kindle',
        dueDate: kindleDue,
        done: false,
        doneAt: null,
        snoozedTo: null,
      },
      {
        id: uid('chore'),
        matingId: mating.id,
        type: 'wean',
        dueDate: weanDue,
        done: false,
        doneAt: null,
        snoozedTo: null,
      },
      {
        id: uid('chore'),
        matingId: mating.id,
        type: 'process',
        dueDate: processDue,
        done: false,
        doneAt: null,
        snoozedTo: null,
      },
    ];

    return {
      animals: [doeA, doeB, buck, growOut],
      matings: [mating],
      litters: [],
      chores: chores,
      settings: settings,
    };
  }

  function addDaysIso(iso, days) {
    var d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + Number(days) || 0);
    return d.toISOString().slice(0, 10);
  }

  global.LitterStorage = {
    KEY: STORAGE_KEY,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    uid: uid,
    emptyState: emptyState,
    load: load,
    save: save,
    clear: clear,
    sampleHerd: sampleHerd,
  };
})(typeof window !== 'undefined' ? window : globalThis);
