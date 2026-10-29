/* ==========================================================================
   Dreamland Co. – lead tracker
   Plain JS. Data lives in Supabase (see SETUP.md).
   ========================================================================== */

(() => {
  'use strict';

  const PAGE_SIZE = 60;       // cards rendered at a time, keeps phones fast
  const FETCH_BATCH = 1000;   // Supabase returns at most 1000 rows per request
  const INSERT_BATCH = 500;

  const STATUSES = ['Not called', 'Did not answer', 'Interested', 'Not interested', 'Opted out'];
  const statusClass = (s) => 'st-' + String(s).toLowerCase().replace(/[^a-z]+/g, '-');

  // The three tabs. `filter` picks the leads, `sort` orders them, `hint` explains the view.
  const byNewest = (a, b) => (b.created_at || '').localeCompare(a.created_at || '');
  const VIEWS = {
    all: {
      filter: () => true,
      sort: byNewest
    },
    call: {
      filter: (l) => l.status === 'Not called' || l.status === 'Did not answer',
      // Leads with a phone number first. Then never-tried leads (oldest import first),
      // then the longest-ago attempts.
      sort: (a, b) => {
        if (!a.phone !== !b.phone) return a.phone ? -1 : 1;
        if (!a.last_contacted !== !b.last_contacted) return a.last_contacted ? 1 : -1;
        if (a.last_contacted) return a.last_contacted.localeCompare(b.last_contacted);
        return (a.created_at || '').localeCompare(b.created_at || '');
      },
      hint: 'Not called and did-not-answer leads, longest-waiting first. Leads without a phone number are at the end.'
    },
    warm: {
      filter: (l) => l.status === 'Interested' || (l.source === 'Website form' && l.status !== 'Opted out'),
      sort: (a, b) => (b.last_contacted || b.created_at || '').localeCompare(a.last_contacted || a.created_at || ''),
      hint: 'Everyone marked Interested, plus everyone who filled in the website form.'
    }
  };

  // Lead fields a CSV column can be mapped to. `aliases` are lowercase header names we auto-match.
  const FIELDS = [
    { key: 'business_name', label: 'Business name', required: true,
      aliases: ['business name', 'business', 'name', 'company', 'company name', 'establishment', 'property', 'property name', 'title'] },
    { key: 'business_type', label: 'Type',
      aliases: ['type', 'business type', 'property type', 'category', 'accommodation type'] },
    { key: 'contact_person', label: 'Contact person',
      aliases: ['contact person', 'contact', 'contact name', 'owner', 'manager', 'person'] },
    { key: 'phone', label: 'Phone',
      aliases: ['phone', 'phone number', 'telephone', 'tel', 'contact number', 'mobile', 'cell', 'cellphone', 'number'] },
    { key: 'email', label: 'Email',
      aliases: ['email', 'e-mail', 'email address', 'mail'] },
    { key: 'other_emails', label: 'Other emails', extra: true,   // added to Email, not a column of its own
      aliases: ['other emails', 'other email', 'additional emails', 'more emails'] },
    { key: 'town', label: 'Town',
      aliases: ['town', 'city', 'suburb', 'locality', 'location'] },
    { key: 'province', label: 'Province',
      aliases: ['province', 'region', 'state'] },
    { key: 'address', label: 'Address',
      aliases: ['address', 'street address', 'full address', 'physical address'] },
    { key: 'website', label: 'Website',
      aliases: ['website', 'web', 'url', 'site', 'website url', 'web address'] },
    { key: 'maps_url', label: 'Google Maps link',
      aliases: ['google maps link', 'google maps', 'maps link', 'maps url', 'map link', 'google maps url'] },
    { key: 'notes', label: 'Notes',
      aliases: ['notes', 'note', 'comments', 'comment'] }
  ];

  const PROVINCES = {
    'eastern cape': 'Eastern Cape', ec: 'Eastern Cape', 'oos-kaap': 'Eastern Cape',
    'free state': 'Free State', fs: 'Free State', 'vrystaat': 'Free State',
    gauteng: 'Gauteng', gp: 'Gauteng', gt: 'Gauteng',
    'kwazulu-natal': 'KwaZulu-Natal', 'kwazulu natal': 'KwaZulu-Natal', kzn: 'KwaZulu-Natal', natal: 'KwaZulu-Natal',
    limpopo: 'Limpopo', lp: 'Limpopo', lim: 'Limpopo',
    mpumalanga: 'Mpumalanga', mp: 'Mpumalanga',
    'north west': 'North West', 'north-west': 'North West', nw: 'North West', 'noordwes': 'North West',
    'northern cape': 'Northern Cape', nc: 'Northern Cape', 'noord-kaap': 'Northern Cape',
    'western cape': 'Western Cape', wc: 'Western Cape', 'wes-kaap': 'Western Cape'
  };

  const $ = (sel) => document.querySelector(sel);
  const els = {
    loading: $('#loading'),
    setup: $('#setup-screen'),
    login: $('#login-screen'),
    app: $('#app-screen'),
    user: $('#app-user'),
    userEmail: $('#user-email'),
    loginForm: $('#login-form'),
    loginError: $('#login-error'),
    loginBtn: $('#login-btn'),
    logout: $('#logout-btn'),
    search: $('#search'),
    tabs: document.querySelectorAll('.tab'),
    fStatus: $('#filter-status'),
    fProvince: $('#filter-province'),
    fTown: $('#filter-town'),
    clearFilters: $('#clear-filters'),
    hint: $('#view-hint'),
    count: $('#list-count'),
    list: $('#lead-list'),
    more: $('#show-more'),
    empty: $('#empty'),
    toast: $('#toast')
  };

  const state = {
    leads: [],
    view: 'all',
    query: '',
    status: '',
    province: '',
    town: '',
    shown: PAGE_SIZE,
    channel: null
  };
  const unsavedNotes = new Map();   // lead id -> note text that failed to save

  /* ---------- Helpers ---------- */

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
  const normHeader = (s) => clean(s).toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ');

  let toastTimer;
  function toast(msg, isError = false) {
    els.toast.textContent = msg;
    els.toast.classList.toggle('is-error', isError);
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, isError ? 6000 : 3000);
  }

  function show(screen) {
    els.loading.hidden = true;
    for (const s of [els.setup, els.login, els.app]) s.hidden = s !== screen;
  }

  // South African numbers: "+27 82 123 4567", "082 123 4567" and "27821234567" all become "0821234567".
  function phoneKeys(value) {
    return String(value ?? '')
      .split(/[;,/\n]|\bor\b/i)
      .map((p) => {
        let d = p.replace(/\D/g, '');
        if (d.startsWith('0027')) d = d.slice(2);
        if (d.startsWith('27') && d.length === 11) d = '0' + d.slice(2);
        if (d.length === 9 && !d.startsWith('0')) d = '0' + d;
        return d;
      })
      .filter((d) => d.length >= 7);
  }

  function emailKeys(value) {
    return String(value ?? '')
      .toLowerCase()
      .split(/[;,\s]+/)
      .map((e) => e.replace(/^mailto:/, '').trim())
      .filter((e) => e.includes('@'));
  }

  function normType(value) {
    const v = clean(value).toLowerCase();
    if (!v) return null;
    if (/b\s*&\s*b|\bbnb\b|bed\s*(and|&|n)\s*breakfast/.test(v)) return 'B&B';
    if (/guest\s*-?\s*house|guesthouse|gastehuis/.test(v)) return 'Guesthouse';
    if (/\blodge\b/.test(v)) return 'Lodge';   // not Google's catch-all "Lodging"
    if (/hotel/.test(v)) return 'Hotel';
    return null;
  }

  function normProvince(value) {
    const v = clean(value);
    return PROVINCES[v.toLowerCase()] || v || null;
  }

  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const isToday = (iso) => !!iso && dayKey(new Date(iso)) === dayKey(new Date());

  // "Today 14:05", "Yesterday 09:30", "3 days ago", "12 Oct", "12 Oct 2025"
  function when(iso) {
    const d = new Date(iso);
    const now = new Date();
    const time = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    const days = Math.round((new Date(now.toDateString()) - new Date(d.toDateString())) / 864e5);
    if (days === 0) return `Today ${time}`;
    if (days === 1) return `Yesterday ${time}`;
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-ZA', {
      day: 'numeric', month: 'short', ...(d.getFullYear() !== now.getFullYear() && { year: 'numeric' })
    });
  }

  const sortText = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });

  // Rebuild a filter dropdown only when its choices change, so an open dropdown isn't disturbed.
  function setOptions(select, allLabel, values, current) {
    const sig = values.join('\u0001');
    if (select.dataset.sig !== sig) {
      select.dataset.sig = sig;
      select.innerHTML = `<option value="">${allLabel}</option>` +
        values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    }
    select.value = values.includes(current) ? current : '';
    return select.value;
  }

  /* ---------- Supabase ---------- */

  const cfg = window.DREAMLAND_CONFIG || {};
  const configured = /^https:\/\/.+/.test(cfg.supabaseUrl || '') &&
    !/YOUR-/.test(cfg.supabaseUrl + cfg.supabaseKey) && !!cfg.supabaseKey;

  if (!configured || !window.supabase) {
    show(els.setup);
    return;
  }

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  // First page tells us the total; the remaining pages are fetched side by side.
  async function fetchAllLeads() {
    const page = (from, opts) => sb
      .from('leads')
      .select('*', opts)
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + FETCH_BATCH - 1);

    const first = await page(0, { count: 'exact' });
    if (first.error) throw first.error;
    const total = first.count ?? first.data.length;
    const rest = [];
    for (let from = FETCH_BATCH; from < total; from += FETCH_BATCH) rest.push(page(from));
    const rows = first.data;
    for (const { data, error } of await Promise.all(rest)) {
      if (error) throw error;
      rows.push(...data);
    }
    return rows;
  }

  async function loadLeads() {
    try {
      state.leads = await fetchAllLeads();
      render();
    } catch (err) {
      console.error(err);
      toast('Could not load leads: ' + err.message, true);
    }
  }

  // Keep every open copy of the app in step with changes made elsewhere.
  // Changes are applied in small batches; a flood (someone importing thousands of leads)
  // is quicker to handle by reloading the whole list once.
  function subscribe() {
    if (state.channel) return;
    let queue = [];
    let pending;
    let flooding = false;   // many changes arriving: wait until they stop, then reload once

    function endFlood() {
      flooding = false;
      queue = [];
      loadLeads();
    }

    function flush() {
      const batch = queue;
      queue = [];
      if (batch.length > 50) {
        flooding = true;
        pending = setTimeout(endFlood, 3000);
        return;
      }
      for (const { eventType, new: row, old } of batch) {
        const i = state.leads.findIndex((l) => l.id === (row?.id || old?.id));
        if (eventType === 'DELETE') {
          if (i > -1) state.leads.splice(i, 1);
        } else if (i > -1) {
          state.leads[i] = row;
        } else {
          state.leads.unshift(row);
        }
      }
      render();
    }

    state.channel = sb
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (imp.dialog.dataset.busy) return;   // this device is importing; it reloads when done
        clearTimeout(pending);
        if (flooding) {
          pending = setTimeout(endFlood, 3000);
          return;
        }
        queue.push(payload);
        pending = setTimeout(flush, 300);
      })
      .subscribe();
  }

  function unsubscribe() {
    if (state.channel) sb.removeChannel(state.channel);
    state.channel = null;
  }

  /* ---------- Auth ---------- */

  async function onSession(session) {
    if (session) {
      els.userEmail.textContent = session.user.email;
      els.user.hidden = false;
      if (els.app.hidden) {
        show(els.app);
        await loadLeads();
        subscribe();
      }
    } else {
      unsubscribe();
      state.leads = [];
      els.list.innerHTML = '';
      els.user.hidden = true;
      show(els.login);
    }
  }

  sb.auth.getSession().then(({ data }) => onSession(data.session));
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') onSession(session);
  });

  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(els.loginForm);
    els.loginError.hidden = true;
    els.loginBtn.disabled = true;
    els.loginBtn.textContent = 'Logging in…';
    const { error } = await sb.auth.signInWithPassword({
      email: clean(form.get('email')),
      password: form.get('password')
    });
    els.loginBtn.disabled = false;
    els.loginBtn.textContent = 'Log in';
    if (error) {
      els.loginError.textContent = /invalid/i.test(error.message)
        ? 'That email and password don\'t match. Please try again.'
        : error.message;
      els.loginError.hidden = false;
    }
  });

  els.logout.addEventListener('click', () => sb.auth.signOut());

  /* ---------- List ---------- */

  function matches(lead, q) {
    if (!q) return true;
    const hay = [lead.business_name, lead.contact_person, lead.town, lead.province, lead.email, lead.phone, lead.business_type, lead.address]
      .join(' ').toLowerCase();
    if (hay.includes(q)) return true;
    const digits = q.replace(/\D/g, '');
    return digits.length >= 3 && phoneKeys(lead.phone).some((p) => p.includes(digits.replace(/^27/, '0')));
  }

  // First number in the phone field, ready for a tel: link ("+27 82 123 4567" -> "+27821234567").
  function telHref(phone) {
    const first = String(phone ?? '').split(/[;,/\n]|\bor\b/i)[0];
    const n = first.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
    return n.replace(/\D/g, '').length >= 7 ? 'tel:' + n : '';
  }

  function mailHref(email, businessName) {
    const to = emailKeys(email)[0];
    if (!to) return '';
    return `mailto:${to}?subject=${encodeURIComponent(`Quality pillows for ${businessName}`)}`;
  }

  function webHref(site) {
    const s = clean(site).split(/\s+/)[0] || '';
    if (!s) return '';
    const url = /^https?:\/\//i.test(s) ? s : 'https://' + s;
    try { return new URL(url).href; } catch (e) { return ''; }
  }

  // The lead's own Google Maps link if it has one, otherwise a Maps search for it.
  // On phones Google Maps links open the Maps app.
  function mapsHref(l) {
    const own = clean(l.maps_url);
    if (/^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(own)) return own;
    const where = l.address || [l.town, l.province].filter(Boolean).join(', ');
    if (!where) return '';
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${l.business_name}, ${where}`);
  }

  // Google's ID for a place, used to spot the same business when a list is imported twice.
  const placeKey = (url) => (String(url ?? '').match(/place_id[=:]([\w-]+)/i) || [])[1] || '';

  function actionLink(href, icon, label, { disabled, external, title } = {}) {
    if (!href) return '';
    const attrs = disabled
      ? 'aria-disabled="true" role="link"'
      : `href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ''}`;
    return `<a class="btn btn-sm lead-action${disabled ? ' is-disabled' : ''}" ${attrs}${title ? ` title="${esc(title)}"` : ''}>
      <svg class="btn-icon" aria-hidden="true"><use href="#${icon}"/></svg><span>${esc(label)}</span></a>`;
  }

  function leadCard(l) {
    const place = [l.town, l.province].filter(Boolean).join(', ');
    const meta = [l.business_type, place].filter(Boolean).join(' · ');
    const optedOut = l.status === 'Opted out';
    const unsaved = unsavedNotes.has(l.id);
    const lines = [
      l.contact_person && `<li><span class="label">Contact:</span> ${esc(l.contact_person)}</li>`,
      l.phone && `<li><span class="label">Phone:</span> ${esc(l.phone)}</li>`,
      l.email && `<li><span class="label">Email:</span> ${esc(l.email)}</li>`,
      l.address && `<li><span class="label">Address:</span> ${esc(l.address)}</li>`
    ].filter(Boolean).join('');
    const blocked = { disabled: optedOut, title: optedOut ? 'Opted out: do not contact' : '' };
    const actions = [
      actionLink(telHref(l.phone), 'i-phone', 'Call', blocked),
      actionLink(mailHref(l.email, l.business_name), 'i-mail', 'Email', blocked),
      actionLink(webHref(l.website), 'i-globe', 'Website', { external: true }),
      actionLink(mapsHref(l), 'i-map', 'Map', { external: true })
    ].join('');
    const options = STATUSES.map((s) => `<option${s === l.status ? ' selected' : ''}>${esc(s)}</option>`).join('');
    return `
      <article class="lead${optedOut ? ' is-opted-out' : ''}" data-id="${esc(l.id)}">
        <h3 class="lead-name">${esc(l.business_name)}</h3>
        ${meta ? `<p class="lead-meta">${esc(meta)}</p>` : ''}
        ${lines ? `<ul class="lead-lines">${lines}</ul>` : ''}
        ${l.source === 'Website form' ? '<div class="lead-tags"><span class="pill pill-web">Website form</span></div>' : ''}
        ${actions ? `<div class="lead-actions">${actions}</div>` : ''}
        ${optedOut ? '<p class="opted-note">Opted out. Do not call or email.</p>' : ''}
        <label class="lead-notes">
          <span class="lead-notes-head"><span>Notes</span><span class="note-state${unsaved ? ' is-error' : ''}" aria-live="polite">${unsaved ? 'Not saved' : ''}</span></span>
          <textarea data-notes rows="2" aria-label="Notes for ${esc(l.business_name)}" placeholder="Call notes…">${esc(unsaved ? unsavedNotes.get(l.id) : l.notes)}</textarea>
        </label>
        <div class="lead-status">
          <select class="status-select ${statusClass(l.status)}" data-status aria-label="Status for ${esc(l.business_name)}">${options}</select>
          <span class="last-contacted">${l.last_contacted ? 'Last contacted ' + esc(when(l.last_contacted)) : 'Never contacted'}</span>
        </div>
      </article>`;
  }

  // Redrawing the list while someone types a note would wipe their cursor and text,
  // so wait until they leave the notes box.
  let renderWaiting = false;
  const editingNote = () => document.activeElement?.matches?.('#lead-list textarea[data-notes]');

  function render() {
    if (editingNote()) { renderWaiting = true; return; }
    renderWaiting = false;
    const view = VIEWS[state.view];
    const inView = state.leads.filter(view.filter);

    // Filter choices come from the leads in this tab; towns narrow to the chosen province.
    const distinct = (rows, key) => [...new Set(rows.map((l) => l[key]).filter(Boolean))].sort(sortText);
    const usedStatuses = new Set(inView.map((l) => l.status));
    state.status = setOptions(els.fStatus, 'All statuses', STATUSES.filter((s) => usedStatuses.has(s)), state.status);
    state.province = setOptions(els.fProvince, 'All provinces', distinct(inView, 'province'), state.province);
    const townPool = state.province ? inView.filter((l) => l.province === state.province) : inView;
    state.town = setOptions(els.fTown, 'All towns', distinct(townPool, 'town'), state.town);

    const list = inView
      .filter((l) => (!state.status || l.status === state.status) &&
        (!state.province || l.province === state.province) &&
        (!state.town || l.town === state.town) &&
        matches(l, state.query))
      .sort(view.sort);
    const visible = list.slice(0, state.shown);

    els.list.innerHTML = visible.map(leadCard).join('');
    els.more.hidden = list.length <= visible.length;
    els.more.textContent = `Show more (${list.length - visible.length} left)`;

    const narrowed = state.query || state.status || state.province || state.town;
    const n = (x) => x.toLocaleString('en-ZA');
    els.count.textContent = narrowed
      ? `${n(list.length)} of ${n(inView.length)} match`
      : `${n(inView.length)} lead${inView.length === 1 ? '' : 's'}`;
    els.clearFilters.hidden = !narrowed;
    els.hint.textContent = view.hint || '';
    els.hint.hidden = !view.hint;

    els.empty.hidden = list.length > 0;
    els.empty.textContent = state.leads.length === 0
      ? 'No leads yet. Use “Import” to upload your list.'
      : narrowed ? 'No leads match your search or filters.'
        : state.view === 'call' ? 'Nobody left to call. Nice work!'
          : 'No warm leads yet.';

    renderStats();
  }

  function renderStats() {
    const count = (fn) => state.leads.filter(fn).length.toLocaleString('en-ZA');
    $('#stat-total').textContent = state.leads.length.toLocaleString('en-ZA');
    $('#stat-today').textContent = count((l) => isToday(l.last_contacted));
    $('#stat-interested').textContent = count((l) => l.status === 'Interested');
    $('#stat-not').textContent = count((l) => l.status === 'Not interested');
    // Tabs are narrow on phones, so big numbers are shortened: 15 211 -> 15.2K.
    const short = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
    for (const [key, v] of Object.entries(VIEWS)) {
      document.querySelector(`[data-count="${key}"]`).textContent = short.format(state.leads.filter(v.filter).length);
    }
  }

  function setView(view) {
    state.view = view;
    state.shown = PAGE_SIZE;
    els.tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.view === view)));
    try { localStorage.setItem('dl-view', view); } catch (e) { /* private mode */ }
    render();
  }

  els.tabs.forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));
  try {
    const saved = localStorage.getItem('dl-view');
    if (VIEWS[saved]) setView(saved);
  } catch (e) { /* private mode */ }

  let searchTimer;
  els.search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = clean(els.search.value).toLowerCase();
      state.shown = PAGE_SIZE;
      render();
    }, 120);
  });

  for (const [el, key] of [[els.fStatus, 'status'], [els.fProvince, 'province'], [els.fTown, 'town']]) {
    el.addEventListener('change', () => {
      state[key] = el.value;
      state.shown = PAGE_SIZE;
      render();
    });
  }

  els.clearFilters.addEventListener('click', () => {
    Object.assign(state, { query: '', status: '', province: '', town: '', shown: PAGE_SIZE });
    els.search.value = '';
    render();
  });

  /* ---------- Status changes ---------- */

  els.list.addEventListener('change', async (e) => {
    const select = e.target.closest('select[data-status]');
    if (!select) return;
    const id = select.closest('.lead').dataset.id;
    const lead = state.leads.find((l) => l.id === id);
    if (!lead) return;

    const before = { status: lead.status, last_contacted: lead.last_contacted };
    // Resetting to "Not called" undoes a mistake rather than recording a call.
    const changes = { status: select.value };
    if (select.value !== 'Not called') changes.last_contacted = new Date().toISOString();

    Object.assign(lead, changes);
    const stillHere = VIEWS[state.view].filter(lead) && (!state.status || lead.status === state.status);
    render();

    const { error } = await sb.from('leads').update(changes).eq('id', id);
    if (error) {
      Object.assign(lead, before);
      render();
      toast('Could not save: ' + error.message, true);
      return;
    }
    toast(stillHere ? `Saved: ${lead.status}` : `Saved: ${lead.status}. Moved out of this list.`);
  });

  /* ---------- Notes ---------- */
  // Saved a moment after typing stops, and again when leaving the box.
  // Text that failed to save is kept in `unsavedNotes` so a redraw never throws it away.

  const NOTE_DELAY = 1200;
  const noteTimers = new Map();

  function noteState(id, text, isError = false) {
    const el = els.list.querySelector(`.lead[data-id="${CSS.escape(id)}"] .note-state`);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-error', isError);
  }

  async function saveNote(id, text) {
    clearTimeout(noteTimers.get(id));
    noteTimers.delete(id);
    const lead = state.leads.find((l) => l.id === id);
    const value = text.trim() ? text.trimEnd() : null;
    if (!lead || (lead.notes || null) === value) return;

    noteState(id, 'Saving…');
    const { error } = await sb.from('leads').update({ notes: value }).eq('id', id);
    if (error) {
      unsavedNotes.set(id, text);
      noteState(id, 'Not saved', true);
      toast('Could not save notes: ' + error.message, true);
      return;
    }
    lead.notes = value;
    unsavedNotes.delete(id);
    noteState(id, 'Saved');
  }

  els.list.addEventListener('input', (e) => {
    const box = e.target.closest('textarea[data-notes]');
    if (!box) return;
    const id = box.closest('.lead').dataset.id;
    noteState(id, '');
    clearTimeout(noteTimers.get(id));
    noteTimers.set(id, setTimeout(() => saveNote(id, box.value), NOTE_DELAY));
  });

  els.list.addEventListener('focusout', (e) => {
    const box = e.target.closest('textarea[data-notes]');
    if (!box) return;
    saveNote(box.closest('.lead').dataset.id, box.value);
    setTimeout(() => { if (renderWaiting) render(); });
  });

  els.more.addEventListener('click', () => {
    state.shown += PAGE_SIZE;
    render();
  });

  /* ---------- CSV import ---------- */

  const imp = {
    dialog: $('#import-dialog'),
    stepFile: $('#import-step-file'),
    stepMap: $('#import-step-map'),
    stepSummary: $('#import-step-summary'),
    file: $('#csv-file'),
    fileName: $('#csv-file-name'),
    fileError: $('#file-error'),
    sheetField: $('#sheet-field'),
    sheetSelect: $('#sheet-select'),
    workbook: null,
    mapList: $('#map-list'),
    defaultType: $('#default-type'),
    summary: $('#summary-list'),
    progress: $('#import-progress'),
    bar: $('#import-progress-bar'),
    error: $('#import-error'),
    back: $('#import-back'),
    next: $('#import-next'),
    go: $('#import-go'),
    done: $('#import-done'),
    headers: [],
    rows: [],
    ready: []
  };

  function importStep(step) {
    imp.stepFile.hidden = step !== 'file';
    imp.stepMap.hidden = step !== 'map';
    imp.stepSummary.hidden = step !== 'summary' && step !== 'finished';
    imp.back.hidden = step !== 'map' && step !== 'summary';
    imp.next.hidden = step !== 'map';
    imp.go.hidden = step !== 'summary';
    imp.done.hidden = step !== 'finished';
  }

  function resetImport() {
    imp.file.value = '';
    imp.fileName.textContent = 'No file chosen';
    imp.fileError.hidden = true;
    imp.error.hidden = true;
    imp.progress.hidden = true;
    imp.bar.style.width = '0';
    imp.go.disabled = false;
    imp.headers = [];
    imp.rows = [];
    imp.ready = [];
    imp.workbook = null;
    imp.sheetField.hidden = true;
    importStep('file');
  }

  $('#import-btn').addEventListener('click', () => {
    resetImport();
    imp.dialog.showModal();
  });

  imp.dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) imp.dialog.close();
  });

  function showFileError(msg) {
    imp.fileError.textContent = msg;
    imp.fileError.hidden = false;
    importStep('file');
  }

  function useTable(headers, rows) {
    headers = headers.filter(Boolean);
    if (!headers.length || !rows.length) {
      showFileError('That file looks empty, or its first row has no column names.');
      return;
    }
    imp.headers = headers;
    imp.rows = rows;
    buildMapping();
    importStep('map');
  }

  // The Excel reader is only downloaded when someone picks an Excel file.
  const SHEETJS_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  let sheetJs = null;
  function loadSheetJs() {
    sheetJs = sheetJs || new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SHEETJS_URL;
      s.onload = () => resolve(window.XLSX);
      s.onerror = () => {
        sheetJs = null;
        reject(new Error('the Excel reader could not be downloaded. Check your internet connection and try again'));
      };
      document.head.appendChild(s);
    });
    return sheetJs;
  }

  function useSheet(name) {
    const grid = window.XLSX.utils.sheet_to_json(imp.workbook.Sheets[name], { header: 1, defval: '', raw: false, blankrows: false });
    const headers = (grid[0] || []).map(clean);
    const rows = grid.slice(1).map((cells) => {
      const row = {};
      headers.forEach((h, i) => { if (h) row[h] = cells[i] ?? ''; });
      return row;
    });
    useTable(headers, rows);
  }

  async function readExcel(file) {
    imp.fileName.textContent = `${file.name} (reading…)`;
    try {
      const XLSX = await loadSheetJs();
      imp.workbook = XLSX.read(await file.arrayBuffer());
    } catch (err) {
      showFileError('Could not read that file: ' + err.message + '.');
      return;
    } finally {
      imp.fileName.textContent = file.name;
    }
    // Start on the sheet with the most rows (e.g. "Leads" rather than a summary sheet).
    const sheets = imp.workbook.SheetNames.map((name) => {
      const ref = imp.workbook.Sheets[name]['!ref'];
      return { name, rows: ref ? window.XLSX.utils.decode_range(ref).e.r : 0 };
    });
    const biggest = sheets.reduce((a, b) => (b.rows > a.rows ? b : a));
    imp.sheetSelect.innerHTML = sheets
      .map((s) => `<option value="${esc(s.name)}">${esc(s.name)} (${s.rows.toLocaleString('en-ZA')} rows)</option>`).join('');
    imp.sheetSelect.value = biggest.name;
    imp.sheetField.hidden = sheets.length < 2;
    useSheet(biggest.name);
  }

  imp.sheetSelect.addEventListener('change', () => useSheet(imp.sheetSelect.value));

  imp.file.addEventListener('change', () => {
    const file = imp.file.files[0];
    if (!file) return;
    imp.fileName.textContent = file.name;
    imp.fileError.hidden = true;
    imp.sheetField.hidden = true;

    if (/\.xlsx?$/i.test(file.name)) {
      readExcel(file);
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => clean(h),
      complete: (res) => useTable(res.meta.fields || [], res.data),
      error: (err) => showFileError('Could not read that file: ' + err.message)
    });
  });

  function guessColumn(field, used) {
    const norm = imp.headers.map(normHeader);
    const free = (i) => !used.has(imp.headers[i]);
    for (const alias of field.aliases) {
      const i = norm.findIndex((h, idx) => free(idx) && h === alias);
      if (i > -1) return imp.headers[i];
    }
    for (const alias of field.aliases.filter((a) => a.length >= 4)) {
      const i = norm.findIndex((h, idx) => free(idx) && h.includes(alias));
      if (i > -1) return imp.headers[i];
    }
    return '';
  }

  function buildMapping() {
    const used = new Set();
    const first = imp.rows[0] || {};
    imp.mapList.innerHTML = FIELDS.map((f) => {
      const guess = guessColumn(f, used);
      if (guess) used.add(guess);
      const opts = ['<option value="">— Don\'t import —</option>']
        .concat(imp.headers.map((h) => `<option value="${esc(h)}"${h === guess ? ' selected' : ''}>${esc(h)}</option>`))
        .join('');
      return `
        <div class="map-row">
          <label for="map-${f.key}">${esc(f.label)}${f.required ? ' <span class="req">(required)</span>' : ''}</label>
          <select id="map-${f.key}" data-field="${f.key}">${opts}</select>
          <p class="map-example" data-example="${f.key}">${guess ? 'e.g. ' + esc(clean(first[guess]) || '(blank)') : ''}</p>
        </div>`;
    }).join('');
  }

  imp.mapList.addEventListener('change', (e) => {
    const sel = e.target.closest('select[data-field]');
    if (!sel) return;
    const ex = imp.mapList.querySelector(`[data-example="${sel.dataset.field}"]`);
    ex.textContent = sel.value ? 'e.g. ' + (clean(imp.rows[0]?.[sel.value]) || '(blank)') : '';
  });

  function currentMapping() {
    const map = {};
    imp.mapList.querySelectorAll('select[data-field]').forEach((s) => { map[s.dataset.field] = s.value; });
    return map;
  }

  imp.next.addEventListener('click', async () => {
    const map = currentMapping();
    if (!map.business_name) {
      toast('Please choose which column holds the business name.', true);
      return;
    }
    imp.next.disabled = true;
    imp.next.textContent = 'Checking…';
    await loadLeads();   // compare against the latest list, not a stale copy
    imp.next.disabled = false;
    imp.next.textContent = 'Check for duplicates';
    prepareImport(map);
    importStep('summary');
  });

  function prepareImport(map) {
    // A row is a duplicate if it shares a phone number, an email address or a Google place
    // with a lead already in the list, or with an earlier row in the file.
    const seen = { phones: new Set(), emails: new Set(), places: new Set() };
    for (const l of state.leads) {
      phoneKeys(l.phone).forEach((k) => seen.phones.add(k));
      emailKeys(l.email).forEach((k) => seen.emails.add(k));
      if (placeKey(l.maps_url)) seen.places.add(placeKey(l.maps_url));
    }
    const inDb = { phones: new Set(seen.phones), emails: new Set(seen.emails), places: new Set(seen.places) };
    const hits = (sets, keys) => keys.phones.some((k) => sets.phones.has(k)) ||
      keys.emails.some((k) => sets.emails.has(k)) || keys.places.some((k) => sets.places.has(k));

    const defaultType = imp.defaultType.value || null;
    const counts = { noName: 0, existing: 0, inFile: 0 };
    imp.ready = [];

    for (const row of imp.rows) {
      const get = (key) => (map[key] ? clean(row[map[key]]) : '');
      const name = get('business_name');
      if (!name) { counts.noName++; continue; }

      // Excel drops the leading 0 from numbers typed as 821234567.
      const phone = /^[1-9]\d{8}$/.test(get('phone')) ? '0' + get('phone') : get('phone');
      const emails = [...new Set(emailKeys(get('email')).concat(emailKeys(get('other_emails'))))];
      const mapsUrl = get('maps_url');
      const keys = { phones: phoneKeys(phone), emails, places: placeKey(mapsUrl) ? [placeKey(mapsUrl)] : [] };

      if (hits(seen, keys)) {
        counts[hits(inDb, keys) ? 'existing' : 'inFile']++;
        continue;
      }
      keys.phones.forEach((k) => seen.phones.add(k));
      keys.emails.forEach((k) => seen.emails.add(k));
      keys.places.forEach((k) => seen.places.add(k));

      imp.ready.push({
        business_name: name,
        business_type: normType(get('business_type')) || defaultType,
        contact_person: get('contact_person') || null,
        phone: phone || null,
        email: emails.join('; ') || get('email') || null,
        town: get('town') || null,
        province: normProvince(get('province')),
        address: get('address') || null,
        website: get('website') || null,
        maps_url: mapsUrl || null,
        notes: get('notes') || null,
        source: 'Scraped list'
      });
    }

    const n = imp.ready.length;
    imp.summary.innerHTML = [
      ['Rows in file', imp.rows.length],
      ['Already in your list (same phone, email or Google Maps place)', counts.existing],
      ['Repeated within the file', counts.inFile],
      ['Missing a business name', counts.noName],
      ['New leads to import', n, true]
    ].map(([label, num, main]) => `<li${main ? ' class="is-main"' : ''}><span>${label}</span><strong>${num.toLocaleString('en-ZA')}</strong></li>`).join('');

    imp.go.textContent = n ? `Import ${n.toLocaleString('en-ZA')} lead${n === 1 ? '' : 's'}` : 'Nothing to import';
    imp.go.disabled = n === 0;
  }

  imp.back.addEventListener('click', () => {
    if (!imp.stepSummary.hidden) importStep('map');
    else resetImport();
  });

  imp.go.addEventListener('click', async () => {
    const rows = imp.ready;
    imp.go.disabled = true;
    imp.back.hidden = true;
    imp.error.hidden = true;
    imp.progress.hidden = false;
    imp.dialog.dataset.busy = '1';

    let done = 0;
    try {
      for (let i = 0; i < rows.length; i += INSERT_BATCH) {
        const { error } = await sb.from('leads').insert(rows.slice(i, i + INSERT_BATCH));
        if (error) throw error;
        done = Math.min(i + INSERT_BATCH, rows.length);
        imp.bar.style.width = `${Math.round((done / rows.length) * 100)}%`;
      }
      imp.summary.insertAdjacentHTML('beforeend',
        `<li class="is-main"><span>Imported</span><strong>${done}</strong></li>`);
      toast(`Imported ${done} lead${done === 1 ? '' : 's'}.`);
    } catch (err) {
      console.error(err);
      imp.error.textContent = /address|maps_url/.test(err.message)
        ? 'Your database needs a small update before this file can be imported. ' +
          'In Supabase, open SQL Editor and run leads/supabase-setup.sql again (see SETUP.md), then try again.'
        : `Stopped after ${done} of ${rows.length} leads: ${err.message}. ` +
          'You can import the same file again; leads already added will be skipped as duplicates.';
      imp.error.hidden = false;
    } finally {
      delete imp.dialog.dataset.busy;
      importStep('finished');
      await loadLeads();
    }
  });

  // Don't let Escape close the dialog half-way through an import.
  imp.dialog.addEventListener('cancel', (e) => {
    if (imp.dialog.dataset.busy) e.preventDefault();
  });
})();
