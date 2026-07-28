/* ============================================================
   SpriteTracker — vanilla JS, 100% client-side.

   Data model: one entry per BASE sprite, holding a status for
   every variation:

     { id, name, ability, custom, status: { Base: 'none', Gold: 'acquired', … } }

   Saved to localStorage under  spriteData_<Username>
   ============================================================ */
(function () {
  'use strict';

  /* ---------- catalog ---------- */

  var CATALOG = window.SPRITE_CATALOG || { variations: ['Base'], baseSprites: [] };
  var VARIATIONS = CATALOG.variations.slice();

  var STATUSES = [
    { key: 'none',     label: "Don't Have" },
    { key: 'acquired', label: 'Acquired'   },
    { key: 'mastered', label: 'Mastered'   }
  ];
  var CYCLE = ['none', 'acquired', 'mastered'];

  var SESSION_KEY = 'spriteTracker.session';
  var USERS_KEY   = 'spriteTracker.users';
  var DATA_PREFIX = 'spriteData_';

  /* ---------- element lookup ---------- */

  function $(id) { return document.getElementById(id); }

  var el = {
    loginView:  $('view-login'),
    loginForm:  $('login-form'),
    loginInput: $('login-username'),
    loginError: $('login-error'),
    knownWrap:  $('known-users-wrap'),
    knownList:  $('known-users'),

    appView:    $('view-app'),
    userName:   $('user-name'),
    userAvatar: $('user-avatar'),
    logout:     $('btn-logout'),

    statTotal:    $('stat-total'),
    statAcquired: $('stat-acquired'),
    statMastered: $('stat-mastered'),
    statMissing:  $('stat-missing'),
    progressBar:  $('progress-bar'),
    progressText: $('progress-text'),
    progressWrap: $('progress-wrap'),

    addForm:    $('add-form'),
    addName:    $('add-name'),
    addAbility: $('add-ability'),

    search:    $('search'),
    variation: $('variation-filter'),
    filters:   document.querySelector('.filters'),
    grid:      $('grid'),
    empty:     $('empty'),
    emptyText: $('empty-text'),
    seed:      $('btn-seed'),

    tradeBtn:     $('btn-trade'),
    tradeModal:   $('modal-trade'),
    tradeOutput:  $('trade-output'),
    tradeFormats: document.querySelector('#modal-trade .seg'),
    copyBtn:      $('btn-copy'),
    downloadBtn:  $('btn-download'),

    confirmModal: $('modal-confirm'),
    confirmTitle: $('confirm-title'),
    confirmText:  $('confirm-text'),
    confirmYes:   $('confirm-yes'),

    restoreBtn: $('btn-restore'),
    exportBtn:  $('btn-export'),
    importBtn:  $('btn-import'),
    importFile: $('file-import'),
    wipeBtn:    $('btn-wipe'),

    toast:      $('toast'),
    installBtn: $('btn-install')
  };

  /* ---------- state ---------- */

  var state = {
    user: null,
    items: [],
    filter: 'all',
    variation: 'all',
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
    try { return normalizeItems(JSON.parse(raw)); }
    catch (e) { return []; }
  }

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

  function emptyStatus() {
    var map = {};
    VARIATIONS.forEach(function (v) { map[v] = 'none'; });
    return map;
  }

  /* Accepts the current format, a raw export, or the old flat
     (one-status-per-item) format from the first version. */
  function normalizeItems(parsed) {
    var list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.items) ? parsed.items : []);
    var out = [];
    var seen = {};

    list.forEach(function (raw) {
      if (typeof raw === 'string') raw = { name: raw };
      if (!raw || typeof raw.name !== 'string') return;

      var name = raw.name.trim().slice(0, 60);
      if (!name) return;

      var status = emptyStatus();
      if (raw.status && typeof raw.status === 'object') {
        VARIATIONS.forEach(function (v) { status[v] = statusKey(raw.status[v]); });
      } else if (typeof raw.status === 'string') {
        status.Base = statusKey(raw.status);   // migrated from the flat v1 format
      }

      var id = typeof raw.id === 'string' && raw.id ? raw.id : uid();
      while (seen[id]) id = uid();
      seen[id] = true;

      out.push({
        id: id,
        name: name,
        ability: typeof raw.ability === 'string' ? raw.ability.slice(0, 200) : '',
        custom: raw.custom === true,
        status: status
      });
    });

    return refreshFromCatalog(out);
  }

  /* Catalog entries keep their saved statuses but pick up any
     name/ability corrections made in sprites.js. */
  function refreshFromCatalog(items) {
    var byId = {};
    CATALOG.baseSprites.forEach(function (s) { byId[s.id] = s; });
    items.forEach(function (item) {
      var source = byId[item.id];
      if (source && !item.custom) {
        item.name = source.name;
        item.ability = source.ability;
      }
    });
    return items;
  }

  function catalogItems() {
    return CATALOG.baseSprites.map(function (s) {
      return { id: s.id, name: s.name, ability: s.ability, custom: false, status: emptyStatus() };
    });
  }

  function save() {
    if (!state.user) return;
    safeSet(dataKey(state.user), JSON.stringify(state.items));
  }

  function uid() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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
    safeSet(USERS_KEY, JSON.stringify(knownUsers().filter(function (u) {
      return u.toLowerCase() !== name.toLowerCase();
    })));
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

  function ownedCount(items) {
    var n = 0;
    items.forEach(function (item) {
      VARIATIONS.forEach(function (v) { if (item.status[v] !== 'none') n++; });
    });
    return n;
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

      var meta = document.createElement('span');
      meta.className = 'userchip__meta';
      var items = loadItems(name);
      meta.textContent = ownedCount(items) + '/' + (items.length * VARIATIONS.length);
      btn.appendChild(meta);

      btn.addEventListener('click', function () { login(name); });
      el.knownList.appendChild(btn);
    });
  }

  function login(name) {
    state.user = name;
    state.items = loadItems(name);
    state.filter = 'all';
    state.variation = 'all';
    state.query = '';
    el.search.value = '';
    el.variation.value = 'all';
    setActiveChip('all');

    // First time this player logs in: start from the full official list.
    if (!safeGet(dataKey(name)) && !state.items.length) {
      state.items = catalogItems();
    }
    // Write straight back so the seed lands, and so a list saved in an
    // older format is upgraded on disk rather than only in memory.
    save();

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
    var existing = knownUsers().filter(function (u) { return u.toLowerCase() === name.toLowerCase(); })[0];
    showLoginError('');
    login(existing || name);
  });

  el.loginInput.addEventListener('input', function () { showLoginError(''); });
  el.logout.addEventListener('click', logout);

  /* ============================================================
     RENDERING
     ============================================================ */

  /* Which variations a card should show, given the variation filter. */
  function shownVariations() {
    return state.variation === 'all' ? VARIATIONS : [state.variation];
  }

  function matchesFilter(item) {
    if (state.filter === 'all') return true;
    return shownVariations().some(function (v) { return item.status[v] === state.filter; });
  }

  function matchesQuery(item) {
    var q = state.query.toLowerCase();
    if (!q) return true;
    return item.name.toLowerCase().indexOf(q) !== -1 ||
           item.ability.toLowerCase().indexOf(q) !== -1 ||
           VARIATIONS.some(function (v) { return v.toLowerCase().indexOf(q) !== -1 && q.length > 2; });
  }

  function visibleItems() {
    return state.items.filter(function (item) {
      return matchesFilter(item) && matchesQuery(item);
    }).sort(function (a, b) {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  function render() {
    renderStats();
    renderGrid();
  }

  function renderStats() {
    var vars = shownVariations();
    var total = state.items.length * vars.length;
    var acquired = 0, mastered = 0;

    state.items.forEach(function (item) {
      vars.forEach(function (v) {
        if (item.status[v] === 'acquired') acquired++;
        else if (item.status[v] === 'mastered') mastered++;
      });
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
    var list = visibleItems();
    el.grid.textContent = '';

    if (!state.items.length) {
      el.empty.hidden = false;
      el.emptyText.textContent = 'Load the official sprite list to start tracking.';
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

  function cardCounts(item) {
    var vars = shownVariations();
    var owned = 0, mastered = 0;
    vars.forEach(function (v) {
      if (item.status[v] === 'mastered') { owned++; mastered++; }
      else if (item.status[v] === 'acquired') owned++;
    });
    return { owned: owned, mastered: mastered, total: vars.length };
  }

  function buildCard(item) {
    var vars = shownVariations();
    var counts = cardCounts(item);

    var card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = item.id;
    if (counts.mastered === counts.total) card.classList.add('is-complete-mastered');
    else if (counts.owned === counts.total) card.classList.add('is-complete');

    /* header */
    var head = document.createElement('div');
    head.className = 'card__head';

    var titleWrap = document.createElement('div');
    titleWrap.className = 'card__titles';

    var name = document.createElement('h3');
    name.className = 'card__name';
    name.textContent = item.name;               // textContent → no HTML injection
    if (item.custom) {
      var badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'Custom';
      name.appendChild(badge);
    }

    var ability = document.createElement('p');
    ability.className = 'card__ability';
    ability.textContent = item.ability || 'No ability listed.';

    titleWrap.appendChild(name);
    titleWrap.appendChild(ability);

    var right = document.createElement('div');
    right.className = 'card__meta';

    var count = document.createElement('span');
    count.className = 'card__count';
    count.dataset.role = 'count';
    count.textContent = counts.owned + '/' + counts.total;

    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'iconbtn';
    del.dataset.action = 'delete';
    del.setAttribute('aria-label', 'Delete ' + item.name);
    del.textContent = '×';

    right.appendChild(count);
    right.appendChild(del);

    head.appendChild(titleWrap);
    head.appendChild(right);

    /* variation chips */
    var vgrid = document.createElement('div');
    vgrid.className = 'vgrid';
    vgrid.setAttribute('role', 'group');
    vgrid.setAttribute('aria-label', 'Variations of ' + item.name);

    vars.forEach(function (v) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vchip';
      btn.dataset.action = 'cycle';
      btn.dataset.variation = v;

      var label = document.createElement('span');
      label.className = 'vchip__label';
      label.textContent = v;

      var mark = document.createElement('span');
      mark.className = 'vchip__mark';
      mark.dataset.role = 'mark';

      btn.appendChild(label);
      btn.appendChild(mark);
      paintChip(btn, item, v);
      vgrid.appendChild(btn);
    });

    card.appendChild(head);
    card.appendChild(vgrid);
    return card;
  }

  /* Applies the current status of one variation to its chip. */
  function paintChip(btn, item, variation) {
    var status = item.status[variation];
    btn.dataset.status = status;
    btn.className = 'vchip is-' + status;
    btn.setAttribute('aria-label', item.name + ' — ' + variation + ': ' + statusLabel(status));
    btn.title = variation + ': ' + statusLabel(status);
    var mark = btn.querySelector('[data-role="mark"]');
    if (mark) mark.textContent = status === 'mastered' ? '★' : status === 'acquired' ? '✓' : '';
  }

  function findItem(id) {
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) return state.items[i];
    }
    return null;
  }

  /* ---------- grid interactions ---------- */

  function cycleStatus(current, backwards) {
    var i = CYCLE.indexOf(current);
    if (i === -1) i = 0;
    return CYCLE[(i + (backwards ? CYCLE.length - 1 : 1)) % CYCLE.length];
  }

  function applyCycle(btn, backwards) {
    var card = btn.closest('.card');
    if (!card) return;
    var item = findItem(card.dataset.id);
    if (!item) return;

    var variation = btn.dataset.variation;
    item.status[variation] = cycleStatus(item.status[variation], backwards);
    save();

    // With a status filter on, this card may no longer belong — full redraw.
    if (state.filter !== 'all') { render(); return; }

    paintChip(btn, item, variation);
    var counts = cardCounts(item);
    var countEl = card.querySelector('[data-role="count"]');
    if (countEl) countEl.textContent = counts.owned + '/' + counts.total;
    card.classList.toggle('is-complete-mastered', counts.mastered === counts.total);
    card.classList.toggle('is-complete', counts.mastered !== counts.total && counts.owned === counts.total);
    renderStats();
  }

  el.grid.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;

    if (btn.dataset.action === 'cycle') {
      applyCycle(btn, e.shiftKey);
      return;
    }

    if (btn.dataset.action === 'delete') {
      var card = btn.closest('.card');
      var item = card && findItem(card.dataset.id);
      if (!item) return;
      askConfirm('Delete sprite?', 'Remove "' + item.name + '" and all ' + VARIATIONS.length + ' of its variations from your list?', 'Delete', function () {
        state.items = state.items.filter(function (i) { return i.id !== item.id; });
        save();
        render();
        toast('Deleted "' + item.name + '"');
      });
    }
  });

  /* Right-click a chip to step backwards through the statuses. */
  el.grid.addEventListener('contextmenu', function (e) {
    var btn = e.target.closest('[data-action="cycle"]');
    if (!btn) return;
    e.preventDefault();
    applyCycle(btn, true);
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
      ability: cleanName(el.addAbility.value).slice(0, 200),
      custom: true,
      status: emptyStatus()
    });
    save();
    el.addName.value = '';
    el.addAbility.value = '';
    el.addName.focus();
    render();
    toast('Added "' + name + '" with ' + VARIATIONS.length + ' variations');
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

  el.variation.addEventListener('change', function () {
    state.variation = el.variation.value;
    render();
  });

  el.search.addEventListener('input', function () {
    state.query = el.search.value.trim();
    renderGrid();
  });

  /* Adds any official sprites missing from the list, keeping existing statuses. */
  function restoreCatalog() {
    var have = {};
    state.items.forEach(function (i) {
      have[i.id] = true;
      have[i.name.toLowerCase()] = true;
    });
    var added = 0;
    catalogItems().forEach(function (item) {
      if (have[item.id] || have[item.name.toLowerCase()]) return;
      state.items.push(item);
      added++;
    });
    save();
    render();
    toast(added ? 'Added ' + added + ' sprite' + (added === 1 ? '' : 's') : 'Nothing missing — all official sprites are on your list.');
  }

  el.seed.addEventListener('click', restoreCatalog);
  el.restoreBtn.addEventListener('click', restoreCatalog);

  /* ============================================================
     TRADE LIST (convert / export)
     ============================================================ */

  /* [{ item, variation, status }] for everything not "Don't Have". */
  function ownedEntries() {
    var out = [];
    state.items.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }).forEach(function (item) {
      VARIATIONS.forEach(function (v) {
        if (item.status[v] !== 'none') out.push({ item: item, variation: v, status: item.status[v] });
      });
    });
    return out;
  }

  function buildTradeList(format) {
    var owned = ownedEntries();

    if (!owned.length) {
      return "== " + state.user + "'s Fortnite Sprite List ==\n\n" +
             'Nothing marked as Acquired or Mastered yet.\n' +
             'Tap a variation to set it to "Acquired" or "Mastered", then generate the list again.';
    }

    if (format === 'csv') {
      var rows = ['Sprite,Variation,Status'];
      owned.forEach(function (e) {
        rows.push([csv(e.item.name), csv(e.variation), csv(statusLabel(e.status))].join(','));
      });
      return rows.join('\n');
    }

    var totalCells = state.items.length * VARIATIONS.length;
    var lines = [];
    lines.push("== " + state.user + "'s Fortnite Sprite List ==");
    lines.push('Generated ' + new Date().toLocaleDateString() +
               ' · ' + owned.length + '/' + totalCells + ' variations owned');
    lines.push('');

    if (format === 'sprite') {
      /* One block per sprite, listing only the variations they own. */
      var currentName = null;
      owned.forEach(function (e) {
        if (e.item.name !== currentName) {
          currentName = e.item.name;
          var mine = owned.filter(function (o) { return o.item.name === currentName; });
          lines.push(currentName + ' (' + mine.length + '/' + VARIATIONS.length + ')');
          mine.forEach(function (o) {
            lines.push('  • ' + o.variation + ' — ' + statusLabel(o.status));
          });
          lines.push('');
        }
      });
    } else {
      /* Grouped by status, variations collapsed onto one line per sprite. */
      [['mastered', 'MASTERED'], ['acquired', 'ACQUIRED']].forEach(function (group) {
        var members = owned.filter(function (e) { return e.status === group[0]; });
        if (!members.length) return;

        var bySprite = [];
        var index = {};
        members.forEach(function (e) {
          if (!index[e.item.name]) { index[e.item.name] = []; bySprite.push(e.item.name); }
          index[e.item.name].push(e.variation);
        });

        lines.push('[' + group[1] + '] (' + members.length + ')');
        bySprite.forEach(function (spriteName) {
          lines.push('  • ' + spriteName + ': ' + index[spriteName].join(', '));
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
    var payload = {
      app: 'SpriteTracker',
      version: 2,
      user: state.user,
      exported: new Date().toISOString(),
      variations: VARIATIONS,
      items: state.items
    };
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

      askConfirm('Import backup?',
        'Merge ' + incoming.length + ' sprites into your list? Sprites you already track keep their current statuses.',
        'Import', function () {
          var have = {};
          state.items.forEach(function (i) { have[i.id] = true; have[i.name.toLowerCase()] = true; });
          var added = 0;
          incoming.forEach(function (item) {
            if (have[item.id] || have[item.name.toLowerCase()]) return;
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
    askConfirm('Clear your list?',
      'This deletes every sprite and status saved for "' + state.user + '" on this device. It cannot be undone.',
      'Clear list', function () {
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

  window.addEventListener('pagehide', save);

  /* ============================================================
     BOOT
     ============================================================ */

  VARIATIONS.forEach(function (v) {
    var option = document.createElement('option');
    option.value = v;
    option.textContent = v + ' only';
    el.variation.appendChild(option);
  });

  renderKnownUsers();

  var session = cleanName(safeGet(SESSION_KEY));
  if (session && NAME_RE.test(session)) {
    login(session);
  } else {
    el.loginInput.focus();
  }
})();
