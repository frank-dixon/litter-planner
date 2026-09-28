/**
 * Client-side accounts for GitHub Pages (static).
 * Demo-grade password check — not production security.
 * Guest herd → free account migration; sample barn is read-only fixture.
 */
(function (global) {
  'use strict';

  var ACCOUNTS_KEY = 'litter-planner-accounts-v1';
  var SESSION_KEY = 'litter-planner-session-v1';
  var GUEST_KEY = 'litter-planner-guest-v1';
  var LEGACY_KEY = 'litter-planner-v1';

  var SAMPLE_READ_ONLY_TOAST =
    'The sample barn is read-only. Create a free account to save your own herd.';

  function uid(prefix) {
    return (
      (prefix || 'user') +
      '-' +
      Date.now().toString(36) +
      '-' +
      Math.random().toString(36).slice(2, 8)
    );
  }

  /** Demo-grade hash only — do not use for real credentials. */
  function hashPassword(password) {
    var s = String(password || '');
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return 'demo:' + (h >>> 0).toString(16) + ':' + s.length;
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[LitterAuth] read failed', key, err);
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function userDataKey(userId) {
    return 'litter-planner-user-' + userId + '-v1';
  }

  function listAccounts() {
    var list = readJson(ACCOUNTS_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveAccounts(list) {
    writeJson(ACCOUNTS_KEY, list);
  }

  function findAccountByEmail(email) {
    var needle = String(email || '')
      .trim()
      .toLowerCase();
    return listAccounts().find(function (a) {
      return a.email === needle;
    });
  }

  function findAccountById(id) {
    return listAccounts().find(function (a) {
      return a.id === id;
    });
  }

  function getSession() {
    try {
      var raw =
        localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (!raw) return { mode: 'guest', userId: null, remember: false };
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return { mode: 'guest', userId: null, remember: false };
      }
      if (parsed.mode === 'sample') {
        return { mode: 'sample', userId: 'sample', remember: !!parsed.remember };
      }
      if (parsed.mode === 'account' && parsed.userId) {
        return {
          mode: 'account',
          userId: parsed.userId,
          remember: !!parsed.remember,
        };
      }
      return { mode: 'guest', userId: null, remember: false };
    } catch (err) {
      return { mode: 'guest', userId: null, remember: false };
    }
  }

  function setSession(session) {
    var payload = JSON.stringify({
      mode: session.mode || 'guest',
      userId: session.userId || null,
      remember: !!session.remember,
    });
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (session.mode === 'guest') return;
    if (session.remember) localStorage.setItem(SESSION_KEY, payload);
    else sessionStorage.setItem(SESSION_KEY, payload);
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  function emptyHerd() {
    var Storage = global.LitterStorage;
    if (Storage && Storage.emptyState) return Storage.emptyState();
    return {
      animals: [],
      matings: [],
      litters: [],
      chores: [],
      settings: {
        nestOffsetDays: 27,
        kindleOffsetDays: 31,
        weanDaysAfterKindle: 28,
        processDaysAfterKindle: 75,
      },
      historyNotes: [],
    };
  }

  function normalizeHerd(parsed) {
    var base = emptyHerd();
    if (!parsed || typeof parsed !== 'object') return base;
    return {
      animals: Array.isArray(parsed.animals) ? parsed.animals : [],
      matings: Array.isArray(parsed.matings) ? parsed.matings : [],
      litters: Array.isArray(parsed.litters) ? parsed.litters : [],
      chores: Array.isArray(parsed.chores) ? parsed.chores : [],
      settings: Object.assign({}, base.settings, parsed.settings || {}),
      historyNotes: Array.isArray(parsed.historyNotes) ? parsed.historyNotes : [],
    };
  }

  function migrateLegacyGuest() {
    try {
      if (localStorage.getItem(GUEST_KEY)) return;
      var legacy = localStorage.getItem(LEGACY_KEY);
      if (!legacy) return;
      localStorage.setItem(GUEST_KEY, legacy);
      localStorage.removeItem(LEGACY_KEY);
    } catch (err) {
      console.warn('[LitterAuth] legacy migrate failed', err);
    }
  }

  function loadGuestHerd() {
    migrateLegacyGuest();
    return normalizeHerd(readJson(GUEST_KEY, null));
  }

  function saveGuestHerd(state) {
    writeJson(GUEST_KEY, normalizeHerd(state));
  }

  function loadAccountHerd(userId) {
    return normalizeHerd(readJson(userDataKey(userId), null));
  }

  function saveAccountHerd(userId, state) {
    writeJson(userDataKey(userId), normalizeHerd(state));
  }

  function sampleMeta() {
    var Fixture = global.LitterSampleFixture;
    return {
      id: (Fixture && Fixture.USER_ID) || 'sample',
      email: (Fixture && Fixture.EMAIL) || 'sample@litterplanner.demo',
      name: (Fixture && Fixture.NAME) || 'Sample barn',
      password: (Fixture && Fixture.PASSWORD) || 'sample',
    };
  }

  function loadSampleHerd() {
    var Fixture = global.LitterSampleFixture;
    if (Fixture && typeof Fixture.build === 'function') {
      return normalizeHerd(Fixture.build());
    }
    return emptyHerd();
  }

  function currentUser() {
    var session = getSession();
    if (session.mode === 'sample') {
      var meta = sampleMeta();
      return {
        id: meta.id,
        email: meta.email,
        name: meta.name,
        mode: 'sample',
        readOnly: true,
      };
    }
    if (session.mode === 'account' && session.userId) {
      var acct = findAccountById(session.userId);
      if (!acct) {
        clearSession();
        return { id: null, email: null, name: null, mode: 'guest', readOnly: false };
      }
      return {
        id: acct.id,
        email: acct.email,
        name: acct.name || '',
        mode: 'account',
        readOnly: false,
      };
    }
    return { id: null, email: null, name: null, mode: 'guest', readOnly: false };
  }

  function isSample() {
    return getSession().mode === 'sample';
  }

  function isGuest() {
    return getSession().mode === 'guest' || !getSession().mode;
  }

  function isAccount() {
    return getSession().mode === 'account';
  }

  function loadActiveHerd() {
    var session = getSession();
    if (session.mode === 'sample') return loadSampleHerd();
    if (session.mode === 'account' && session.userId) {
      return loadAccountHerd(session.userId);
    }
    return loadGuestHerd();
  }

  /**
   * Persist herd for the active session.
   * Sample barn: never write — returns { ok:false, toast }.
   */
  function saveActiveHerd(state) {
    var session = getSession();
    if (session.mode === 'sample') {
      return { ok: false, toast: SAMPLE_READ_ONLY_TOAST };
    }
    if (session.mode === 'account' && session.userId) {
      saveAccountHerd(session.userId, state);
      return { ok: true };
    }
    saveGuestHerd(state);
    return { ok: true };
  }

  function loginSample(remember) {
    setSession({ mode: 'sample', userId: 'sample', remember: !!remember });
    return { ok: true, user: currentUser(), state: loadSampleHerd() };
  }

  function login(email, password, remember) {
    var meta = sampleMeta();
    var em = String(email || '')
      .trim()
      .toLowerCase();
    var pw = String(password || '');
    if (em === meta.email.toLowerCase() && pw === meta.password) {
      return loginSample(remember);
    }
    var acct = findAccountByEmail(em);
    if (!acct || acct.passwordHash !== hashPassword(pw)) {
      return {
        ok: false,
        error:
          'That email and password did not match an account on this device. Try again, or create a free account.',
      };
    }
    setSession({ mode: 'account', userId: acct.id, remember: !!remember });
    return { ok: true, user: currentUser(), state: loadAccountHerd(acct.id) };
  }

  function signup(email, password, name, guestState, remember) {
    var em = String(email || '')
      .trim()
      .toLowerCase();
    var pw = String(password || '');
    var nm = String(name || '').trim();
    if (!em || em.indexOf('@') < 1) {
      return { ok: false, error: 'Enter a valid email address to create your free account.' };
    }
    if (pw.length < 4) {
      return {
        ok: false,
        error: 'Choose a password with at least four characters for this portfolio demo.',
      };
    }
    var meta = sampleMeta();
    if (em === meta.email.toLowerCase()) {
      return {
        ok: false,
        error:
          'That email is reserved for the sample barn. Pick a different address for your own herd.',
      };
    }
    if (findAccountByEmail(em)) {
      return {
        ok: false,
        error: 'An account with that email already exists on this device. Log in instead.',
      };
    }
    var id = uid('user');
    var accounts = listAccounts();
    accounts.push({
      id: id,
      email: em,
      name: nm,
      passwordHash: hashPassword(pw),
      createdAt: new Date().toISOString(),
    });
    saveAccounts(accounts);

    var herd = normalizeHerd(guestState || loadGuestHerd());
    saveAccountHerd(id, herd);
    // Clear guest so a later guest session starts fresh
    saveGuestHerd(emptyHerd());
    setSession({ mode: 'account', userId: id, remember: remember !== false });
    return { ok: true, user: currentUser(), state: herd };
  }

  function logout() {
    clearSession();
    return { ok: true, user: currentUser(), state: loadGuestHerd() };
  }

  function clearGuestData() {
    saveGuestHerd(emptyHerd());
  }

  function clearCurrentAccountData() {
    var session = getSession();
    if (session.mode === 'sample') {
      return { ok: false, toast: SAMPLE_READ_ONLY_TOAST };
    }
    if (session.mode === 'account' && session.userId) {
      saveAccountHerd(session.userId, emptyHerd());
      return { ok: true };
    }
    clearGuestData();
    return { ok: true };
  }

  global.LitterAuth = {
    ACCOUNTS_KEY: ACCOUNTS_KEY,
    SESSION_KEY: SESSION_KEY,
    GUEST_KEY: GUEST_KEY,
    SAMPLE_READ_ONLY_TOAST: SAMPLE_READ_ONLY_TOAST,
    hashPassword: hashPassword,
    getSession: getSession,
    currentUser: currentUser,
    isSample: isSample,
    isGuest: isGuest,
    isAccount: isAccount,
    loadActiveHerd: loadActiveHerd,
    saveActiveHerd: saveActiveHerd,
    loadGuestHerd: loadGuestHerd,
    saveGuestHerd: saveGuestHerd,
    login: login,
    loginSample: loginSample,
    signup: signup,
    logout: logout,
    clearGuestData: clearGuestData,
    clearCurrentAccountData: clearCurrentAccountData,
    sampleMeta: sampleMeta,
    emptyHerd: emptyHerd,
  };
})(typeof window !== 'undefined' ? window : globalThis);
