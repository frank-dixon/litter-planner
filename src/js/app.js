/**
 * Litter Planner — cream/paper UI wiring (plain JS, no framework).
 * Tabs: Today · Herd · Plan mating · Litters · Settings
 */
(function () {
  'use strict';

  var Storage = window.LitterStorage;
  var Schedule = window.LitterSchedule;

  if (!Storage || !Schedule) {
    console.error('[LitterPlanner] storage.js and schedule.js must load first');
    return;
  }

  var CHORE_LABELS = {
    nest: 'Put the nest box in',
    kindle: 'Watch for kindling',
    wean: 'Wean the kits',
    process: 'Process the growers',
  };

  var CHORE_BLURBS = {
    nest: 'Nest box goes in so the doe can settle before kindling.',
    kindle: 'Expected kindling window — check the doe and record the litter.',
    wean: 'Separate kits from the doe once they are ready to wean.',
    process: 'Growers reach the usual process window for this herd.',
  };

  var TABS = [
    { id: 'today', label: 'Today' },
    { id: 'herd', label: 'Herd' },
    { id: 'mating', label: 'Plan mating' },
    { id: 'litters', label: 'Litters' },
    { id: 'settings', label: 'Settings' },
  ];

  var state = Storage.load();
  var activeTab = 'today';
  var flashMessage = '';

  function persist() {
    Storage.save(state);
  }

  function animalById(id) {
    return state.animals.find(function (a) {
      return a.id === id;
    });
  }

  function matingById(id) {
    return state.matings.find(function (m) {
      return m.id === id;
    });
  }

  function doeName(mating) {
    var a = animalById(mating && mating.doeId);
    return a ? a.name : 'Unknown doe';
  }

  function buckName(mating) {
    var a = animalById(mating && mating.buckId);
    return a ? a.name : 'Unknown buck';
  }

  function formatDisplayDate(iso) {
    var d = Schedule.parseIsoDate(iso);
    if (!d) return iso || '—';
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setFlash(msg) {
    flashMessage = msg || '';
    render();
  }

  function todayChores() {
    var today = Schedule.todayIso();
    return state.chores
      .filter(function (c) {
        return !c.done;
      })
      .map(function (c) {
        return {
          chore: c,
          due: Schedule.effectiveDue(c),
          days: Schedule.daysUntil(Schedule.effectiveDue(c), today),
        };
      })
      .filter(function (row) {
        return row.days !== null && row.days <= 7;
      })
      .sort(function (a, b) {
        return a.days - b.days;
      });
  }

  function markDone(choreId) {
    var chore = state.chores.find(function (c) {
      return c.id === choreId;
    });
    if (!chore) return;
    chore.done = true;
    chore.doneAt = Schedule.todayIso();
    chore.snoozedTo = null;
    persist();
    setFlash("Marked \"" + (CHORE_LABELS[chore.type] || chore.type) + "\" done.");
  }

  function snoozeOne(choreId) {
    var chore = state.chores.find(function (c) {
      return c.id === choreId;
    });
    if (!chore) return;
    var base = Schedule.effectiveDue(chore) || Schedule.todayIso();
    chore.snoozedTo = Schedule.addDays(base, 1);
    persist();
    setFlash(
      "Snoozed \"" +
        (CHORE_LABELS[chore.type] || chore.type) +
        "\" to " +
        formatDisplayDate(chore.snoozedTo) +
        "."
    );
  }

  function createMatingChores(mating) {
    var dates = Schedule.buildChoreDates(
      mating.date,
      mating.kindleDate,
      state.settings
    );
    dates.forEach(function (row) {
      state.chores.push({
        id: Storage.uid('chore'),
        matingId: mating.id,
        type: row.type,
        dueDate: row.dueDate,
        done: false,
        doneAt: null,
        snoozedTo: null,
      });
    });
  }

  function refreshOpenChoresForMating(matingId) {
    var mating = matingById(matingId);
    if (!mating) return;
    var dates = Schedule.buildChoreDates(
      mating.date,
      mating.kindleDate,
      state.settings
    );
    var byType = {};
    dates.forEach(function (d) {
      byType[d.type] = d.dueDate;
    });
    state.chores.forEach(function (c) {
      if (c.matingId !== matingId || c.done) return;
      if (byType[c.type]) {
        c.dueDate = byType[c.type];
        if (c.type === 'wean' || c.type === 'process') c.snoozedTo = null;
      }
    });
  }

  /* ---------- render helpers ---------- */

  function renderFlash() {
    if (!flashMessage) return '';
    return (
      '<div class="mb-4 rounded-paper border border-teal/25 bg-teal-soft px-4 py-3 text-sm text-ink-soft" role="status">' +
      escapeHtml(flashMessage) +
      '</div>'
    );
  }

  function renderTabs() {
    return (
      '<nav class="mb-6 flex flex-wrap gap-2 border-b border-rule pb-3" aria-label="Litter Planner sections">' +
      TABS.map(function (tab) {
        var on = tab.id === activeTab;
        return (
          '<button type="button" data-tab="' +
          tab.id +
          '" class="rounded-full px-3.5 py-1.5 text-sm transition ' +
          (on
            ? 'bg-teal-soft text-teal-deep font-semibold border border-teal/50'
            : 'bg-paper text-ink-soft border border-rule hover:border-teal/40 hover:text-ink') +
          '">' +
          escapeHtml(tab.label) +
          '</button>'
        );
      }).join('') +
      '</nav>'
    );
  }

  function urgencyBadge(days) {
    if (days < 0) {
      return (
        '<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[0.68rem] font-medium text-amber-600">' +
        Math.abs(days) +
        ' day' +
        (Math.abs(days) === 1 ? '' : 's') +
        ' overdue</span>'
      );
    }
    if (days === 0) {
      return (
        '<span class="inline-flex items-center rounded-full bg-teal-soft text-teal-deep px-2 py-0.5 font-mono text-[0.68rem] font-semibold border border-teal/40">Due today</span>'
      );
    }
    return (
      '<span class="inline-flex items-center rounded-full bg-paper-2 px-2 py-0.5 font-mono text-[0.68rem] text-ink-muted">In ' +
      days +
      ' day' +
      (days === 1 ? '' : 's') +
      '</span>'
    );
  }

  function renderToday() {
    var rows = todayChores();
    var body;
    if (!state.animals.length && !state.matings.length) {
      body =
        '<div class="rounded-paper border border-rule bg-paper p-6 shadow-paper-sm">' +
        '<p class="text-ink leading-relaxed">This herd is empty. Load the sample herd to walk a nest → kindle → wean → process cycle, or add animals under Herd and plan a mating.</p>' +
        '<div class="mt-4 flex flex-wrap gap-2">' +
        '<button type="button" data-action="load-sample" class="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-teal-on shadow-teal">Load sample herd</button>' +
        '<button type="button" data-tab="herd" class="rounded-full border border-rule bg-paper px-4 py-2 text-sm text-ink-soft hover:border-teal/50">Go to Herd</button>' +
        '</div></div>';
    } else if (!rows.length) {
      body =
        '<div class="rounded-paper border border-rule bg-paper p-6 shadow-paper-sm">' +
        '<p class="text-ink leading-relaxed">Nothing is due in the next week. Enjoy the quiet barn day, or plan another mating when you are ready.</p>' +
        '<button type="button" data-tab="mating" class="mt-4 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-teal-on shadow-teal">Plan a mating</button>' +
        '</div>';
    } else {
      body =
        '<ul class="space-y-3">' +
        rows
          .map(function (row) {
            var c = row.chore;
            var mating = matingById(c.matingId);
            var title = CHORE_LABELS[c.type] || c.type;
            var blurb = CHORE_BLURBS[c.type] || '';
            var who = mating
              ? doeName(mating) + ' × ' + buckName(mating)
              : 'Unlinked mating';
            return (
              '<li class="rounded-paper border border-rule bg-paper p-4 shadow-paper-sm">' +
              '<div class="flex flex-wrap items-start justify-between gap-3">' +
              '<div class="min-w-0">' +
              '<p class="font-mono text-[0.65rem] uppercase tracking-widest text-ink-muted">' +
              escapeHtml(c.type) +
              '</p>' +
              '<h3 class="mt-1 text-lg font-semibold text-ink">' +
              escapeHtml(title) +
              '</h3>' +
              '<p class="mt-1 text-sm text-ink-soft leading-relaxed">' +
              escapeHtml(blurb) +
              '</p>' +
              '<p class="mt-2 text-sm text-ink-muted">' +
              escapeHtml(who) +
              ' · due ' +
              escapeHtml(formatDisplayDate(row.due)) +
              '</p>' +
              '<div class="mt-2">' +
              urgencyBadge(row.days) +
              '</div>' +
              '</div>' +
              '<div class="flex flex-wrap gap-2 shrink-0">' +
              '<button type="button" data-action="done" data-id="' +
              escapeHtml(c.id) +
              '" class="rounded-full bg-teal px-3 py-1.5 text-sm font-semibold text-teal-on shadow-teal">Mark done</button>' +
              '<button type="button" data-action="snooze" data-id="' +
              escapeHtml(c.id) +
              '" class="rounded-full border border-rule bg-paper px-3 py-1.5 text-sm text-ink-soft hover:border-teal/50">Snooze +1 day</button>' +
              (c.type === 'kindle'
                ? '<button type="button" data-action="record-litter" data-mating="' +
                  escapeHtml(c.matingId) +
                  '" class="rounded-full border border-teal/40 bg-teal-soft px-3 py-1.5 text-sm font-medium text-teal-deep">Record litter</button>'
                : '') +
              '</div></div></li>'
            );
          })
          .join('') +
        '</ul>';
    }

    return (
      '<section aria-labelledby="today-heading">' +
      '<h2 id="today-heading" class="text-xl font-semibold text-ink">Today</h2>' +
      '<p class="mt-1 mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">Chores due today, overdue, or coming in the next seven days — nest box, kindling, wean, and process.</p>' +
      body +
      '</section>'
    );
  }

  function renderHerd() {
    var does = state.animals.filter(function (a) {
      return a.sex === 'doe';
    });
    var bucks = state.animals.filter(function (a) {
      return a.sex === 'buck';
    });
    var others = state.animals.filter(function (a) {
      return a.sex !== 'doe' && a.sex !== 'buck';
    });

    function card(a) {
      return (
        '<li class="rounded-paper border border-rule bg-paper p-4 shadow-paper-sm">' +
        '<div class="flex flex-wrap items-baseline justify-between gap-2">' +
        '<h3 class="text-base font-semibold text-ink">' +
        escapeHtml(a.name) +
        '</h3>' +
        '<span class="font-mono text-[0.68rem] uppercase tracking-wider text-ink-muted">' +
        escapeHtml(a.sex) +
        (a.status ? ' · ' + escapeHtml(a.status) : '') +
        '</span></div>' +
        '<p class="mt-2 text-sm text-ink-soft">' +
        (a.breed ? escapeHtml(a.breed) : 'Breed not noted') +
        (a.cage ? ' · cage ' + escapeHtml(a.cage) : '') +
        '</p>' +
        (a.notes
          ? '<p class="mt-2 text-sm leading-relaxed text-ink-muted">' +
            escapeHtml(a.notes) +
            '</p>'
          : '') +
        '</li>'
      );
    }

    function group(title, list) {
      if (!list.length) return '';
      return (
        '<div class="mb-6"><h3 class="mb-3 font-mono text-[0.7rem] uppercase tracking-widest text-ink-muted">' +
        escapeHtml(title) +
        '</h3><ul class="grid gap-3 sm:grid-cols-2">' +
        list.map(card).join('') +
        '</ul></div>'
      );
    }

    var empty =
      !state.animals.length
        ? '<div class="rounded-paper border border-dashed border-rule bg-paper-soft/60 p-6">' +
          '<p class="text-sm leading-relaxed text-ink-soft">No animals yet. Load the sample herd to explore the planner, or add a doe and buck below.</p>' +
          '<button type="button" data-action="load-sample" class="mt-4 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-teal-on shadow-teal">Load sample herd</button>' +
          '</div>'
        : '';

    return (
      '<section aria-labelledby="herd-heading">' +
      '<h2 id="herd-heading" class="text-xl font-semibold text-ink">Herd</h2>' +
      '<p class="mt-1 mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">Does, bucks, and grow-outs living in this local planner. Everything stays on this device.</p>' +
      empty +
      group('Does', does) +
      group('Bucks', bucks) +
      group('Grow-outs & others', others) +
      '<div class="mt-2 rounded-paper border border-rule bg-paper p-5 shadow-paper-sm">' +
      '<h3 class="text-base font-semibold text-ink">Add an animal</h3>' +
      '<p class="mt-1 mb-4 text-sm text-ink-muted">Name and sex are enough to plan a mating. Breed and cage are optional notes.</p>' +
      '<form id="add-animal-form" class="grid gap-3 sm:grid-cols-2">' +
      '<label class="block text-sm text-ink-soft">Name' +
      '<input name="name" required class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" placeholder="Clover" /></label>' +
      '<label class="block text-sm text-ink-soft">Sex' +
      '<select name="sex" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink">' +
      '<option value="doe">Doe</option><option value="buck">Buck</option><option value="grow-out">Grow-out</option>' +
      '</select></label>' +
      '<label class="block text-sm text-ink-soft">Breed' +
      '<input name="breed" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" placeholder="New Zealand White" /></label>' +
      '<label class="block text-sm text-ink-soft">Cage / location' +
      '<input name="cage" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" placeholder="A1" /></label>' +
      '<label class="block text-sm text-ink-soft sm:col-span-2">Notes' +
      '<input name="notes" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" placeholder="Optional" /></label>' +
      '<div class="sm:col-span-2"><button type="submit" class="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-teal-on shadow-teal">Save animal</button></div>' +
      '</form></div></section>'
    );
  }

  function renderMating() {
    var does = state.animals.filter(function (a) {
      return a.sex === 'doe';
    });
    var bucks = state.animals.filter(function (a) {
      return a.sex === 'buck';
    });
    var today = Schedule.todayIso();

    var doeOpts = does.length
      ? does
          .map(function (a) {
            return (
              '<option value="' +
              escapeHtml(a.id) +
              '">' +
              escapeHtml(a.name) +
              '</option>'
            );
          })
          .join('')
      : '<option value="">Add a doe first</option>';
    var buckOpts = bucks.length
      ? bucks
          .map(function (a) {
            return (
              '<option value="' +
              escapeHtml(a.id) +
              '">' +
              escapeHtml(a.name) +
              '</option>'
            );
          })
          .join('')
      : '<option value="">Add a buck first</option>';

    var recent =
      state.matings.length === 0
        ? '<p class="text-sm text-ink-muted">No matings logged yet.</p>'
        : '<ul class="space-y-3">' +
          state.matings
            .slice()
            .sort(function (a, b) {
              return a.date < b.date ? 1 : -1;
            })
            .map(function (m) {
              var chain = Schedule.buildChoreDates(
                m.date,
                m.kindleDate,
                state.settings
              );
              return (
                '<li class="rounded-paper border border-rule bg-paper p-4">' +
                '<p class="font-semibold text-ink">' +
                escapeHtml(doeName(m)) +
                ' × ' +
                escapeHtml(buckName(m)) +
                '</p>' +
                '<p class="mt-1 text-sm text-ink-muted">Mated ' +
                escapeHtml(formatDisplayDate(m.date)) +
                (m.kindleDate
                  ? ' · kindled ' + escapeHtml(formatDisplayDate(m.kindleDate))
                  : '') +
                '</p>' +
                '<p class="mt-2 font-mono text-[0.68rem] leading-relaxed text-ink-muted">' +
                chain
                  .map(function (c) {
                    return (
                      escapeHtml(c.type) +
                      ' ' +
                      escapeHtml(formatDisplayDate(c.dueDate))
                    );
                  })
                  .join(' · ') +
                '</p></li>'
              );
            })
            .join('') +
          '</ul>';

    return (
      '<section aria-labelledby="mating-heading">' +
      '<h2 id="mating-heading" class="text-xl font-semibold text-ink">Plan mating</h2>' +
      '<p class="mt-1 mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">Log a doe, buck, and date. The planner builds nest, kindle, wean, and process chores from your Settings offsets.</p>' +
      '<div class="rounded-paper border border-rule bg-paper p-5 shadow-paper-sm mb-8">' +
      '<form id="plan-mating-form" class="grid gap-3 sm:grid-cols-2">' +
      '<label class="block text-sm text-ink-soft">Doe<select name="doeId" required class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink">' +
      doeOpts +
      '</select></label>' +
      '<label class="block text-sm text-ink-soft">Buck<select name="buckId" required class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink">' +
      buckOpts +
      '</select></label>' +
      '<label class="block text-sm text-ink-soft">Mating date<input type="date" name="date" required value="' +
      escapeHtml(today) +
      '" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" /></label>' +
      '<label class="block text-sm text-ink-soft">Notes<input name="notes" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" placeholder="Observed, planned, …" /></label>' +
      '<div class="sm:col-span-2"><button type="submit" class="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-teal-on shadow-teal" ' +
      (!does.length || !bucks.length ? 'disabled' : '') +
      '>Save mating &amp; build schedule</button></div>' +
      '</form></div>' +
      '<h3 class="mb-3 font-mono text-[0.7rem] uppercase tracking-widest text-ink-muted">Recent matings</h3>' +
      recent +
      '</section>'
    );
  }

  function renderLitters() {
    var list =
      state.litters.length === 0
        ? '<div class="rounded-paper border border-dashed border-rule bg-paper-soft/60 p-6"><p class="text-sm leading-relaxed text-ink-soft">No litters recorded yet. When a kindling chore comes due, use Record litter from Today, or fill the form below.</p></div>'
        : '<ul class="space-y-3 mb-8">' +
          state.litters
            .slice()
            .sort(function (a, b) {
              return a.date < b.date ? 1 : -1;
            })
            .map(function (L) {
              var mating = matingById(L.matingId);
              return (
                '<li class="rounded-paper border border-rule bg-paper p-4 shadow-paper-sm">' +
                '<p class="font-semibold text-ink">' +
                (mating
                  ? escapeHtml(doeName(mating)) + ' × ' + escapeHtml(buckName(mating))
                  : 'Litter') +
                '</p>' +
                '<p class="mt-1 text-sm text-ink-muted">Kindled ' +
                escapeHtml(formatDisplayDate(L.date)) +
                ' · ' +
                Number(L.bornAlive || 0) +
                ' born alive' +
                (L.stillborn ? ', ' + Number(L.stillborn) + ' stillborn' : '') +
                '</p>' +
                (L.notes
                  ? '<p class="mt-2 text-sm leading-relaxed text-ink-soft">' +
                    escapeHtml(L.notes) +
                    '</p>'
                  : '') +
                '</li>'
              );
            })
            .join('') +
          '</ul>';

    var matingOpts = state.matings
      .slice()
      .sort(function (a, b) {
        return a.date < b.date ? 1 : -1;
      })
      .map(function (m) {
        return (
          '<option value="' +
          escapeHtml(m.id) +
          '">' +
          escapeHtml(doeName(m)) +
          ' × ' +
          escapeHtml(buckName(m)) +
          ' (' +
          escapeHtml(m.date) +
          ')</option>'
        );
      })
      .join('');

    return (
      '<section aria-labelledby="litters-heading">' +
      '<h2 id="litters-heading" class="text-xl font-semibold text-ink">Litters</h2>' +
      '<p class="mt-1 mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">Record born-alive and stillborn counts against a mating. That stamps the kindle date and shifts wean and process chores.</p>' +
      list +
      '<div class="rounded-paper border border-rule bg-paper p-5 shadow-paper-sm">' +
      '<h3 class="text-base font-semibold text-ink">Record a litter</h3>' +
      '<form id="record-litter-form" class="mt-4 grid gap-3 sm:grid-cols-2">' +
      '<label class="block text-sm text-ink-soft sm:col-span-2">Mating<select name="matingId" required class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink">' +
      (matingOpts || '<option value="">Plan a mating first</option>') +
      '</select></label>' +
      '<label class="block text-sm text-ink-soft">Kindle date<input type="date" name="date" required value="' +
      escapeHtml(Schedule.todayIso()) +
      '" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" /></label>' +
      '<label class="block text-sm text-ink-soft">Born alive<input type="number" name="bornAlive" min="0" value="8" required class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" /></label>' +
      '<label class="block text-sm text-ink-soft">Stillborn<input type="number" name="stillborn" min="0" value="0" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" /></label>' +
      '<label class="block text-sm text-ink-soft">Notes<input name="notes" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" /></label>' +
      '<div class="sm:col-span-2"><button type="submit" class="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-teal-on shadow-teal" ' +
      (!state.matings.length ? 'disabled' : '') +
      '>Save litter</button></div>' +
      '</form></div></section>'
    );
  }

  function renderSettings() {
    var s = state.settings;
    return (
      '<section aria-labelledby="settings-heading">' +
      '<h2 id="settings-heading" class="text-xl font-semibold text-ink">Settings</h2>' +
      '<p class="mt-1 mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">Tune the day offsets for this herd. Nest and kindle count from the mating date; wean and process count from the recorded kindle date, or the estimated kindle when none is recorded yet.</p>' +
      '<form id="settings-form" class="rounded-paper border border-rule bg-paper p-5 shadow-paper-sm grid gap-4 sm:grid-cols-2">' +
      field('nestOffsetDays', 'Nest box days after mating', s.nestOffsetDays, 'Default 27.') +
      field('kindleOffsetDays', 'Kindle days after mating', s.kindleOffsetDays, 'Default 31.') +
      field('weanDaysAfterKindle', 'Wean days after kindle', s.weanDaysAfterKindle, 'Default 28.') +
      field('processDaysAfterKindle', 'Process days after kindle', s.processDaysAfterKindle, 'Default 75.') +
      '<div class="sm:col-span-2 flex flex-wrap gap-2 pt-2">' +
      '<button type="submit" class="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-teal-on shadow-teal">Save offsets</button>' +
      '<button type="button" data-action="load-sample" class="rounded-full border border-rule bg-paper-soft px-4 py-2 text-sm text-ink-soft hover:border-teal/50">Reload sample herd</button>' +
      '<button type="button" data-action="clear-all" class="rounded-full border border-amber-400/50 bg-amber-50 px-4 py-2 text-sm text-amber-600">Clear all local data</button>' +
      '</div></form>' +
      '<p class="mt-6 text-sm leading-relaxed text-ink-muted">Data never leaves this browser. There is no account and no cloud sync in Phase 1. Pair this planner with <a class="text-teal font-medium underline-offset-2 hover:underline" href="https://frank-dixon.github.io/rabbit/">Progeny colors</a> when you want coat predictions for a planned cross.</p>' +
      '</section>'
    );

    function field(name, label, value, hint) {
      return (
        '<label class="block text-sm text-ink-soft">' +
        escapeHtml(label) +
        '<input type="number" name="' +
        name +
        '" min="1" max="200" required value="' +
        Number(value) +
        '" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink font-mono" />' +
        '<span class="mt-1 block text-xs text-ink-muted">' +
        escapeHtml(hint) +
        '</span></label>'
      );
    }
  }

  function render() {
    var root = document.getElementById('app-root');
    if (!root) return;
    var panel = '';
    if (activeTab === 'today') panel = renderToday();
    else if (activeTab === 'herd') panel = renderHerd();
    else if (activeTab === 'mating') panel = renderMating();
    else if (activeTab === 'litters') panel = renderLitters();
    else if (activeTab === 'settings') panel = renderSettings();

    root.innerHTML = renderFlash() + renderTabs() + panel;
    bind();
  }

  function recordLitterFromForm(form) {
    var fd = new FormData(form);
    var matingId = String(fd.get('matingId') || '');
    var mating = matingById(matingId);
    if (!mating) {
      setFlash('Choose a mating before recording a litter.');
      return;
    }
    var date = String(fd.get('date') || Schedule.todayIso());
    var litter = {
      id: Storage.uid('litter'),
      matingId: matingId,
      date: date,
      bornAlive: Number(fd.get('bornAlive') || 0),
      stillborn: Number(fd.get('stillborn') || 0),
      notes: String(fd.get('notes') || '').trim(),
    };
    state.litters.push(litter);
    mating.kindleDate = date;

    var kindleChore = state.chores.find(function (c) {
      return c.matingId === matingId && c.type === 'kindle' && !c.done;
    });
    if (kindleChore) {
      kindleChore.done = true;
      kindleChore.doneAt = date;
      kindleChore.snoozedTo = null;
    }

    refreshOpenChoresForMating(matingId);
    persist();
    activeTab = 'litters';
    setFlash(
      'Recorded litter for ' +
        doeName(mating) +
        ': ' +
        litter.bornAlive +
        ' born alive on ' +
        formatDisplayDate(date) +
        '.'
    );
  }

  function bind() {
    var root = document.getElementById('app-root');
    if (!root) return;

    root.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeTab = btn.getAttribute('data-tab');
        flashMessage = '';
        render();
      });
    });

    root.querySelectorAll('[data-action="done"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        markDone(btn.getAttribute('data-id'));
      });
    });

    root.querySelectorAll('[data-action="snooze"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        snoozeOne(btn.getAttribute('data-id'));
      });
    });

    root.querySelectorAll('[data-action="record-litter"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeTab = 'litters';
        flashMessage = '';
        render();
        var select = document.querySelector('#record-litter-form select[name="matingId"]');
        if (select) select.value = btn.getAttribute('data-mating');
      });
    });

    root.querySelectorAll('[data-action="load-sample"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (
          state.animals.length &&
          !window.confirm(
            'Replace the current herd, matings, litters, and chores with the sample herd?'
          )
        ) {
          return;
        }
        state = Storage.sampleHerd();
        persist();
        activeTab = 'today';
        setFlash('Sample herd loaded. Nest and kindle chores should appear on Today.');
      });
    });

    root.querySelectorAll('[data-action="clear-all"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (
          !window.confirm(
            'Clear every animal, mating, litter, and chore stored in this browser?'
          )
        ) {
          return;
        }
        Storage.clear();
        state = Storage.emptyState();
        persist();
        activeTab = 'today';
        setFlash('Local data cleared. This planner is empty again.');
      });
    });

    var animalForm = document.getElementById('add-animal-form');
    if (animalForm) {
      animalForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(animalForm);
        var sex = String(fd.get('sex') || 'doe');
        state.animals.push({
          id: Storage.uid('animal'),
          name: String(fd.get('name') || '').trim() || 'Unnamed',
          sex: sex,
          status: sex === 'grow-out' ? 'grow-out' : 'breeder',
          breed: String(fd.get('breed') || '').trim(),
          cage: String(fd.get('cage') || '').trim(),
          notes: String(fd.get('notes') || '').trim(),
        });
        persist();
        setFlash('Saved ' + String(fd.get('name') || 'animal') + ' to the herd.');
      });
    }

    var matingForm = document.getElementById('plan-mating-form');
    if (matingForm) {
      matingForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(matingForm);
        var mating = {
          id: Storage.uid('mating'),
          doeId: String(fd.get('doeId')),
          buckId: String(fd.get('buckId')),
          date: String(fd.get('date') || Schedule.todayIso()),
          notes: String(fd.get('notes') || '').trim(),
          kindleDate: null,
        };
        state.matings.push(mating);
        createMatingChores(mating);
        persist();
        activeTab = 'today';
        setFlash(
          'Mating saved for ' +
            doeName(mating) +
            ' × ' +
            buckName(mating) +
            '. Nest and kindle chores are on Today.'
        );
      });
    }

    var litterForm = document.getElementById('record-litter-form');
    if (litterForm) {
      litterForm.addEventListener('submit', function (e) {
        e.preventDefault();
        recordLitterFromForm(litterForm);
      });
    }

    var settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(settingsForm);
        state.settings = {
          nestOffsetDays: Number(fd.get('nestOffsetDays')) || 27,
          kindleOffsetDays: Number(fd.get('kindleOffsetDays')) || 31,
          weanDaysAfterKindle: Number(fd.get('weanDaysAfterKindle')) || 28,
          processDaysAfterKindle: Number(fd.get('processDaysAfterKindle')) || 75,
        };
        state.matings.forEach(function (m) {
          refreshOpenChoresForMating(m.id);
        });
        persist();
        setFlash('Schedule offsets saved. Open chores were recalculated.');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
  });
})();
