/**
 * Rich sample barn fixture for the read-only demo account.
 * Dates are computed relative to "today" so the Today tab always has work.
 */
(function (global) {
  'use strict';

  var SAMPLE_EMAIL = 'sample@litterplanner.demo';
  var SAMPLE_PASSWORD = 'sample';
  var SAMPLE_USER_ID = 'sample';
  var SAMPLE_NAME = 'Willow Creek Rabbitry';

  function addDaysIso(iso, days) {
    var parts = String(iso).slice(0, 10).split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0, 0);
    d.setDate(d.getDate() + (Number(days) || 0));
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function todayIso() {
    var Schedule = global.LitterSchedule;
    if (Schedule && Schedule.todayIso) return Schedule.todayIso();
    var n = new Date();
    return (
      n.getFullYear() +
      '-' +
      String(n.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(n.getDate()).padStart(2, '0')
    );
  }

  function build() {
    var today = todayIso();
    var settings = {
      nestOffsetDays: 27,
      kindleOffsetDays: 31,
      weanDaysAfterKindle: 28,
      processDaysAfterKindle: 75,
    };

    var clover = {
      id: 'sample-animal-clover',
      name: 'Clover',
      sex: 'doe',
      status: 'breeder',
      breed: 'New Zealand White',
      cage: 'A1',
      notes: 'Steady producer. Calm temperament. Third season on the wire.',
    };
    var hazel = {
      id: 'sample-animal-hazel',
      name: 'Hazel',
      sex: 'doe',
      status: 'breeder',
      breed: 'Californian',
      cage: 'A2',
      notes: 'Good milk. Prefers the back corner of the nest box.',
    };
    var juniper = {
      id: 'sample-animal-juniper',
      name: 'Juniper',
      sex: 'doe',
      status: 'breeder',
      breed: 'New Zealand White',
      cage: 'A3',
      notes: 'First litter last month — kits grew evenly.',
    };
    var maple = {
      id: 'sample-animal-maple',
      name: 'Maple',
      sex: 'doe',
      status: 'breeder',
      breed: 'Californian × NZW',
      cage: 'A4',
      notes: 'Resting this cycle after a nine-kit kindling.',
    };
    var cedar = {
      id: 'sample-animal-cedar',
      name: 'Cedar',
      sex: 'buck',
      status: 'breeder',
      breed: 'New Zealand White',
      cage: 'B1',
      notes: 'Primary sire. Broad shoulders, easy to handle.',
    };
    var rowan = {
      id: 'sample-animal-rowan',
      name: 'Rowan',
      sex: 'buck',
      status: 'breeder',
      breed: 'Californian',
      cage: 'B2',
      notes: 'Second sire — denser bone, used on Hazel and Maple.',
    };
    var growAug = {
      id: 'sample-animal-grow-aug',
      name: 'August growers',
      sex: 'grow-out',
      status: 'grow-out',
      breed: 'NZW × Cal',
      cage: 'Grow-3',
      notes: 'Six kits finishing — process window opens this week.',
    };
    var growSep = {
      id: 'sample-animal-grow-sep',
      name: 'September weanlings',
      sex: 'grow-out',
      status: 'grow-out',
      breed: 'NZW',
      cage: 'Grow-1',
      notes: 'Eight kits weaned last week from Juniper. Settling on pellets.',
    };

    // Mating 1 — Clover × Cedar: nest due today, kindle in a few days
    var mating1Date = addDaysIso(today, -settings.nestOffsetDays);
    var mating1 = {
      id: 'sample-mating-1',
      doeId: clover.id,
      buckId: cedar.id,
      date: mating1Date,
      notes: 'Observed fall-off. Sample schedule so Today has nest work.',
      kindleDate: null,
    };

    // Mating 2 — Hazel × Rowan: kindled recently, wean due in a few days
    var mating2Kindle = addDaysIso(today, -(settings.weanDaysAfterKindle - 3));
    var mating2Date = addDaysIso(mating2Kindle, -settings.kindleOffsetDays);
    var mating2 = {
      id: 'sample-mating-2',
      doeId: hazel.id,
      buckId: rowan.id,
      date: mating2Date,
      notes: 'Second breeding this season. Nest looked full by day 28.',
      kindleDate: mating2Kindle,
    };

    // Mating 3 — Juniper × Cedar: weaned, process due within a week
    var mating3Kindle = addDaysIso(today, -(settings.processDaysAfterKindle - 5));
    var mating3Date = addDaysIso(mating3Kindle, -settings.kindleOffsetDays);
    var mating3 = {
      id: 'sample-mating-3',
      doeId: juniper.id,
      buckId: cedar.id,
      date: mating3Date,
      notes: 'First litter. Quiet kindling overnight.',
      kindleDate: mating3Kindle,
    };

    // Mating 4 — Maple × Rowan, older finished cycle (history)
    var mating4Date = addDaysIso(today, -110);
    var mating4Kindle = addDaysIso(today, -79);
    var mating4 = {
      id: 'sample-mating-4',
      doeId: maple.id,
      buckId: rowan.id,
      date: mating4Date,
      notes: 'Nine kits; kept eight. Process done last month.',
      kindleDate: mating4Kindle,
    };

    var litters = [
      {
        id: 'sample-litter-1',
        matingId: mating2.id,
        date: mating2Kindle,
        bornAlive: 7,
        stillborn: 1,
        notes: 'One kit chilled overnight; rest nursing well. Nest dry.',
      },
      {
        id: 'sample-litter-2',
        matingId: mating3.id,
        date: mating3Kindle,
        bornAlive: 8,
        stillborn: 0,
        notes: 'Even litter. Weaned to Grow-1; doe back on rest ration.',
      },
      {
        id: 'sample-litter-3',
        matingId: mating4.id,
        date: mating4Kindle,
        bornAlive: 9,
        stillborn: 0,
        notes: 'Strong August batch — six finished as growers, two kept for future stock.',
      },
    ];

    function chore(id, matingId, type, dueDate, done, doneAt, snoozedTo) {
      return {
        id: id,
        matingId: matingId,
        type: type,
        dueDate: dueDate,
        done: !!done,
        doneAt: doneAt || null,
        snoozedTo: snoozedTo || null,
      };
    }

    // Mating 1 open chain (nest ~due, kindle upcoming)
    var m1Nest = addDaysIso(mating1Date, settings.nestOffsetDays);
    var m1Kindle = addDaysIso(mating1Date, settings.kindleOffsetDays);
    var m1Wean = addDaysIso(m1Kindle, settings.weanDaysAfterKindle);
    var m1Process = addDaysIso(m1Kindle, settings.processDaysAfterKindle);

    // Mating 2: nest+kindle done; wean upcoming (~16 days)
    var m2Nest = addDaysIso(mating2Date, settings.nestOffsetDays);
    var m2KindleDue = addDaysIso(mating2Date, settings.kindleOffsetDays);
    var m2Wean = addDaysIso(mating2Kindle, settings.weanDaysAfterKindle);
    var m2Process = addDaysIso(mating2Kindle, settings.processDaysAfterKindle);

    // Mating 3: nest/kindle/wean done; process upcoming
    var m3Nest = addDaysIso(mating3Date, settings.nestOffsetDays);
    var m3KindleDue = addDaysIso(mating3Date, settings.kindleOffsetDays);
    var m3Wean = addDaysIso(mating3Kindle, settings.weanDaysAfterKindle);
    var m3Process = addDaysIso(mating3Kindle, settings.processDaysAfterKindle);

    // Mating 4: all done (history)
    var m4Nest = addDaysIso(mating4Date, settings.nestOffsetDays);
    var m4KindleDue = addDaysIso(mating4Date, settings.kindleOffsetDays);
    var m4Wean = addDaysIso(mating4Kindle, settings.weanDaysAfterKindle);
    var m4Process = addDaysIso(mating4Kindle, settings.processDaysAfterKindle);

    var chores = [
      chore('sample-chore-m1-nest', mating1.id, 'nest', m1Nest, false, null, null),
      chore('sample-chore-m1-kindle', mating1.id, 'kindle', m1Kindle, false, null, null),
      chore('sample-chore-m1-wean', mating1.id, 'wean', m1Wean, false, null, null),
      chore('sample-chore-m1-process', mating1.id, 'process', m1Process, false, null, null),

      chore('sample-chore-m2-nest', mating2.id, 'nest', m2Nest, true, m2Nest, null),
      chore('sample-chore-m2-kindle', mating2.id, 'kindle', m2KindleDue, true, mating2Kindle, null),
      chore('sample-chore-m2-wean', mating2.id, 'wean', m2Wean, false, null, null),
      chore('sample-chore-m2-process', mating2.id, 'process', m2Process, false, null, null),

      chore('sample-chore-m3-nest', mating3.id, 'nest', m3Nest, true, m3Nest, null),
      chore('sample-chore-m3-kindle', mating3.id, 'kindle', m3KindleDue, true, mating3Kindle, null),
      chore('sample-chore-m3-wean', mating3.id, 'wean', m3Wean, true, m3Wean, null),
      chore('sample-chore-m3-process', mating3.id, 'process', m3Process, false, null, null),

      chore('sample-chore-m4-nest', mating4.id, 'nest', m4Nest, true, m4Nest, null),
      chore('sample-chore-m4-kindle', mating4.id, 'kindle', m4KindleDue, true, mating4Kindle, null),
      chore('sample-chore-m4-wean', mating4.id, 'wean', m4Wean, true, m4Wean, null),
      chore('sample-chore-m4-process', mating4.id, 'process', m4Process, true, m4Process, null),
    ];

    return {
      animals: [clover, hazel, juniper, maple, cedar, rowan, growAug, growSep],
      matings: [mating1, mating2, mating3, mating4],
      litters: litters,
      chores: chores,
      settings: settings,
      historyNotes: [
        {
          id: 'sample-note-1',
          date: addDaysIso(today, -5),
          text: 'Moved August growers to Grow-3 and scrubbed the wean pen.',
        },
        {
          id: 'sample-note-2',
          date: addDaysIso(today, -12),
          text: 'Hazel kindled seven alive. Added a heat pad overnight for the chilled kit.',
        },
        {
          id: 'sample-note-3',
          date: addDaysIso(today, -40),
          text: 'Weaned Juniper’s eight kits. Doe returned to rest ration for two weeks.',
        },
      ],
    };
  }

  global.LitterSampleFixture = {
    EMAIL: SAMPLE_EMAIL,
    PASSWORD: SAMPLE_PASSWORD,
    USER_ID: SAMPLE_USER_ID,
    NAME: SAMPLE_NAME,
    build: build,
  };
})(typeof window !== 'undefined' ? window : globalThis);
