/**
 * Litter Planner — cream/paper UI wiring (plain JS, no framework).
 * Tabs: Today · Herd · Plan mating · Litters · History · Settings
 * Modes: guest (editable) · free account · sample barn (read-only)
 */
(function () {
  'use strict';

  var Storage = window.LitterStorage;
  var Schedule = window.LitterSchedule;
  var Auth = window.LitterAuth;

  if (!Storage || !Schedule || !Auth) {
    console.error('[LitterPlanner] storage.js, schedule.js, and auth.js must load first');
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
    { id: 'history', label: 'History' },
    { id: 'settings', label: 'Settings' },
  ];

  var AUTH_VIEWS = { none: 'none', login: 'login', signup: 'signup' };

  var state = Auth.loadActiveHerd();
  var activeTab = 'today';
  var flashMessage = '';
  var authView = AUTH_VIEWS.none;
  var authError = '';

  function user() {
    return Auth.currentUser();
  }

  function isReadOnly() {
    return Auth.isSample();
  }

  function persist() {
    var result = Auth.saveActiveHerd(state);
    if (result && result.ok === false) {
      setFlash(result.toast || Auth.SAMPLE_READ_ONLY_TOAST);
      // Reload pristine fixture so UI does not keep phantom edits
      state = Auth.loadActiveHerd();
      return false;
    }
    return true;
  }

  function guardWrite(actionFn) {
    if (isReadOnly()) {
      setFlash(Auth.SAMPLE_READ_ONLY_TOAST);
      return;
    }
    actionFn();
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
    guardWrite(function () {
      var chore = state.chores.find(function (c) {
        return c.id === choreId;
      });
      if (!chore) return;
      chore.done = true;
      chore.doneAt = Schedule.todayIso();
      chore.snoozedTo = null;
      if (!persist()) return;
      setFlash('Marked "' + (CHORE_LABELS[chore.type] || chore.type) + '" done.');
    });
  }

  function snoozeOne(choreId) {
    guardWrite(function () {
      var chore = state.chores.find(function (c) {
        return c.id === choreId;
      });
      if (!chore) return;
      var base = Schedule.effectiveDue(chore) || Schedule.todayIso();
      chore.snoozedTo = Schedule.addDays(base, 1);
      if (!persist()) return;
      setFlash(
        'Snoozed "' +
          (CHORE_LABELS[chore.type] || chore.type) +
          '" to ' +
          formatDisplayDate(chore.snoozedTo) +
          '.'
      );
    });
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

  function statusBanner() {
    var u = user();
    if (u.mode === 'sample') {
      var meta = Auth.sampleMeta();
      return (
        '<div class="mb-4 rounded-paper border border-teal/30 bg-teal-soft/80 px-4 py-3 text-sm leading-relaxed text-ink-soft" role="status">' +
        '<strong class="font-semibold text-ink">Browsing the sample barn</strong> (' +
        escapeHtml(meta.name) +
        '). This herd is read-only — try the tabs, then create a free account to save your own animals. Demo login: ' +
        '<span class="font-mono text-[0.8rem]">' +
        escapeHtml(meta.email) +
        '</span> / <span class="font-mono text-[0.8rem]">' +
        escapeHtml(meta.password) +
        '</span>.' +
        '</div>'
      );
    }
    if (u.mode === 'account') {
      return (
        '<div class="mb-4 rounded-paper border border-rule bg-paper px-4 py-3 text-sm leading-relaxed text-ink-muted" role="status">' +
        'Signed in as <strong class="font-semibold text-ink">' +
        escapeHtml(u.email) +
        '</strong>' +
        (u.name ? ' (' + escapeHtml(u.name) + ')' : '') +
        '. Your herd is saved in this browser on this device.' +
        '</div>'
      );
    }
    var hasAnimals = state.animals.length > 0;
    return (
      '<div class="mb-4 rounded-paper border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-ink-soft" role="status">' +
      '<strong class="font-semibold text-ink">You’re building a guest herd.</strong> Create a free account to keep it on this device.' +
      (hasAnimals
        ? ' <button type="button" data-auth="open-signup" class="ml-1 font-semibold text-teal underline-offset-2 hover:underline">Keep this herd — create free account</button>'
        : ' Start by adding animals under Herd, or <button type="button" data-auth="sample" class="font-semibold text-teal underline-offset-2 hover:underline">try the sample barn</button> first.') +
      '</div>'
    );
  }

  function renderAuthChrome() {
    var u = user();
    var buttons = '';
    if (u.mode === 'guest') {
      buttons =
        '<button type="button" data-auth="sample" class="rounded-full bg-teal px-3 py-1.5 text-sm font-semibold text-teal-on shadow-teal">Try the sample barn</button>' +
        '<button type="button" data-auth="open-login" class="rounded-full border border-rule bg-paper px-3 py-1.5 text-sm text-ink-soft hover:border-teal/50">Log in</button>' +
        '<button type="button" data-auth="open-signup" class="rounded-full border border-teal/40 bg-teal-soft px-3 py-1.5 text-sm font-medium text-teal-deep">Sign up</button>';
    } else if (u.mode === 'sample') {
      buttons =
        '<button type="button" data-auth="logout" class="rounded-full border border-rule bg-paper px-3 py-1.5 text-sm text-ink-soft hover:border-teal/50">Leave sample · start guest herd</button>' +
        '<button type="button" data-auth="open-signup" class="rounded-full bg-teal px-3 py-1.5 text-sm font-semibold text-teal-on shadow-teal">Create free account</button>';
    } else {
      buttons =
        '<button type="button" data-auth="logout" class="rounded-full border border-rule bg-paper px-3 py-1.5 text-sm text-ink-soft hover:border-teal/50">Log out</button>';
    }

    var label =
      u.mode === 'sample'
        ? 'Sample barn'
        : u.mode === 'account'
          ? escapeHtml(u.email)
          : 'Guest';

    return (
      '<div class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-paper border border-rule bg-paper px-4 py-3 shadow-paper-sm">' +
      '<p class="text-sm text-ink-muted">Account status: <span class="font-semibold text-ink">' +
      label +
      '</span></p>' +
      '<div class="flex flex-wrap gap-2">' +
      buttons +
      '</div></div>'
    );
  }

  function renderAuthPanel() {
    if (authView === AUTH_VIEWS.none) return '';
    var meta = Auth.sampleMeta();
    var err = authError
      ? '<p class="mb-3 rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm text-amber-600" role="alert">' +
        escapeHtml(authError) +
        '</p>'
      : '';

    if (authView === AUTH_VIEWS.login) {
      return (
        '<div class="mb-5 rounded-paper border border-rule bg-paper p-5 shadow-paper-sm" id="auth-panel">' +
        '<div class="flex flex-wrap items-start justify-between gap-2">' +
        '<h2 class="text-lg font-semibold text-ink">Log in</h2>' +
        '<button type="button" data-auth="close" class="text-sm text-ink-muted hover:text-ink">Close</button></div>' +
        '<p class="mt-1 mb-4 text-sm leading-relaxed text-ink-muted">Sign in to restore a herd saved on this device. Sample barn credentials are shown below.</p>' +
        err +
        '<form id="login-form" class="grid gap-3 sm:grid-cols-2">' +
        '<label class="block text-sm text-ink-soft sm:col-span-2">Email<input type="email" name="email" required autocomplete="username" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" placeholder="' +
        escapeHtml(meta.email) +
        '" /></label>' +
        '<label class="block text-sm text-ink-soft">Password<input type="password" name="password" required autocomplete="current-password" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" /></label>' +
        '<label class="flex items-end gap-2 text-sm text-ink-soft pb-2"><input type="checkbox" name="remember" checked class="rounded border-rule text-teal" /> Remember on this device</label>' +
        '<div class="sm:col-span-2 flex flex-wrap gap-2">' +
        '<button type="submit" class="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-teal-on shadow-teal">Log in</button>' +
        '<button type="button" data-auth="sample" class="rounded-full border border-teal/40 bg-teal-soft px-4 py-2 text-sm font-medium text-teal-deep">Try the sample barn</button>' +
        '<button type="button" data-auth="open-signup" class="rounded-full border border-rule bg-paper-soft px-4 py-2 text-sm text-ink-soft">Need an account? Sign up</button>' +
        '</div></form>' +
        '<p class="mt-4 font-mono text-[0.72rem] leading-relaxed text-ink-muted">Sample barn: ' +
        escapeHtml(meta.email) +
        ' / ' +
        escapeHtml(meta.password) +
        '</p></div>'
      );
    }

    // signup
    var herdHint = state.animals.length
      ? 'Your current guest herd (' +
        state.animals.length +
        ' animal' +
        (state.animals.length === 1 ? '' : 's') +
        ') will move into the new account.'
      : 'You can sign up now with an empty herd, then add animals — or build a guest herd first and use “Keep this herd”.';

    return (
      '<div class="mb-5 rounded-paper border border-rule bg-paper p-5 shadow-paper-sm" id="auth-panel">' +
      '<div class="flex flex-wrap items-start justify-between gap-2">' +
      '<h2 class="text-lg font-semibold text-ink">Create a free account</h2>' +
      '<button type="button" data-auth="close" class="text-sm text-ink-muted hover:text-ink">Close</button></div>' +
      '<p class="mt-1 mb-4 text-sm leading-relaxed text-ink-muted">' +
      escapeHtml(herdHint) +
      ' Accounts live only in this browser and aren’t a secure login, so don’t reuse a real password.</p>' +
      err +
      '<form id="signup-form" class="grid gap-3 sm:grid-cols-2">' +
      '<label class="block text-sm text-ink-soft sm:col-span-2">Email<input type="email" name="email" required autocomplete="username" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" placeholder="you@example.com" /></label>' +
      '<label class="block text-sm text-ink-soft">Password<input type="password" name="password" required minlength="4" autocomplete="new-password" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" /></label>' +
      '<label class="block text-sm text-ink-soft">Name <span class="text-ink-muted">(optional)</span><input type="text" name="name" autocomplete="name" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink" placeholder="Barn name or yours" /></label>' +
      '<div class="sm:col-span-2 flex flex-wrap gap-2">' +
      '<button type="submit" class="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-teal-on shadow-teal">Create account &amp; save herd</button>' +
      '<button type="button" data-auth="open-login" class="rounded-full border border-rule bg-paper-soft px-4 py-2 text-sm text-ink-soft">Already have an account?</button>' +
      '</div></form></div>'
    );
  }

  function writeDisabledAttr() {
    return isReadOnly() ? ' disabled aria-disabled="true" title="Sample barn is read-only"' : '';
  }

  function writeBtnClass(extra) {
    if (isReadOnly()) {
      return (
        (extra || '') +
        ' opacity-50 cursor-not-allowed'
      ).trim();
    }
    return extra || '';
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
        '<p class="text-ink leading-relaxed">This herd is empty. Try the sample barn to walk a lived-in nest → kindle → wean → process cycle, or add animals under Herd and plan a mating.</p>' +
        '<div class="mt-4 flex flex-wrap gap-2">' +
        '<button type="button" data-auth="sample" class="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-teal-on shadow-teal">Try the sample barn</button>' +
        '<button type="button" data-tab="herd" class="rounded-full border border-rule bg-paper px-4 py-2 text-sm text-ink-soft hover:border-teal/50">Go to Herd</button>' +
        '</div></div>';
    } else if (!rows.length) {
      body =
        '<div class="rounded-paper border border-rule bg-paper p-6 shadow-paper-sm">' +
        '<p class="text-ink leading-relaxed">Nothing is due in the next week. Enjoy the quiet barn day, or plan another mating when you are ready.</p>' +
        (isReadOnly()
          ? ''
          : '<button type="button" data-tab="mating" class="mt-4 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-teal-on shadow-teal">Plan a mating</button>') +
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
            var actions = isReadOnly()
              ? '<p class="text-xs text-ink-muted max-w-[12rem]">Browse only in the sample barn.</p>'
              : '<button type="button" data-action="done" data-id="' +
                escapeHtml(c.id) +
                '" class="' +
                writeBtnClass(
                  'rounded-full bg-teal px-3 py-1.5 text-sm font-semibold text-teal-on shadow-teal'
                ) +
                '">Mark done</button>' +
                '<button type="button" data-action="snooze" data-id="' +
                escapeHtml(c.id) +
                '" class="rounded-full border border-rule bg-paper px-3 py-1.5 text-sm text-ink-soft hover:border-teal/50">Snooze +1 day</button>' +
                (c.type === 'kindle'
                  ? '<button type="button" data-action="record-litter" data-mating="' +
                    escapeHtml(c.matingId) +
                    '" class="rounded-full border border-teal/40 bg-teal-soft px-3 py-1.5 text-sm font-medium text-teal-deep">Record litter</button>'
                  : '');
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
              actions +
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
          '<p class="text-sm leading-relaxed text-ink-soft">No animals yet. Try the sample barn to explore a lived-in herd, or add a doe and buck below.</p>' +
          '<button type="button" data-auth="sample" class="mt-4 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-teal-on shadow-teal">Try the sample barn</button>' +
          '</div>'
        : '';

    var addForm = isReadOnly()
      ? '<div class="mt-2 rounded-paper border border-dashed border-rule bg-paper-soft/60 p-5"><p class="text-sm leading-relaxed text-ink-muted">Adding animals is disabled in the sample barn. Create a free account (or leave sample for a guest herd) to build your own.</p></div>'
      : '<div class="mt-2 rounded-paper border border-rule bg-paper p-5 shadow-paper-sm">' +
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
        '</form></div>';

    return (
      '<section aria-labelledby="herd-heading">' +
      '<h2 id="herd-heading" class="text-xl font-semibold text-ink">Herd</h2>' +
      '<p class="mt-1 mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">Does, bucks, and grow-outs in this planner. Guest and free-account herds stay on this device.</p>' +
      empty +
      group('Does', does) +
      group('Bucks', bucks) +
      group('Grow-outs & others', others) +
      addForm +
      '</section>'
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
                (m.notes
                  ? '<p class="mt-2 text-sm leading-relaxed text-ink-soft">' +
                    escapeHtml(m.notes) +
                    '</p>'
                  : '') +
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

    var formBlock = isReadOnly()
      ? '<div class="rounded-paper border border-dashed border-rule bg-paper-soft/60 p-5 mb-8"><p class="text-sm leading-relaxed text-ink-muted">Planning new matings is disabled in the sample barn. Browse the recent matings below, then create a free account to schedule your own.</p></div>'
      : '<div class="rounded-paper border border-rule bg-paper p-5 shadow-paper-sm mb-8">' +
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
        '</form></div>';

    return (
      '<section aria-labelledby="mating-heading">' +
      '<h2 id="mating-heading" class="text-xl font-semibold text-ink">Plan mating</h2>' +
      '<p class="mt-1 mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">Log a doe, buck, and date. The planner builds nest, kindle, wean, and process chores from your Settings offsets.</p>' +
      formBlock +
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
                  ? escapeHtml(doeName(mating)) +
                    ' × ' +
                    escapeHtml(buckName(mating))
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

    var formBlock = isReadOnly()
      ? '<div class="rounded-paper border border-dashed border-rule bg-paper-soft/60 p-5"><p class="text-sm leading-relaxed text-ink-muted">Recording litters is disabled in the sample barn. Browse the litters above, then save your own herd with a free account.</p></div>'
      : '<div class="rounded-paper border border-rule bg-paper p-5 shadow-paper-sm">' +
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
        '</form></div>';

    return (
      '<section aria-labelledby="litters-heading">' +
      '<h2 id="litters-heading" class="text-xl font-semibold text-ink">Litters</h2>' +
      '<p class="mt-1 mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">Record born-alive and stillborn counts against a mating. That stamps the kindle date and shifts wean and process chores.</p>' +
      list +
      formBlock +
      '</section>'
    );
  }

  function renderHistory() {
    var notes = Array.isArray(state.historyNotes) ? state.historyNotes.slice() : [];
    notes.sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    });

    var doneChores = state.chores
      .filter(function (c) {
        return c.done;
      })
      .slice()
      .sort(function (a, b) {
        var da = a.doneAt || a.dueDate || '';
        var db = b.doneAt || b.dueDate || '';
        return da < db ? 1 : -1;
      });

    var notesBlock =
      notes.length === 0
        ? '<p class="text-sm text-ink-muted mb-6">No barn notes yet.</p>'
        : '<ul class="space-y-3 mb-8">' +
          notes
            .map(function (n) {
              return (
                '<li class="rounded-paper border border-rule bg-paper p-4 shadow-paper-sm">' +
                '<p class="font-mono text-[0.68rem] text-ink-muted">' +
                escapeHtml(formatDisplayDate(n.date)) +
                '</p>' +
                '<p class="mt-1 text-sm leading-relaxed text-ink-soft">' +
                escapeHtml(n.text) +
                '</p></li>'
              );
            })
            .join('') +
          '</ul>';

    var choresBlock =
      doneChores.length === 0
        ? '<p class="text-sm text-ink-muted">No completed chores yet.</p>'
        : '<ul class="space-y-2">' +
          doneChores
            .slice(0, 20)
            .map(function (c) {
              var mating = matingById(c.matingId);
              var who = mating
                ? doeName(mating) + ' × ' + buckName(mating)
                : 'Unlinked';
              return (
                '<li class="rounded-lg border border-rule/70 bg-paper-soft px-3 py-2 text-sm text-ink-soft">' +
                '<span class="font-medium text-ink">' +
                escapeHtml(CHORE_LABELS[c.type] || c.type) +
                '</span> · ' +
                escapeHtml(who) +
                ' · done ' +
                escapeHtml(formatDisplayDate(c.doneAt || c.dueDate)) +
                '</li>'
              );
            })
            .join('') +
          '</ul>';

    return (
      '<section aria-labelledby="history-heading">' +
      '<h2 id="history-heading" class="text-xl font-semibold text-ink">History</h2>' +
      '<p class="mt-1 mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">Barn notes and completed chores for this herd. Browse freely in the sample barn; edits stay with guest and free accounts.</p>' +
      '<h3 class="mb-3 font-mono text-[0.7rem] uppercase tracking-widest text-ink-muted">Barn notes</h3>' +
      notesBlock +
      '<h3 class="mb-3 font-mono text-[0.7rem] uppercase tracking-widest text-ink-muted">Completed chores</h3>' +
      choresBlock +
      '</section>'
    );
  }

  function renderSettings() {
    var s = state.settings;
    var formDisabled = isReadOnly();

    function field(name, label, value, hint) {
      return (
        '<label class="block text-sm text-ink-soft">' +
        escapeHtml(label) +
        '<input type="number" name="' +
        name +
        '" min="1" max="200" required value="' +
        Number(value) +
        '" class="mt-1 w-full rounded-lg border border-rule bg-paper-soft px-3 py-2 text-ink font-mono" ' +
        (formDisabled ? 'disabled' : '') +
        ' />' +
        '<span class="mt-1 block text-xs text-ink-muted">' +
        escapeHtml(hint) +
        '</span></label>'
      );
    }

    var actions = formDisabled
      ? '<p class="sm:col-span-2 text-sm leading-relaxed text-ink-muted">Settings writes are disabled in the sample barn. Leave the sample or create a free account to tune offsets for your own herd.</p>'
      : '<div class="sm:col-span-2 flex flex-wrap gap-2 pt-2">' +
        '<button type="submit" class="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-teal-on shadow-teal">Save offsets</button>' +
        '<button type="button" data-action="clear-all" class="rounded-full border border-amber-400/50 bg-amber-50 px-4 py-2 text-sm text-amber-600">Clear this herd’s local data</button>' +
        '</div>';

    return (
      '<section aria-labelledby="settings-heading">' +
      '<h2 id="settings-heading" class="text-xl font-semibold text-ink">Settings</h2>' +
      '<p class="mt-1 mb-5 max-w-2xl text-sm leading-relaxed text-ink-muted">Tune the day offsets for this herd. Nest and kindle count from the mating date; wean and process count from the recorded kindle date, or the estimated kindle when none is recorded yet.</p>' +
      '<form id="settings-form" class="rounded-paper border border-rule bg-paper p-5 shadow-paper-sm grid gap-4 sm:grid-cols-2">' +
      field('nestOffsetDays', 'Nest box days after mating', s.nestOffsetDays, 'Default 27.') +
      field(
        'kindleOffsetDays',
        'Kindle days after mating',
        s.kindleOffsetDays,
        'Default 31.'
      ) +
      field(
        'weanDaysAfterKindle',
        'Wean days after kindle',
        s.weanDaysAfterKindle,
        'Default 28.'
      ) +
      field(
        'processDaysAfterKindle',
        'Process days after kindle',
        s.processDaysAfterKindle,
        'Default 75.'
      ) +
      actions +
      '</form>' +
      '<p class="mt-6 text-sm leading-relaxed text-ink-muted">Free accounts and guest herds stay in this browser on this device. Changes in the sample barn are never saved. Pair this planner with the <a class="text-teal font-medium underline-offset-2 hover:underline" href="https://frank-dixon.github.io/rabbit/">Rabbit Progeny Predictor</a> when you want coat predictions for a planned cross.</p>' +
      '</section>'
    );
  }

  function render() {
    var root = document.getElementById('app-root');
    if (!root) return;
    var panel = '';
    if (activeTab === 'today') panel = renderToday();
    else if (activeTab === 'herd') panel = renderHerd();
    else if (activeTab === 'mating') panel = renderMating();
    else if (activeTab === 'litters') panel = renderLitters();
    else if (activeTab === 'history') panel = renderHistory();
    else if (activeTab === 'settings') panel = renderSettings();

    root.innerHTML =
      renderAuthChrome() +
      statusBanner() +
      renderAuthPanel() +
      renderFlash() +
      renderTabs() +
      panel;
    bind();
  }

  function recordLitterFromForm(form) {
    guardWrite(function () {
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
      if (!persist()) return;
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
    });
  }

  function bindAuth() {
    var root = document.getElementById('app-root');
    if (!root) return;

    root.querySelectorAll('[data-auth="sample"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var result = Auth.loginSample(true);
        state = result.state;
        authView = AUTH_VIEWS.none;
        authError = '';
        activeTab = 'today';
        setFlash(
          'Opened the sample barn. Browse Today, Herd, Litters, and History — writes stay disabled until you create your own account.'
        );
      });
    });

    root.querySelectorAll('[data-auth="open-login"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        authView = AUTH_VIEWS.login;
        authError = '';
        flashMessage = '';
        render();
      });
    });

    root.querySelectorAll('[data-auth="open-signup"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        authView = AUTH_VIEWS.signup;
        authError = '';
        flashMessage = '';
        render();
      });
    });

    root.querySelectorAll('[data-auth="close"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        authView = AUTH_VIEWS.none;
        authError = '';
        render();
      });
    });

    root.querySelectorAll('[data-auth="logout"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var result = Auth.logout();
        state = result.state;
        authView = AUTH_VIEWS.none;
        authError = '';
        activeTab = 'today';
        setFlash(
          'Logged out. You are back on a guest herd on this device — add animals, then create a free account to keep them.'
        );
      });
    });

    var loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(loginForm);
        var result = Auth.login(
          fd.get('email'),
          fd.get('password'),
          fd.get('remember') === 'on'
        );
        if (!result.ok) {
          authError = result.error;
          render();
          return;
        }
        state = result.state;
        authView = AUTH_VIEWS.none;
        authError = '';
        activeTab = 'today';
        var modeLabel =
          result.user.mode === 'sample' ? 'sample barn' : result.user.email;
        setFlash('Signed in to ' + modeLabel + '. Your herd is loaded.');
      });
    }

    var signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (Auth.isSample()) {
          // Leaving sample: signup should start from empty guest, not copy fixture
          Auth.logout();
          state = Auth.loadGuestHerd();
        }
        var fd = new FormData(signupForm);
        var result = Auth.signup(
          fd.get('email'),
          fd.get('password'),
          fd.get('name'),
          state,
          true
        );
        if (!result.ok) {
          authError = result.error;
          render();
          return;
        }
        state = result.state;
        authView = AUTH_VIEWS.none;
        authError = '';
        activeTab = 'today';
        setFlash(
          'Account created for ' +
            result.user.email +
            '. Your herd is saved on this device.'
        );
      });
    }
  }

  function bind() {
    var root = document.getElementById('app-root');
    if (!root) return;

    bindAuth();

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
        if (isReadOnly()) {
          setFlash(Auth.SAMPLE_READ_ONLY_TOAST);
          return;
        }
        activeTab = 'litters';
        flashMessage = '';
        render();
        var select = document.querySelector(
          '#record-litter-form select[name="matingId"]'
        );
        if (select) select.value = btn.getAttribute('data-mating');
      });
    });

    root.querySelectorAll('[data-action="clear-all"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (isReadOnly()) {
          setFlash(Auth.SAMPLE_READ_ONLY_TOAST);
          return;
        }
        if (
          !window.confirm(
            'Clear every animal, mating, litter, and chore stored for this herd on this device?'
          )
        ) {
          return;
        }
        var cleared = Auth.clearCurrentAccountData();
        if (cleared && cleared.ok === false) {
          setFlash(cleared.toast || Auth.SAMPLE_READ_ONLY_TOAST);
          return;
        }
        state = Auth.loadActiveHerd();
        activeTab = 'today';
        setFlash('Local herd data cleared for this account.');
      });
    });

    var animalForm = document.getElementById('add-animal-form');
    if (animalForm) {
      animalForm.addEventListener('submit', function (e) {
        e.preventDefault();
        guardWrite(function () {
          var fd = new FormData(animalForm);
          var sex = String(fd.get('sex') || 'doe');
          var name = String(fd.get('name') || '').trim() || 'Unnamed';
          state.animals.push({
            id: Storage.uid('animal'),
            name: name,
            sex: sex,
            status: sex === 'grow-out' ? 'grow-out' : 'breeder',
            breed: String(fd.get('breed') || '').trim(),
            cage: String(fd.get('cage') || '').trim(),
            notes: String(fd.get('notes') || '').trim(),
          });
          if (!persist()) return;
          setFlash('Saved ' + name + ' to the herd.');
        });
      });
    }

    var matingForm = document.getElementById('plan-mating-form');
    if (matingForm) {
      matingForm.addEventListener('submit', function (e) {
        e.preventDefault();
        guardWrite(function () {
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
          if (!persist()) return;
          activeTab = 'today';
          setFlash(
            'Mating saved for ' +
              doeName(mating) +
              ' × ' +
              buckName(mating) +
              '. Nest and kindle chores are on Today.'
          );
        });
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
        guardWrite(function () {
          var fd = new FormData(settingsForm);
          state.settings = {
            nestOffsetDays: Number(fd.get('nestOffsetDays')) || 27,
            kindleOffsetDays: Number(fd.get('kindleOffsetDays')) || 31,
            weanDaysAfterKindle: Number(fd.get('weanDaysAfterKindle')) || 28,
            processDaysAfterKindle:
              Number(fd.get('processDaysAfterKindle')) || 75,
          };
          state.matings.forEach(function (m) {
            refreshOpenChoresForMating(m.id);
          });
          if (!persist()) return;
          setFlash('Schedule offsets saved. Open chores were recalculated.');
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
  });
})();
