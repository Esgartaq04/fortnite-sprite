/* ============================================================
   SpriteTracker — vanilla JS, 100% client-side.
   Data lives in localStorage under  spriteData_<Username>
   ============================================================ */
(function () {
  'use strict';

  /* ---------- constants ---------- */

  var STATUSES = [
    { key: 'none',     label: "Don't Have" },
    { key: 'acquired', label: 'Acquired'   },
    { key: 'mastered', label: 'Mastered'   }
  ];

  var RARITY_COLORS = {
    Common:    '#9aa4b2',
    Uncommon:  '#4ade80',
    Rare:      '#38bdf8',
    Epic:      '#a78bfa',
    Legendary: '#fb923c',
    Mythic:    '#fbbf24',
    Icon:      '#22d3ee'
  };

  var RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Icon'];

  var SESSION_KEY = 'spriteTracker.session';
  var USERS_KEY   = 'spriteTracker.users';
  var DATA_PREFIX = 'spriteData_';

  /* A starter list the user can load, edit or delete freely. */
  var STARTER_PACK = [
    ['Renegade Raider', 'Rare'], ['Black Knight', 'Legendary'], ['Skull Trooper', 'Epic'],
    ['Ghoul Trooper', 'Epic'], ['Raven', 'Legendary'], ['Omega', 'Legendary'],
    ['Drift', 'Legendary'], ['Ikonik', 'Icon'], ['Travis Scott', 'Icon'],
    ['Midas', 'Legendary'], ['Peely', 'Epic'], ['Fishstick', 'Rare'],
    ['Aura', 'Uncommon'], ['Crystal', 'Uncommon'], ['Recon Expert', 'Rare'],
    ['Star Wand', 'Rare'], ['Reaper Pickaxe', 'Legendary'], ['Minty Pickaxe', 'Rare'],
    ['Floss Emote', 'Rare'], ['Take the L', 'Rare']
  ];

  /* ---------- element lookup ---------- */

  function $(id) { return document.getElementById(id); }

  var el = {
    loginView:   $('view-login'),
    loginForm:   $('login-form'),
    loginInput:  $('login-username'),
    loginError:  $('login-error'),
    knownWrap:   $('known-users-wrap'),
    knownList:   $('known-users'),

    appView:     $('view-app'),
    userName:    $('user-name'),
    userAvatar:  $('user-avatar'),
    logout:      $('btn-logout'),

    statTotal:    $('stat-total'),
    statAcquired: $('stat-acquired'),
    statMastered: $('stat-mastered'),
    statMissing:  $('stat-missing'),
    progressBar:  $('progress-bar'),
    progressText: $('progress-text'),
    progressWrap: $('progress-wrap'),

    addForm:   $('add-form'),
    addName:   $('add-name'),
    addRarity: $('add-rarity'),

    search:  $('search'),
    filters: document.querySelector('.filters'),
    grid:    $('grid'),
    empty:   $('empty'),
    emptyText: $('empty-text'),
    seed:    $('btn-seed'),

    tradeBtn:    $('btn-trade'),
    tradeModal:  $('modal-trade'),
    tradeOutput: $('trade-output'),
    tradeFormats: document.querySelector('#modal-trade .seg'),
    copyBtn:     $('btn-copy'),
    downloadBtn: $('btn-download'),

    confirmModal: $('modal-confirm'),
    confirmTitle: $('confirm-title'),
    confirmText:  $('confirm-text'),
    confirmYes:   $('confirm-yes'),

    exportBtn: $('btn-export'),
    importBtn: $('btn-import'),
    importFile: $('file-import'),
    wipeBtn:   $('btn-wipe'),

    toast:      $('toast'),
    installBtn: $('btn-install')
  };

  /* ---------- state ---------- */

  var state = {
    user: null,
    items: [],
    filter: 'all',
    query: '',
    tradeFormat: 'grouped'
  };

  var confirmAction = null;
  var toastTimer = null;
  var deferredInstall = null;

  /* ============================================================
     STORAGE  ("mini local database")
     ============================================================ */

  function safeGet(key) {
    try { return window.localStorage.getItem(key); }
    catch (e) { return null; }
  }

  function safeSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; }
    catch (e) {
      toast('Could not save — browser storage is full or blocked.');
      return false;
    }
  }

  function dataKey(user) { return DATA_PREFIX + user; }

  function loadItems(user) {
    var raw = safeGet(dataKey(user));
    if (!raw) return [];
    var parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) { return []; }
    return normalizeItems(parsed);
  }

  /* Accepts either the current array format or anything close to it. */
  function normalizeItems(parsed) {
    var list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.items) ? parsed.items : []);
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var raw = list[i];
      if (typeof raw === 'string') raw = { name: raw };
      if (!raw || typeof raw.name !== 'string') continue;
      var name = raw.name.trim().slice(0, 60);
      if (!name) continue;
      out.push({
        id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
        name: name,
        rarity: RARITY_COLORS[raw.rarity] ? raw.rarity : 'Epic',
        status: statusKey(raw.status),
        added: typeof raw.added === 'number' ? raw.added : Date.now()
      });
    }
    return out;
  }

  /* Tolerates both internal keys and the human labels. */
  function statusKey(value) {
    if (typeof value !== 'string') return 'none';
    var v = value.trim().toLowerCase();
    if (v === 'acquired') return 'acquired';
    if (v === 'mastered') return 'mastered';
    return 'none';
  }

  function statusLabel(key) {
    for (var i = 0; i < STATUSES.length; i++) {
      if (STATUSES[i].key === key) return STATUSES[i].label;
    }
    return STATUSES[0].label;
  }

  function save() {
    if (!state.user) return;
    safeSet(dataKey(state.user), JSON.stringify(state.items));
  }

  function uid() {
    return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- known users on this device ---------- */

  function knownUsers() {
    var raw = safeGet(USERS_KEY);
    if (!raw) return [];
    try {
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list.filter(function (u) { return typeof u === 'string' && u; }) : [];
    } catch (e) { return []; }
  }

  function rememberUser(name) {
    var users = knownUsers().filter(function (u) { return u.toLowerCase() !== name.toLowerCase(); });
    users.unshift(name);
    safeSet(USERS_KEY, JSON.stringify(users.slice(0, 8)));
  }

  function forgetUser(name) {
    var users = knownUsers().filter(function (u) { return u.toLowerCase() !== name.toLowerCase(); });
    safeSet(USERS_KEY, JSON.stringify(users));
  }

  /* ============================================================
     LOGIN
     ============================================================ */

  var NAME_RE = /^[A-Za-z0-9 ._-]{2,24}$/;

  function cleanName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function showLoginError(message) {
    if (!message) { el.loginError.hidden = true; return; }
    el.loginError.textContent = message;
    el.loginError.hidden = false;
  }

  function renderKnownUsers() {
    var users = knownUsers();
    el.knownList.textContent = '';
    el.knownWrap.hidden = users.length === 0;
    users.forEach(function (name) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'userchip';
      btn.textContent = name;
      var count = loadItems(name).length;
      var meta = document.createElement('span');
      meta.style.color = 'var(--muted)';
      meta.style.fontSize = '12px';
      meta.textContent = count + (count === 1 ? ' item' : ' items');
      btn.appendChild(meta);
      btn.addEventListener('click', function () { login(name); });
      el.knownList.appendChild(btn);
    });
  }

  function login(name) {
    state.user = name;
    state.items = loadItems(name);
    state.filter = 'all';
    state.query = '';
    el.search.value = '';
    setActiveChip('all');

    rememberUser(name);
    safeSet(SESSION_KEY, name);

    el.userName.textContent = name;
    el.userAvatar.textContent = name.charAt(0).toUpperCase();
    document.title = name + ' · Sprite Tracker';

    el.loginView.hidden = true;
    el.appView.hidden = false;
    window.scrollTo(0, 0);
    render();
  }

  function logout() {
    save();
    try { window.localStorage.removeItem(SESSION_KEY); } catch (e) {}
    state.user = null;
    state.items = [];
    document.title = 'Sprite Tracker';
    el.appView.hidden = true;
    el.loginView.hidden = false;
    el.loginInput.value = '';
    showLoginError('');
    renderKnownUsers();
    el.loginInput.focus();
  }

  el.loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = cleanName(el.loginInput.value);
    if (!name) { showLoginError('Enter a username to continue.'); return; }
    if (!NAME_RE.test(name)) {
      showLoginError('2–24 characters: letters, numbers, spaces, . _ - only.');
      return;
    }
    // Reuse the stored spelling if this player already exists on the device.
    var existing = knownUsers().filter(function (u) { return u.toLowerCase() === name.toLowerCase(); })[0];
    showLoginError('');
    login(existing || name);
  });

  el.loginInput.addEventListener('input', function () { showLoginError(''); });

  el.logout.addEventListener('click', logout);

  /* ============================================================
     RENDERING
     ============================================================ */

  function visibleItems() {
    var q = state.query.toLowerCase();
    return state.items.filter(function (item) {
      if (state.filter !== 'all' && item.status !== state.filter) return false;
      if (q && item.name.toLowerCase().indexOf(q) === -1 && item.rarity.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function sortItems(list) {
    return list.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  function render() {
    renderStats();
    renderGrid();
  }

  function renderStats() {
    var total = state.items.length;
    var acquired = 0, mastered = 0;
    state.items.forEach(function (i) {
      if (i.status === 'acquired') acquired++;
      else if (i.status === 'mastered') mastered++;
    });
    var owned = acquired + mastered;

    el.statTotal.textContent = total;
    el.statAcquired.textContent = acquired;
    el.statMastered.textContent = mastered;
    el.statMissing.textContent = total - owned;

    var pct = total ? Math.round((owned / total) * 100) : 0;
    el.progressBar.style.width = pct + '%';
    el.progressText.textContent = pct + '% collected (' + owned + '/' + total + ')';
    el.progressWrap.setAttribute('aria-label', 'Collection progress: ' + pct + ' percent');
  }

  function renderGrid() {
    var list = sortItems(visibleItems());
    el.grid.textContent = '';

    if (!state.items.length) {
      el.empty.hidden = false;
      el.emptyText.textContent = 'Add your first sprite above to start tracking.';
      el.seed.hidden = false;
      return;
    }
    if (!list.length) {
      el.empty.hidden = false;
      el.emptyText.textContent = 'No sprites match this filter or search.';
      el.seed.hidden = true;
      return;
    }
    el.empty.hidden = true;

    var frag = document.createDocumentFragment();
    list.forEach(function (item) { frag.appendChild(buildCard(item)); });
    el.grid.appendChild(frag);
  }

  function buildCard(item) {
    var card = document.createElement('article');
    card.className = 'card' + (item.status === 'acquired' ? ' is-acquired' : item.status === 'mastered' ? ' is-mastered' : '');
    card.dataset.id = item.id;
    card.style.setProperty('--rarity', RARITY_COLORS[item.rarity] || RARITY_COLORS.Epic);

    var top = document.createElement('div');
    top.className = 'card__top';

    var nameWrap = document.createElement('div');
    nameWrap.style.flex = '1';
    nameWrap.style.minWidth = '0';

    var name = document.createElement('div');
    name.className = 'card__name';
    name.textContent = item.name;               // textContent → no HTML injection

    var tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = item.rarity === 'Icon' ? 'Icon Series' : item.rarity;

    nameWrap.appendChild(name);
    nameWrap.appendChild(tag);

    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'iconbtn card__del';
    del.dataset.action = 'delete';
    del.setAttribute('aria-label', 'Delete ' + item.name);
    del.textContent = '×';

    top.appendChild(nameWrap);
    top.appendChild(del);

    var seg = document.createElement('div');
    seg.className = 'seg';
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', 'Status for ' + item.name);

    STATUSES.forEach(function (s) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'seg__btn' + (item.status === s.key ? ' is-active' : '');
      btn.dataset.action = 'status';
      btn.dataset.status = s.key;
      btn.textContent = s.label;
      btn.setAttribute('aria-pressed', item.status === s.key ? 'true' : 'false');
      seg.appendChild(btn);
    });

    card.appendChild(top);
    card.appendChild(seg);
    return card;
  }

  function findItem(id) {
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) return state.items[i];
    }
    return null;
  }

  /* ---------- grid interactions (event delegation) ---------- */

  el.grid.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var card = btn.closest('.card');
    if (!card) return;
    var item = findItem(card.dataset.id);
    if (!item) return;

    if (btn.dataset.action === 'status') {
      if (item.status === btn.dataset.status) return;
      item.status = btn.dataset.status;
      save();
      render();
    } else if (btn.dataset.action === 'delete') {
      askConfirm('Delete sprite?', 'Remove "' + item.name + '" from your list?', 'Delete', function () {
        state.items = state.items.filter(function (i) { return i.id !== item.id; });
        save();
        render();
        toast('Deleted "' + item.name + '"');
      });
    }
  });

  /* ---------- add / filter / search ---------- */

  el.addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = cleanName(el.addName.value).slice(0, 60);
    if (!name) return;

    var duplicate = state.items.some(function (i) { return i.name.toLowerCase() === name.toLowerCase(); });
    if (duplicate) {
      toast('"' + name + '" is already on your list.');
      el.addName.select();
      return;
    }

    state.items.push({
      id: uid(),
      name: name,
      rarity: el.addRarity.value,
      status: 'none',
      added: Date.now()
    });
    save();
    el.addName.value = '';
    el.addName.focus();
    render();
    toast('Added "' + name + '"');
  });

  function setActiveChip(filter) {
    var chips = el.filters.querySelectorAll('.chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('is-active', chips[i].dataset.filter === filter);
    }
  }

  el.filters.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    state.filter = chip.dataset.filter;
    setActiveChip(state.filter);
    renderGrid();
  });

  el.search.addEventListener('input', function () {
    state.query = el.search.value.trim();
    renderGrid();
  });

  el.seed.addEventListener('click', function () {
    var added = 0;
    STARTER_PACK.forEach(function (entry) {
      var exists = state.items.some(function (i) { return i.name.toLowerCase() === entry[0].toLowerCase(); });
      if (exists) return;
      state.items.push({ id: uid(), name: entry[0], rarity: entry[1], status: 'none', added: Date.now() });
      added++;
    });
    save();
    render();
    toast('Loaded ' + added + ' starter sprites');
  });

  /* ============================================================
     TRADE LIST (convert / export)
     ============================================================ */

  function ownedItems() {
    return sortItems(state.items.filter(function (i) { return i.status !== 'none'; }));
  }

  function buildTradeList(format) {
    var owned = ownedItems();
    var stamp = new Date().toLocaleDateString();

    if (!owned.length) {
      return "== " + state.user + "'s Fortnite Sprite List ==\n\n" +
             'Nothing marked as Acquired or Mastered yet.\n' +
             'Set a sprite to "Acquired" or "Mastered" and generate the list again.';
    }

    if (format === 'csv') {
      var rows = ['Name,Rarity,Status'];
      owned.forEach(function (i) {
        rows.push([csv(i.name), csv(i.rarity === 'Icon' ? 'Icon Series' : i.rarity), csv(statusLabel(i.status))].join(','));
      });
      return rows.join('\n');
    }

    var lines = [];
    lines.push("== " + state.user + "'s Fortnite Sprite List ==");
    lines.push('Generated ' + stamp + ' · ' + owned.length + ' item' + (owned.length === 1 ? '' : 's'));
    lines.push('');

    if (format === 'flat') {
      owned.forEach(function (i) {
        lines.push('- ' + i.name + ' [' + i.rarity + '] — ' + statusLabel(i.status));
      });
    } else {
      // grouped: Mastered block, then Acquired block, rarity-sorted inside each
      [['mastered', 'MASTERED'], ['acquired', 'ACQUIRED']].forEach(function (group) {
        var members = owned.filter(function (i) { return i.status === group[0]; })
          .sort(function (a, b) {
            var d = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
            return d !== 0 ? d : a.name.localeCompare(b.name);
          });
        if (!members.length) return;
        lines.push('[' + group[1] + '] (' + members.length + ')');
        members.forEach(function (i) {
          lines.push('  • ' + i.name + ' (' + (i.rarity === 'Icon' ? 'Icon Series' : i.rarity) + ')');
        });
        lines.push('');
      });
    }

    lines.push('---');
    lines.push('Tracked with SpriteTracker');
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function csv(value) {
    return /[",\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
  }

  function refreshTrade() {
    el.tradeOutput.value = buildTradeList(state.tradeFormat);
  }

  el.tradeBtn.addEventListener('click', function () {
    refreshTrade();
    openModal(el.tradeModal);
  });

  el.tradeFormats.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-format]');
    if (!btn) return;
    state.tradeFormat = btn.dataset.format;
    var all = el.tradeFormats.querySelectorAll('.seg__btn');
    for (var i = 0; i < all.length; i++) all[i].classList.toggle('is-active', all[i] === btn);
    refreshTrade();
  });

  el.copyBtn.addEventListener('click', function () {
    var text = el.tradeOutput.value;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        toast('Copied to clipboard');
      }, function () { legacyCopy(text); });
    } else {
      legacyCopy(text);
    }
  });

  function legacyCopy(text) {
    el.tradeOutput.removeAttribute('readonly');
    el.tradeOutput.focus();
    el.tradeOutput.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    el.tradeOutput.setAttribute('readonly', 'readonly');
    toast(ok ? 'Copied to clipboard' : 'Press Ctrl/Cmd+C to copy');
  }

  el.downloadBtn.addEventListener('click', function () {
    var ext = state.tradeFormat === 'csv' ? '.csv' : '.txt';
    downloadFile(slug(state.user) + '-sprites' + ext, el.tradeOutput.value,
      state.tradeFormat === 'csv' ? 'text/csv' : 'text/plain');
  });

  function downloadFile(filename, text, type) {
    var blob = new Blob([text], { type: (type || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function slug(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'player';
  }

  /* ============================================================
     BACKUP / RESTORE / WIPE
     ============================================================ */

  el.exportBtn.addEventListener('click', function () {
    var payload = { app: 'SpriteTracker', version: 1, user: state.user, exported: new Date().toISOString(), items: state.items };
    downloadFile(slug(state.user) + '-sprites-backup.json', JSON.stringify(payload, null, 2), 'application/json');
    toast('Backup downloaded');
  });

  el.importBtn.addEventListener('click', function () { el.importFile.click(); });

  el.importFile.addEventListener('change', function () {
    var file = el.importFile.files && el.importFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var incoming;
      try { incoming = normalizeItems(JSON.parse(String(reader.result))); }
      catch (e) { toast('That file is not a valid backup.'); return; }
      if (!incoming.length) { toast('No sprites found in that file.'); return; }

      askConfirm('Import backup?', 'Merge ' + incoming.length + ' sprites into your list? Existing sprites with the same name keep their current status.', 'Import', function () {
        var added = 0;
        incoming.forEach(function (item) {
          var exists = state.items.some(function (i) { return i.name.toLowerCase() === item.name.toLowerCase(); });
          if (exists) return;
          item.id = uid();
          state.items.push(item);
          added++;
        });
        save();
        render();
        toast('Imported ' + added + ' sprite' + (added === 1 ? '' : 's'));
      });
    };
    reader.readAsText(file);
    el.importFile.value = '';
  });

  el.wipeBtn.addEventListener('click', function () {
    askConfirm('Clear your list?', 'This deletes every sprite saved for "' + state.user + '" on this device. It cannot be undone.', 'Clear list', function () {
      state.items = [];
      try { window.localStorage.removeItem(dataKey(state.user)); } catch (e) {}
      forgetUser(state.user);
      render();
      toast('List cleared');
    });
  });

  /* ============================================================
     MODALS / TOAST
     ============================================================ */

  var lastFocused = null;

  function openModal(modal) {
    lastFocused = document.activeElement;
    modal.hidden = false;
    var focusable = modal.querySelector('button, textarea, input');
    if (focusable) focusable.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    if (modal === el.confirmModal) confirmAction = null;
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  document.addEventListener('click', function (e) {
    var closer = e.target.closest('[data-close]');
    if (!closer) return;
    var modal = closer.closest('.modal');
    if (modal) closeModal(modal);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!el.tradeModal.hidden) closeModal(el.tradeModal);
    if (!el.confirmModal.hidden) closeModal(el.confirmModal);
  });

  function askConfirm(title, text, actionLabel, onYes) {
    el.confirmTitle.textContent = title;
    el.confirmText.textContent = text;
    el.confirmYes.textContent = actionLabel;
    confirmAction = onYes;
    openModal(el.confirmModal);
  }

  el.confirmYes.addEventListener('click', function () {
    var action = confirmAction;
    closeModal(el.confirmModal);
    if (action) action();
  });

  function toast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 2600);
  }

  /* ============================================================
     PWA: service worker + install prompt
     ============================================================ */

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () { /* offline support is optional */ });
    });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredInstall = e;
    el.installBtn.hidden = false;
  });

  el.installBtn.addEventListener('click', function () {
    if (!deferredInstall) { el.installBtn.hidden = true; return; }
    deferredInstall.prompt();
    deferredInstall.userChoice.then(function () {
      deferredInstall = null;
      el.installBtn.hidden = true;
    });
  });

  window.addEventListener('appinstalled', function () {
    deferredInstall = null;
    el.installBtn.hidden = true;
  });

  /* Save on the way out, in case of an unsynced change. */
  window.addEventListener('pagehide', save);

  /* ============================================================
     BOOT
     ============================================================ */

  renderKnownUsers();

  var session = cleanName(safeGet(SESSION_KEY));
  if (session && NAME_RE.test(session)) {
    login(session);
  } else {
    el.loginInput.focus();
  }
})();
