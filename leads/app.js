/* ==========================================================================
   Dreamland Co. – lead tracker
   Plain JS. Data lives in Supabase (see SETUP.md).
   ========================================================================== */

(() => {
  'use strict';

  const PAGE_SIZE = 60;       // cards rendered at a time, keeps phones fast
  const FETCH_BATCH = 1000;   // Supabase returns at most 1000 rows per request
  const INSERT_BATCH = 500;
  const UPDATE_BATCH = 500;
  const DELETE_BATCH = 100;   // ids per delete request; keeps the request URL short

  const STATUSES = ['Not called', 'Did not answer', 'Interested', 'Not interested', 'Opted out', 'Customer'];
  const statusClass = (s) => 'st-' + String(s).toLowerCase().replace(/[^a-z]+/g, '-');

  // Products for orders come from the website's product list (js/data.js).
  const PRODUCTS = (window.DREAMLAND_PRODUCTS || []).map((p) => ({
    id: p.id,
    name: p.colour ? `${p.name.en} – ${p.colour.en.toLowerCase()}` : p.name.en,
    price: p.price
  }));

  // The three lead tabs. `filter` picks the leads, `sort` orders them, `hint` explains the view.
  // The fourth tab, Customers, lists customers rather than leads (see customerRows and customerCard).
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
      filter: (l) => l.status === 'Interested' ||
        (l.source === 'Website form' && l.status !== 'Opted out' && l.status !== 'Customer'),
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
    toast: $('#toast'),
    importBtn: $('#import-btn'),
    addCustomer: $('#add-customer-btn'),
    customerSort: $('#customer-sort'),
    selectToggle: $('#select-toggle'),
    selectBar: $('#select-bar'),
    selectCount: $('#select-count'),
    selectAll: $('#select-all'),
    selectNone: $('#select-none'),
    selectDelete: $('#select-delete')
  };

  const state = {
    leads: [],
    customers: [],
    orders: [],
    customersError: '',   // set when the customer tables are missing (database not updated yet)
    view: 'all',
    query: '',
    status: '',
    province: '',
    town: '',
    customerSort: 'latest',
    shown: PAGE_SIZE,
    listed: [],           // every lead or customer that matches the current tab and filters
    selecting: false,
    selected: new Set(),  // lead ids ticked for deleting
    busy: false,          // a bulk change is running on this device
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

  // R12 340 or R12 340,50
  const money = (n) => 'R' + Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const plural = (n, word) => `${n.toLocaleString('en-ZA')} ${word}${n === 1 ? '' : 's'}`;

  // Order dates are plain dates ("2026-10-29"), so read them as local dates.
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const dateLabel = (iso) => new Date(iso + 'T00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

  // "Are you sure?" box. Resolves true when the person confirms.
  const confirmDialog = $('#confirm-dialog');
  function confirmBox(title, text, okLabel = 'Delete') {
    $('#confirm-title').textContent = title;
    $('#confirm-text').textContent = text;
    $('#confirm-ok').textContent = okLabel;
    confirmDialog.returnValue = '';
    confirmDialog.showModal();
    $('#confirm-cancel').focus();
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (confirmDialog.open) confirmDialog.close();
        resolve(ok);
      };
      $('#confirm-ok').onclick = (e) => { e.preventDefault(); finish(true); };
      $('#confirm-cancel').onclick = (e) => { e.preventDefault(); finish(false); };
      confirmDialog.onclose = () => finish(false);   // Escape key
    });
  }

  // Missing tables or functions mean supabase-setup.sql hasn't been run again since this update.
  const needsDbUpdate = (err) => /does not exist|could not find|schema cache|PGRST20[25]|42P01|42883/i.test(`${err?.code} ${err?.message}`);
  const DB_UPDATE_MSG = 'Your database needs a small update first. In Supabase, open SQL Editor and run ' +
    'leads/supabase-setup.sql again (see SETUP.md), then reload this page.';

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
  async function fetchAll(table) {
    const page = (from, opts) => sb
      .from(table)
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
      state.leads = await fetchAll('leads');
      render();
    } catch (err) {
      console.error(err);
      toast('Could not load leads: ' + err.message, true);
    }
  }

  async function loadCustomers() {
    try {
      const [customers, orders] = await Promise.all([fetchAll('customers'), fetchAll('orders')]);
      state.customers = customers;
      state.orders = orders;
      state.customersError = '';
    } catch (err) {
      console.error(err);
      state.customersError = needsDbUpdate(err) ? DB_UPDATE_MSG : 'Could not load customers: ' + err.message;
    }
    render();
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

    // Customers and orders are few, so any change to them simply reloads both.
    let customerTimer;
    const customerChange = () => {
      if (state.busy) return;
      clearTimeout(customerTimer);
      customerTimer = setTimeout(loadCustomers, 500);
    };

    state.channel = sb
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (state.busy) return;   // this device is importing or deleting; it reloads when done
        clearTimeout(pending);
        if (flooding) {
          pending = setTimeout(endFlood, 3000);
          return;
        }
        queue.push(payload);
        pending = setTimeout(flush, 300);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, customerChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, customerChange)
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
        await Promise.all([loadLeads(), loadCustomers()]);
        subscribe();
      }
    } else {
      unsubscribe();
      state.leads = [];
      state.customers = [];
      state.orders = [];
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
    const tags = [
      l.status === 'Customer' && '<span class="pill pill-customer">Customer</span>',
      l.source === 'Website form' && '<span class="pill pill-web">Website form</span>'
    ].filter(Boolean).join('');
    const selected = state.selected.has(l.id);
    return `
      <article class="lead${optedOut ? ' is-opted-out' : ''}${selected ? ' is-selected' : ''}" data-id="${esc(l.id)}">
        ${state.selecting ? `<label class="lead-check"><input type="checkbox" data-select${selected ? ' checked' : ''}> <span>Select</span></label>` : ''}
        <h3 class="lead-name">${esc(l.business_name)}</h3>
        ${meta ? `<p class="lead-meta">${esc(meta)}</p>` : ''}
        ${lines ? `<ul class="lead-lines">${lines}</ul>` : ''}
        ${tags ? `<div class="lead-tags">${tags}</div>` : ''}
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
        <div class="card-tools">
          <button class="btn btn-outline btn-sm" type="button" data-record-order>
            <svg class="btn-icon" aria-hidden="true"><use href="#i-box"/></svg> Record order</button>
          <button class="link-btn link-danger" type="button" data-delete-lead>
            <svg class="btn-icon" aria-hidden="true"><use href="#i-trash"/></svg> Delete</button>
        </div>
      </article>`;
  }

  /* ---------- Customers ---------- */

  // Each customer with their orders (newest first) and totals worked out.
  function customerRows() {
    const byCustomer = new Map();
    for (const o of state.orders) {
      if (!byCustomer.has(o.customer_id)) byCustomer.set(o.customer_id, []);
      byCustomer.get(o.customer_id).push(o);
    }
    return state.customers.map((c) => {
      const orders = (byCustomer.get(c.id) || [])
        .sort((a, b) => b.order_date.localeCompare(a.order_date) || (b.created_at || '').localeCompare(a.created_at || ''));
      return {
        ...c,
        orders,
        spent: orders.reduce((sum, o) => sum + Number(o.total || 0), 0),
        first: orders.length ? orders[orders.length - 1].order_date : '',
        latest: orders.length ? orders[0].order_date : ''
      };
    });
  }

  const CUSTOMER_SORTS = {
    latest: (a, b) => (b.latest || '').localeCompare(a.latest || '') || byNewest(a, b),
    spent: (a, b) => b.spent - a.spent || sortText(a.business_name, b.business_name),
    orders: (a, b) => b.orders.length - a.orders.length || sortText(a.business_name, b.business_name),
    name: (a, b) => sortText(a.business_name, b.business_name)
  };

  const itemsText = (items) => (items || [])
    .map((i) => `${i.product} × ${Number(i.quantity).toLocaleString('en-ZA')}`).join(', ') || 'No items listed';

  function customerCard(c) {
    const place = [c.town, c.province].filter(Boolean).join(', ');
    const lines = [
      c.contact_person && `<li><span class="label">Contact:</span> ${esc(c.contact_person)}</li>`,
      c.phone && `<li><span class="label">Phone:</span> ${esc(c.phone)}</li>`,
      c.email && `<li><span class="label">Email:</span> ${esc(c.email)}</li>`,
      c.address && `<li><span class="label">Address:</span> ${esc(c.address)}</li>`
    ].filter(Boolean).join('');
    const actions = [
      actionLink(telHref(c.phone), 'i-phone', 'Call'),
      actionLink(mailHref(c.email, c.business_name), 'i-mail', 'Email'),
      actionLink(mapsHref(c), 'i-map', 'Map', { external: true })
    ].join('');
    const history = c.orders.map((o) => `
      <li class="order" data-order-id="${esc(o.id)}">
        <div class="order-top">
          <strong>${esc(dateLabel(o.order_date))}</strong>
          <span class="order-total">${esc(money(o.total))}</span>
        </div>
        <p class="order-items-text">${esc(itemsText(o.items))}</p>
        ${o.delivery_address ? `<p class="order-extra"><span class="label">Deliver to:</span> ${esc(o.delivery_address)}</p>` : ''}
        ${o.notes ? `<p class="order-extra"><span class="label">Notes:</span> ${esc(o.notes)}</p>` : ''}
        <button class="link-btn link-danger link-small" type="button" data-delete-order>Delete order</button>
      </li>`).join('');
    return `
      <article class="lead customer" data-cid="${esc(c.id)}">
        <h3 class="lead-name">${esc(c.business_name)}</h3>
        ${place ? `<p class="lead-meta">${esc(place)}</p>` : ''}
        ${lines ? `<ul class="lead-lines">${lines}</ul>` : ''}
        <dl class="customer-stats">
          <div><dt>Orders</dt><dd>${c.orders.length.toLocaleString('en-ZA')}</dd></div>
          <div><dt>Total spent</dt><dd>${esc(money(c.spent))}</dd></div>
          <div><dt>First order</dt><dd>${c.first ? esc(dateLabel(c.first)) : '–'}</dd></div>
          <div><dt>Latest order</dt><dd>${c.latest ? esc(dateLabel(c.latest)) : '–'}</dd></div>
        </dl>
        ${actions ? `<div class="lead-actions">${actions}</div>` : ''}
        ${c.notes ? `<p class="customer-notes"><span class="label">Notes:</span> ${esc(c.notes)}</p>` : ''}
        ${c.orders.length ? `
          <details class="order-history"${c.orders.length <= 3 ? ' open' : ''}>
            <summary>Order history (${c.orders.length})</summary>
            <ul class="orders">${history}</ul>
          </details>` : '<p class="muted no-orders">No orders recorded yet.</p>'}
        <div class="card-tools">
          <button class="btn btn-primary btn-sm" type="button" data-customer-order>
            <svg class="btn-icon" aria-hidden="true"><use href="#i-box"/></svg> Record order</button>
          <button class="link-btn" type="button" data-edit-customer>
            <svg class="btn-icon" aria-hidden="true"><use href="#i-edit"/></svg> Edit</button>
          <button class="link-btn link-danger" type="button" data-delete-customer>
            <svg class="btn-icon" aria-hidden="true"><use href="#i-trash"/></svg> Delete</button>
        </div>
      </article>`;
  }

  // Redrawing the list while someone types a note would wipe their cursor and text,
  // so wait until they leave the notes box.
  let renderWaiting = false;
  const editingNote = () => document.activeElement?.matches?.('#lead-list textarea[data-notes]');

  const isCustomerView = () => state.view === 'customers';

  function render() {
    if (editingNote()) { renderWaiting = true; return; }
    renderWaiting = false;
    const customers = isCustomerView();
    const view = VIEWS[state.view];
    const inView = customers ? customerRows() : state.leads.filter(view.filter);

    els.importBtn.hidden = customers;
    els.addCustomer.hidden = !customers;
    els.fStatus.hidden = customers;
    els.customerSort.hidden = !customers;
    els.selectToggle.hidden = customers;
    els.search.placeholder = customers ? 'Search customers…' : 'Search leads…';
    if (customers && state.selecting) setSelecting(false);

    // Filter choices come from the rows in this tab; towns narrow to the chosen province.
    const distinct = (rows, key) => [...new Set(rows.map((l) => l[key]).filter(Boolean))].sort(sortText);
    if (!customers) {
      const usedStatuses = new Set(inView.map((l) => l.status));
      state.status = setOptions(els.fStatus, 'All statuses', STATUSES.filter((s) => usedStatuses.has(s)), state.status);
    }
    state.province = setOptions(els.fProvince, 'All provinces', distinct(inView, 'province'), state.province);
    const townPool = state.province ? inView.filter((l) => l.province === state.province) : inView;
    state.town = setOptions(els.fTown, 'All towns', distinct(townPool, 'town'), state.town);

    const status = customers ? '' : state.status;
    const list = inView
      .filter((l) => (!status || l.status === status) &&
        (!state.province || l.province === state.province) &&
        (!state.town || l.town === state.town) &&
        matches(l, state.query))
      .sort(customers ? CUSTOMER_SORTS[state.customerSort] : view.sort);
    const visible = list.slice(0, state.shown);
    state.listed = list;

    els.list.innerHTML = visible.map(customers ? customerCard : leadCard).join('');
    els.more.hidden = list.length <= visible.length;
    els.more.textContent = `Show more (${(list.length - visible.length).toLocaleString('en-ZA')} left)`;

    const narrowed = state.query || status || state.province || state.town;
    const n = (x) => x.toLocaleString('en-ZA');
    els.count.textContent = narrowed
      ? `${n(list.length)} of ${n(inView.length)} match`
      : plural(inView.length, customers ? 'customer' : 'lead');
    els.clearFilters.hidden = !narrowed;
    const hint = customers ? 'Everyone who has ordered. Use “Record order” on a lead, or “Add customer”.' : view.hint;
    els.hint.textContent = hint || '';
    els.hint.hidden = !hint;

    els.empty.hidden = list.length > 0;
    els.empty.textContent = customers
      ? (state.customersError || (narrowed ? 'No customers match your search or filters.'
        : 'No customers yet. Tap “Record order” on a lead, or “Add customer”.'))
      : state.leads.length === 0
        ? 'No leads yet. Use “Import” to upload your list.'
        : narrowed ? 'No leads match your search or filters.'
          : state.view === 'call' ? 'Nobody left to call. Nice work!'
            : 'No warm leads yet.';
    if (customers && state.customersError) els.empty.hidden = false;

    renderStats();
    updateSelectBar();
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
    document.querySelector('[data-count="customers"]').textContent = short.format(state.customers.length);
  }

  function setView(view) {
    if (!VIEWS[view] && view !== 'customers') view = 'all';
    state.view = view;
    state.shown = PAGE_SIZE;
    els.tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.view === view)));
    try { localStorage.setItem('dl-view', view); } catch (e) { /* private mode */ }
    render();
  }

  els.tabs.forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));
  try {
    const saved = localStorage.getItem('dl-view');
    if (saved) setView(saved);
  } catch (e) { /* private mode */ }

  els.customerSort.addEventListener('change', () => {
    state.customerSort = els.customerSort.value;
    state.shown = PAGE_SIZE;
    render();
  });

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

  /* ---------- Deleting leads ---------- */

  function setSelecting(on) {
    state.selecting = on;
    if (!on) state.selected.clear();
    els.selectToggle.textContent = on ? 'Done' : 'Select';
    document.body.classList.toggle('is-selecting', on);
    render();
  }

  function updateSelectBar() {
    const n = state.selected.size;
    els.selectBar.hidden = !state.selecting;
    els.selectCount.textContent = `${n.toLocaleString('en-ZA')} selected`;
    els.selectDelete.disabled = n === 0;
    els.selectDelete.lastChild.textContent = n ? ` Delete ${n.toLocaleString('en-ZA')}` : ' Delete';
    const all = state.listed.length;
    els.selectAll.textContent = `Select all ${all.toLocaleString('en-ZA')}`;
    els.selectAll.hidden = !all || n === all;
    els.selectNone.hidden = n === 0;
  }

  els.selectToggle.addEventListener('click', () => setSelecting(!state.selecting));
  els.selectAll.addEventListener('click', () => {
    state.listed.forEach((l) => state.selected.add(l.id));
    render();
  });
  els.selectNone.addEventListener('click', () => {
    state.selected.clear();
    render();
  });

  els.list.addEventListener('change', (e) => {
    const box = e.target.closest('input[data-select]');
    if (!box) return;
    const card = box.closest('.lead');
    if (box.checked) state.selected.add(card.dataset.id);
    else state.selected.delete(card.dataset.id);
    card.classList.toggle('is-selected', box.checked);
    updateSelectBar();
  });

  // Deletes in small batches so a big selection doesn't make one huge request.
  async function deleteLeads(ids) {
    state.busy = true;
    let done = 0;
    try {
      for (let i = 0; i < ids.length; i += DELETE_BATCH) {
        const chunk = ids.slice(i, i + DELETE_BATCH);
        const { error } = await sb.from('leads').delete().in('id', chunk);
        if (error) throw error;
        done += chunk.length;
        const gone = new Set(chunk);
        state.leads = state.leads.filter((l) => !gone.has(l.id));
        chunk.forEach((id) => state.selected.delete(id));
        if (ids.length > DELETE_BATCH) toast(`Deleting… ${done.toLocaleString('en-ZA')} of ${ids.length.toLocaleString('en-ZA')}`);
      }
      toast(`Deleted ${plural(done, 'lead')}.`);
    } catch (err) {
      console.error(err);
      toast(`Stopped after deleting ${plural(done, 'lead')}: ${err.message}`, true);
    } finally {
      state.busy = false;
      render();
    }
  }

  const customerOf = (leadId) => state.customers.find((c) => c.lead_id === leadId);

  els.selectDelete.addEventListener('click', async () => {
    const ids = [...state.selected];
    if (!ids.length) return;
    const linked = ids.filter((id) => customerOf(id)).length;
    const onScreen = new Set(state.listed.map((l) => l.id));
    const hidden = ids.filter((id) => !onScreen.has(id)).length;
    const ok = await confirmBox(
      `Delete ${plural(ids.length, 'lead')}?`,
      `${plural(ids.length, 'lead')} will be deleted for everyone, with their notes and call history. This can't be undone.` +
        (hidden ? ` This includes ${hidden.toLocaleString('en-ZA')} you selected earlier that the current search or filters hide.` : '') +
        (linked ? ` ${plural(linked, 'customer record')} and their orders will be kept.` : ''),
      `Delete ${ids.length.toLocaleString('en-ZA')}`
    );
    if (!ok) return;
    await deleteLeads(ids);
    if (!state.selected.size) setSelecting(false);
  });

  els.list.addEventListener('click', async (e) => {
    const card = e.target.closest('.lead[data-id]');
    if (!card) return;
    const lead = state.leads.find((l) => l.id === card.dataset.id);
    if (!lead) return;

    if (e.target.closest('[data-record-order]')) {
      openOrder({ lead });
    } else if (e.target.closest('[data-delete-lead]')) {
      const linked = customerOf(lead.id);
      const ok = await confirmBox(
        `Delete ${lead.business_name}?`,
        'This lead will be deleted for everyone, with its notes and call history. This can\'t be undone.' +
          (linked ? ' Their customer record and orders will be kept.' : '')
      );
      if (ok) await deleteLeads([lead.id]);
    }
  });

  /* ---------- Orders ---------- */

  // The order fields appear in two places: the "Record order" dialog and the
  // first-order part of the "Add customer" form.
  function orderFieldsHTML() {
    const rows = PRODUCTS.map((p) => `
      <div class="item-row" data-product="${esc(p.id)}" data-name="${esc(p.name)}">
        <span class="item-name">${esc(p.name)}</span>
        <label class="item-qty"><span>Quantity</span>
          <input type="number" inputmode="numeric" min="0" step="1" data-qty placeholder="0"></label>
        <label class="item-price"><span>Price each (R)</span>
          <input type="number" inputmode="decimal" min="0" step="0.01" data-price value="${esc(p.price)}"></label>
        <span class="item-line" data-line></span>
      </div>`).join('');
    return `
      <label class="field"><span>Order date</span>
        <input type="date" data-order="order_date" required></label>
      <fieldset class="order-items">
        <legend>Products ordered</legend>
        ${rows}
      </fieldset>
      <label class="field"><span>Order total (R)</span>
        <input type="number" inputmode="decimal" min="0" step="0.01" data-order="total">
        <small class="field-help">Worked out from the products. Change it if you gave a discount or charged for delivery.</small></label>
      <label class="field"><span>Delivery address</span>
        <textarea rows="2" data-order="delivery_address"></textarea></label>
      <label class="field"><span>Order notes</span>
        <textarea rows="2" data-order="notes" placeholder="Delivery date, invoice number…"></textarea></label>
      <p class="form-error" data-order-error role="alert" hidden></p>`;
  }

  function resetOrderFields(box, address) {
    if (!box.firstElementChild) box.innerHTML = orderFieldsHTML();
    box.querySelectorAll('[data-qty]').forEach((i) => { i.value = ''; });
    box.querySelectorAll('.item-row').forEach((r) => {
      r.querySelector('[data-price]').value = PRODUCTS.find((p) => p.id === r.dataset.product)?.price ?? '';
      r.querySelector('[data-line]').textContent = '';
    });
    const f = (k) => box.querySelector(`[data-order="${k}"]`);
    f('order_date').value = todayISO();
    f('total').value = '';
    delete f('total').dataset.touched;
    f('delivery_address').value = address || '';
    f('notes').value = '';
    box.querySelector('[data-order-error]').hidden = true;
  }

  function orderItems(box) {
    return [...box.querySelectorAll('.item-row')].map((r) => ({
      product: r.dataset.name,
      quantity: Math.max(0, Math.round(Number(r.querySelector('[data-qty]').value) || 0)),
      unit_price: Math.max(0, Number(r.querySelector('[data-price]').value) || 0)
    })).filter((i) => i.quantity > 0);
  }

  // Line totals and the order total follow the quantities, until someone types their own total.
  document.addEventListener('input', (e) => {
    const box = e.target.closest('[data-order-fields]');
    if (!box) return;
    const total = box.querySelector('[data-order="total"]');
    if (e.target === total) { total.dataset.touched = '1'; return; }
    if (!e.target.matches('[data-qty], [data-price]')) return;
    const row = e.target.closest('.item-row');
    const qty = Number(row.querySelector('[data-qty]').value) || 0;
    const price = Number(row.querySelector('[data-price]').value) || 0;
    row.querySelector('[data-line]').textContent = qty ? money(qty * price) : '';
    if (!total.dataset.touched) {
      const sum = orderItems(box).reduce((s, i) => s + i.quantity * i.unit_price, 0);
      total.value = sum ? Math.round(sum * 100) / 100 : '';
    }
  });

  // Reads and checks the order fields. Returns the order, or null after showing what's wrong.
  function readOrder(box) {
    const f = (k) => box.querySelector(`[data-order="${k}"]`);
    const err = box.querySelector('[data-order-error]');
    const items = orderItems(box);
    const total = Number(f('total').value);
    const problem = !f('order_date').value ? 'Please choose the order date.'
      : !items.length ? 'Please enter a quantity for at least one product.'
        : !(total >= 0) || f('total').value === '' ? 'Please enter the order total.' : '';
    err.textContent = problem;
    err.hidden = !problem;
    if (problem) {
      err.scrollIntoView({ block: 'nearest' });
      return null;
    }
    return {
      order_date: f('order_date').value,
      items,
      total: Math.round(total * 100) / 100,
      delivery_address: clean(f('delivery_address').value) || null,
      notes: f('notes').value.trim() || null
    };
  }

  const orderDialog = $('#order-dialog');
  const orderBox = orderDialog.querySelector('[data-order-fields]');
  let orderTarget = null;   // { lead } or { customer }

  function openOrder(target) {
    if (state.customersError) { toast(state.customersError, true); return; }
    orderTarget = target;
    const who = target.customer || target.lead;
    const existing = target.lead ? customerOf(target.lead.id) : target.customer;
    // Deliver where they asked last time, else to the address on record.
    const lastOrder = existing && state.orders
      .filter((o) => o.customer_id === existing.id && o.delivery_address)
      .sort((a, b) => b.order_date.localeCompare(a.order_date))[0];
    $('#order-for').textContent = who.business_name;
    resetOrderFields(orderBox, lastOrder?.delivery_address || existing?.address || who.address);
    orderDialog.showModal();
  }

  for (const d of [orderDialog, $('#customer-dialog')]) {
    d.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('cancel', (e) => { if (d.dataset.busy) e.preventDefault(); });
  }

  const customerFields = (src) => ({
    business_name: src.business_name,
    contact_person: src.contact_person || null,
    phone: src.phone || null,
    email: src.email || null,
    town: src.town || null,
    province: src.province || null,
    address: src.address || null
  });

  // Phone or email shared with a customer or lead (ignoring `skip`, the record being saved).
  function findMatches({ phone, email }, skip = {}) {
    const phones = new Set(phoneKeys(phone));
    const emails = new Set(emailKeys(email));
    const hit = (r) => phoneKeys(r.phone).some((k) => phones.has(k)) || emailKeys(r.email).some((k) => emails.has(k));
    if (!phones.size && !emails.size) return { customers: [], leads: [] };
    return {
      customers: state.customers.filter((c) => c.id !== skip.customerId && hit(c)),
      leads: state.leads.filter((l) => l.id !== skip.leadId && hit(l))
    };
  }

  async function insertCustomer(row) {
    const { data, error } = await sb.from('customers').insert(row).select().single();
    if (error) throw error;
    state.customers.push(data);
    return data;
  }

  async function insertOrder(customerId, order) {
    const { data, error } = await sb.from('orders').insert({ customer_id: customerId, ...order }).select().single();
    if (error) throw error;
    state.orders.push(data);
    return data;
  }

  // The lead leaves the To call list, but keeps its notes and history.
  async function markLeadCustomer(lead) {
    if (!lead || lead.status === 'Customer') return;
    const changes = { status: 'Customer', last_contacted: new Date().toISOString() };
    const { error } = await sb.from('leads').update(changes).eq('id', lead.id);
    if (error) throw error;
    Object.assign(lead, changes);
  }

  // The customer record for a lead: the one already linked to it, or one with the same
  // phone or email (after asking), or a new one made from the lead's details.
  async function customerForLead(lead) {
    const linked = customerOf(lead.id);
    if (linked) return linked;
    const same = findMatches(lead).customers[0];
    if (same && await confirmBox(
      'Already a customer?',
      `${same.business_name} is already a customer with the same phone number or email. Add this order to ${same.business_name}?`,
      `Add to ${same.business_name}`
    )) {
      if (!same.lead_id) {
        const { error } = await sb.from('customers').update({ lead_id: lead.id }).eq('id', same.id);
        if (error) throw error;
        same.lead_id = lead.id;
      }
      return same;
    }
    return insertCustomer({ ...customerFields(lead), lead_id: lead.id });
  }

  $('#order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const order = readOrder(orderBox);
    if (!order) return;
    const save = $('#order-save');
    save.disabled = true;
    save.textContent = 'Saving…';
    orderDialog.dataset.busy = '1';
    try {
      const { lead } = orderTarget;
      const customer = orderTarget.customer || await customerForLead(lead);
      await insertOrder(customer.id, order);
      const fromLead = lead || state.leads.find((l) => l.id === customer.lead_id);
      await markLeadCustomer(fromLead).catch((err) => toast('Order saved, but the lead status could not be changed: ' + err.message, true));
      orderDialog.close();
      toast(lead && lead.status === 'Customer' ? `Order saved. ${customer.business_name} is now a customer.` : 'Order saved.');
      render();
    } catch (err) {
      console.error(err);
      const box = orderBox.querySelector('[data-order-error]');
      box.textContent = needsDbUpdate(err) ? DB_UPDATE_MSG : 'Could not save the order: ' + err.message;
      box.hidden = false;
    } finally {
      delete orderDialog.dataset.busy;
      save.disabled = false;
      save.textContent = 'Save order';
    }
  });

  /* ---------- Customer cards ---------- */

  els.list.addEventListener('click', async (e) => {
    const card = e.target.closest('.customer[data-cid]');
    if (!card) return;
    const customer = state.customers.find((c) => c.id === card.dataset.cid);
    if (!customer) return;

    if (e.target.closest('[data-customer-order]')) {
      openOrder({ customer });
    } else if (e.target.closest('[data-edit-customer]')) {
      openCustomerForm(customer);
    } else if (e.target.closest('[data-delete-customer]')) {
      const n = state.orders.filter((o) => o.customer_id === customer.id).length;
      const ok = await confirmBox(
        `Delete ${customer.business_name}?`,
        `The customer record${n ? ` and ${plural(n, 'order')}` : ''} will be deleted for everyone. This can't be undone.` +
          (customer.lead_id ? ' The lead stays in your lead list.' : '')
      );
      if (!ok) return;
      const { error } = await sb.from('customers').delete().eq('id', customer.id);
      if (error) { toast('Could not delete: ' + error.message, true); return; }
      state.customers = state.customers.filter((c) => c.id !== customer.id);
      state.orders = state.orders.filter((o) => o.customer_id !== customer.id);
      toast(`Deleted ${customer.business_name}.`);
      render();
    } else if (e.target.closest('[data-delete-order]')) {
      const order = state.orders.find((o) => o.id === e.target.closest('[data-order-id]').dataset.orderId);
      if (!order || !await confirmBox(
        'Delete this order?',
        `The ${dateLabel(order.order_date)} order (${money(order.total)}) for ${customer.business_name} will be deleted. This can't be undone.`
      )) return;
      const { error } = await sb.from('orders').delete().eq('id', order.id);
      if (error) { toast('Could not delete: ' + error.message, true); return; }
      state.orders = state.orders.filter((o) => o.id !== order.id);
      toast('Order deleted.');
      render();
    }
  });

  /* ---------- Add / edit customer ---------- */

  const custDialog = $('#customer-dialog');
  const custForm = $('#customer-form');
  const firstOrder = $('#first-order');
  const dupBox = $('#dup-warning');
  let editing = null;         // the customer being edited, or null when adding
  let dupChecked = false;     // the duplicate warning has been shown for these details

  function openCustomerForm(customer = null) {
    if (state.customersError) { toast(state.customersError, true); return; }
    editing = customer;
    dupChecked = false;
    custForm.reset();
    for (const [k, v] of Object.entries(customer || {})) {
      if (custForm.elements[k] && typeof v === 'string') custForm.elements[k].value = v;
    }
    $('#customer-title').textContent = customer ? 'Edit customer' : 'Add customer';
    $('#customer-save').textContent = 'Save customer';
    $('#first-order-toggle').hidden = !!customer;
    firstOrder.hidden = true;
    dupBox.hidden = true;
    custDialog.showModal();
  }

  els.addCustomer.addEventListener('click', () => openCustomerForm());

  custForm.elements.with_order.addEventListener('change', (e) => {
    firstOrder.hidden = !e.target.checked;
    if (e.target.checked) resetOrderFields(firstOrder, custForm.elements.address.value);
  });

  // Changing the phone or email means the duplicate check has to run again.
  for (const k of ['phone', 'email']) {
    custForm.elements[k].addEventListener('input', () => {
      dupChecked = false;
      dupBox.hidden = true;
      $('#customer-save').textContent = 'Save customer';
    });
  }

  function readCustomerForm() {
    const v = (k) => clean(custForm.elements[k].value);
    return {
      business_name: v('business_name'),
      contact_person: v('contact_person') || null,
      phone: v('phone') || null,
      email: v('email') || null,
      town: v('town') || null,
      province: v('province') || null,
      address: custForm.elements.address.value.trim() || null,
      notes: custForm.elements.notes.value.trim() || null
    };
  }

  function showDuplicates(matches) {
    const item = (kind, r) => `
      <li><strong>${esc(r.business_name)}</strong>
        <span class="muted">${esc([kind, r.phone, r.email].filter(Boolean).join(' · '))}</span>
        <button class="btn btn-outline btn-sm" type="button" data-link-${kind === 'Customer' ? 'customer' : 'lead'}="${esc(r.id)}">
          ${kind === 'Customer' ? 'Use this customer' : 'Link to this lead'}</button></li>`;
    dupBox.innerHTML = `
      <p><strong>Already in your list?</strong> The phone number or email matches:</p>
      <ul class="dup-list">
        ${matches.customers.slice(0, 5).map((c) => item('Customer', c)).join('')}
        ${matches.leads.slice(0, 5).map((l) => item('Lead', l)).join('')}
      </ul>
      <p class="muted">Or tap “Save as new customer” to add a separate record anyway.</p>`;
    dupBox.hidden = false;
    $('#customer-save').textContent = 'Save as new customer';
    dupBox.scrollIntoView({ block: 'nearest' });
  }

  async function withBusy(fn) {
    const save = $('#customer-save');
    const label = save.textContent;
    save.disabled = true;
    save.textContent = 'Saving…';
    custDialog.dataset.busy = '1';
    try {
      await fn();
    } catch (err) {
      console.error(err);
      toast(needsDbUpdate(err) ? DB_UPDATE_MSG : 'Could not save: ' + err.message, true);
    } finally {
      delete custDialog.dataset.busy;
      save.disabled = false;
      save.textContent = label;
    }
  }

  // Fill in the existing customer's blank details from the form; never overwrite.
  async function fillBlanks(customer, details) {
    const changes = {};
    for (const [k, v] of Object.entries(details)) if (v && !customer[k]) changes[k] = v;
    if (!Object.keys(changes).length) return;
    const { error } = await sb.from('customers').update(changes).eq('id', customer.id);
    if (error) throw error;
    Object.assign(customer, changes);
  }

  dupBox.addEventListener('click', (e) => {
    const toCustomer = e.target.closest('[data-link-customer]');
    const toLead = e.target.closest('[data-link-lead]');
    if (!toCustomer && !toLead) return;
    const details = readCustomerForm();
    const order = custForm.elements.with_order.checked ? readOrder(firstOrder) : undefined;
    if (order === null) return;

    withBusy(async () => {
      let customer;
      if (toCustomer) {
        customer = state.customers.find((c) => c.id === toCustomer.dataset.linkCustomer);
        await fillBlanks(customer, details);
      } else {
        const lead = state.leads.find((l) => l.id === toLead.dataset.linkLead);
        customer = customerOf(lead.id);
        if (customer) await fillBlanks(customer, details);
        else customer = await insertCustomer({ ...details, business_name: details.business_name || lead.business_name, lead_id: lead.id });
        await markLeadCustomer(lead);
      }
      if (order) await insertOrder(customer.id, order);
      custDialog.close();
      toast(order ? `Order added to ${customer.business_name}.` : `Linked to ${customer.business_name}.`);
      render();
    });
  });

  custForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const details = readCustomerForm();
    const nameBox = custForm.elements.business_name;
    if (!details.business_name) {
      nameBox.setAttribute('aria-invalid', 'true');
      nameBox.focus();
      toast('Please enter the business name.', true);
      return;
    }
    nameBox.removeAttribute('aria-invalid');
    const order = !editing && custForm.elements.with_order.checked ? readOrder(firstOrder) : undefined;
    if (order === null) return;

    if (!editing && !dupChecked) {
      const matches = findMatches(details);
      dupChecked = true;
      if (matches.customers.length || matches.leads.length) {
        showDuplicates(matches);
        return;
      }
    }

    withBusy(async () => {
      if (editing) {
        const { error } = await sb.from('customers').update(details).eq('id', editing.id);
        if (error) throw error;
        Object.assign(editing, details);
        toast('Customer saved.');
      } else {
        const customer = await insertCustomer(details);
        if (order) await insertOrder(customer.id, order);
        toast(`${customer.business_name} added.`);
      }
      custDialog.close();
      render();
    });
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
    ready: [],             // new leads to add
    updates: [],           // [{ id, set }] changes to existing leads
    unmatched: [],
    newFromUnmatched: []
  };

  const importMode = () => imp.dialog.querySelector('input[name="import-mode"]:checked').value;

  function importStep(step) {
    const update = importMode() === 'update';
    $('#import-title').textContent = update ? 'Update existing leads' : 'Import leads';
    $('#update-map-hint').hidden = !update;
    $('#default-type-field').hidden = update;
    $('#update-preview').hidden = !update || (step !== 'summary' && step !== 'finished');
    imp.next.textContent = update ? 'Preview changes' : 'Check for duplicates';
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
    imp.updates = [];
    imp.unmatched = [];
    imp.newFromUnmatched = [];
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

  imp.dialog.addEventListener('change', (e) => {
    if (e.target.name === 'import-mode') importStep(imp.stepMap.hidden ? 'file' : 'map');
  });

  imp.next.addEventListener('click', async () => {
    const map = currentMapping();
    const update = importMode() === 'update';
    if (update && !map.business_name && !map.email && !map.phone) {
      toast('Please choose the column with the business name, email or phone, so rows can be matched to leads.', true);
      return;
    }
    if (!update && !map.business_name) {
      toast('Please choose which column holds the business name.', true);
      return;
    }
    const label = imp.next.textContent;
    imp.next.disabled = true;
    imp.next.textContent = 'Checking…';
    await loadLeads();   // compare against the latest list, not a stale copy
    imp.next.disabled = false;
    imp.next.textContent = label;
    if (update) prepareUpdate(map);
    else prepareImport(map);
    importStep('summary');
  });

  // One file row, tidied up: the same clean-up for adding and for updating leads.
  function readRow(row, map) {
    const get = (key) => (map[key] ? clean(row[map[key]]) : '');
    // Excel drops the leading 0 from numbers typed as 821234567.
    const phone = /^[1-9]\d{8}$/.test(get('phone')) ? '0' + get('phone') : get('phone');
    const emails = [...new Set(emailKeys(get('email')).concat(emailKeys(get('other_emails'))))];
    return {
      business_name: get('business_name'),
      business_type: normType(get('business_type')),
      contact_person: get('contact_person'),
      phone,
      email: emails.join('; ') || get('email'),
      town: get('town'),
      province: normProvince(get('province')) || '',
      address: get('address'),
      website: get('website'),
      maps_url: get('maps_url'),
      notes: get('notes'),
      emails
    };
  }

  // Rows that become new leads. A row is a duplicate if it shares a phone number, an email
  // address or a Google place with a lead already in the list, or with an earlier row in the file.
  function buildNewLeads(rows, map, defaultType) {
    const seen = { phones: new Set(), emails: new Set(), places: new Set() };
    for (const l of state.leads) {
      phoneKeys(l.phone).forEach((k) => seen.phones.add(k));
      emailKeys(l.email).forEach((k) => seen.emails.add(k));
      if (placeKey(l.maps_url)) seen.places.add(placeKey(l.maps_url));
    }
    const inDb = { phones: new Set(seen.phones), emails: new Set(seen.emails), places: new Set(seen.places) };
    const hits = (sets, keys) => keys.phones.some((k) => sets.phones.has(k)) ||
      keys.emails.some((k) => sets.emails.has(k)) || keys.places.some((k) => sets.places.has(k));

    const counts = { noName: 0, existing: 0, inFile: 0 };
    const ready = [];

    for (const row of rows) {
      const r = readRow(row, map);
      if (!r.business_name) { counts.noName++; continue; }

      const keys = { phones: phoneKeys(r.phone), emails: r.emails, places: placeKey(r.maps_url) ? [placeKey(r.maps_url)] : [] };
      if (hits(seen, keys)) {
        counts[hits(inDb, keys) ? 'existing' : 'inFile']++;
        continue;
      }
      keys.phones.forEach((k) => seen.phones.add(k));
      keys.emails.forEach((k) => seen.emails.add(k));
      keys.places.forEach((k) => seen.places.add(k));

      ready.push({
        business_name: r.business_name,
        business_type: r.business_type || defaultType,
        contact_person: r.contact_person || null,
        phone: r.phone || null,
        email: r.email || null,
        town: r.town || null,
        province: r.province || null,
        address: r.address || null,
        website: r.website || null,
        maps_url: r.maps_url || null,
        notes: r.notes || null,
        source: 'Scraped list'
      });
    }
    return { ready, counts };
  }

  const summaryHTML = (rows) => rows
    .map(([label, num, main]) => `<li${main ? ' class="is-main"' : ''}><span>${label}</span><strong>${num.toLocaleString('en-ZA')}</strong></li>`)
    .join('');

  function prepareImport(map) {
    const { ready, counts } = buildNewLeads(imp.rows, map, imp.defaultType.value || null);
    imp.ready = ready;
    imp.updates = [];
    const n = ready.length;
    imp.summary.innerHTML = summaryHTML([
      ['Rows in file', imp.rows.length],
      ['Already in your list (same phone, email or Google Maps place)', counts.existing],
      ['Repeated within the file', counts.inFile],
      ['Missing a business name', counts.noName],
      ['New leads to import', n, true]
    ]);
    imp.go.textContent = n ? `Import ${plural(n, 'lead')}` : 'Nothing to import';
    imp.go.disabled = n === 0;
  }

  /* ---------- "Update existing leads" import ---------- */

  // Fields an update may fill in or correct. Status, notes and call history are never touched.
  const UPDATABLE = ['business_name', 'business_type', 'contact_person', 'phone', 'email',
    'town', 'province', 'address', 'website', 'maps_url'];
  const fieldLabel = (key) => FIELDS.find((f) => f.key === key)?.label || key;

  // Is the file's value the same as what the lead already has? Phone numbers and emails are
  // compared the same way as for duplicates, so "+27 82…" and "082…" count as the same.
  function sameValue(key, a, b) {
    if (key === 'phone') {
      const ka = phoneKeys(a).sort().join();
      if (ka) return ka === phoneKeys(b).sort().join();
    }
    if (key === 'email') {
      const ka = emailKeys(a).sort().join();
      if (ka) return ka === emailKeys(b).sort().join();
    }
    return clean(a).toLowerCase() === clean(b).toLowerCase();
  }

  // Match each row to one lead: by business name first, then email, then phone.
  // When a name (or email) fits several leads, the next detail is used to narrow it down.
  function prepareUpdate(map) {
    const index = { name: new Map(), email: new Map(), phone: new Map() };
    const add = (m, k, l) => { if (!m.has(k)) m.set(k, []); m.get(k).push(l); };
    for (const l of state.leads) {
      const name = clean(l.business_name).toLowerCase();
      if (name) add(index.name, name, l);
      new Set(emailKeys(l.email)).forEach((k) => add(index.email, k, l));
      new Set(phoneKeys(l.phone)).forEach((k) => add(index.phone, k, l));
    }
    const lookup = (m, keys) => [...new Set(keys.flatMap((k) => m.get(k) || []))];

    const changes = new Map();    // lead id -> fields to set
    const matched = new Set();    // leads an earlier row already matched: the first row wins
    const unmatched = [];
    const ambiguous = [];
    const counts = { noKey: 0, unchanged: 0, repeat: 0 };
    const fieldCounts = {};

    imp.rows.forEach((row, i) => {
      const r = readRow(row, map);
      const keys = {
        name: r.business_name ? [r.business_name.toLowerCase()] : [],
        email: r.emails,
        phone: phoneKeys(r.phone)
      };
      if (!keys.name.length && !keys.email.length && !keys.phone.length) { counts.noKey++; return; }

      let found = [];
      let by = '';
      for (const step of ['name', 'email', 'phone']) {
        const hits = lookup(index[step], keys[step]);
        if (!hits.length) continue;
        if (!found.length) {
          found = hits;
          by = step;
        } else {
          const narrowed = found.filter((l) => hits.includes(l));
          if (narrowed.length) found = narrowed;
        }
        if (found.length === 1) break;
      }

      if (!found.length) { unmatched.push(row); return; }
      if (found.length > 1) {
        ambiguous.push({ line: i + 2, name: r.business_name || r.email || r.phone, count: found.length, by });
        return;
      }

      const lead = found[0];
      const set = {};
      for (const key of UPDATABLE) {
        const value = r[key];
        if (!value) continue;   // an empty cell never blanks out what the lead already has
        if (sameValue(key, value, lead[key])) continue;
        set[key] = value;
      }
      if (!Object.keys(set).length) { counts.unchanged++; return; }
      // Several rows changing one lead (e.g. branches sharing a phone number): only the first
      // counts, so a later row can't swap in another branch's name or address.
      if (matched.has(lead.id)) { counts.repeat++; return; }
      matched.add(lead.id);
      changes.set(lead.id, set);
    });

    for (const set of changes.values()) {
      for (const key of Object.keys(set)) fieldCounts[key] = (fieldCounts[key] || 0) + 1;
    }

    imp.updates = [...changes].map(([id, set]) => ({ id, set }));
    imp.unmatched = unmatched;
    imp.newFromUnmatched = buildNewLeads(unmatched, map, null).ready;

    imp.summary.innerHTML = summaryHTML([
      ['Rows in file', imp.rows.length],
      ['Leads that will be updated', imp.updates.length, true],
      ['Rows with nothing new for their lead', counts.unchanged],
      ['Rows for a lead an earlier row already changes (skipped)', counts.repeat],
      ['Rows that matched no lead', unmatched.length],
      ['Rows that matched more than one lead (skipped)', ambiguous.length],
      ...(counts.noKey ? [['Rows with no name, email or phone (skipped)', counts.noKey]] : [])
    ]);

    const fields = Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]);
    $('#field-changes').innerHTML = fields.length
      ? summaryHTML(fields.map(([k, n]) => [`${fieldLabel(k)}`, n]))
      : '<li><span>Nothing to change. Your leads already have these details.</span></li>';

    $('#unmatched-choice').hidden = !unmatched.length;
    $('#unmatched-legend').textContent = `The ${plural(unmatched.length, 'row')} that matched no lead`;
    const k = imp.newFromUnmatched.length;
    $('#unmatched-add-label').textContent = k === unmatched.length
      ? `Add them as new leads (${k.toLocaleString('en-ZA')})`
      : `Add them as new leads (${k.toLocaleString('en-ZA')} after skipping duplicates and rows without a name)`;
    imp.dialog.querySelector('input[name="unmatched"][value="skip"]').checked = true;

    const amb = $('#ambiguous');
    amb.hidden = !ambiguous.length;
    $('#ambiguous-summary').textContent = `${plural(ambiguous.length, 'row')} matched more than one lead`;
    const SHOW = 200;
    $('#ambiguous-list').innerHTML = ambiguous.slice(0, SHOW).map((a) =>
      `<li>Row ${a.line}: <strong>${esc(a.name)}</strong> <span class="muted">matches ${a.count} leads by ${a.by === 'name' ? 'business name' : a.by}</span></li>`
    ).join('') + (ambiguous.length > SHOW ? `<li class="muted">…and ${(ambiguous.length - SHOW).toLocaleString('en-ZA')} more</li>` : '');

    updateGoLabel();
  }

  function addUnmatched() {
    return imp.dialog.querySelector('input[name="unmatched"]:checked')?.value === 'add';
  }

  function updateGoLabel() {
    const u = imp.updates.length;
    const a = addUnmatched() ? imp.newFromUnmatched.length : 0;
    const parts = [u && `update ${plural(u, 'lead')}`, a && `add ${a.toLocaleString('en-ZA')} new`].filter(Boolean);
    imp.go.textContent = parts.length ? parts.join(' and ').replace(/^./, (c) => c.toUpperCase()) : 'Nothing to change';
    imp.go.disabled = !parts.length;
  }

  imp.dialog.addEventListener('change', (e) => {
    if (e.target.name === 'unmatched') updateGoLabel();
  });

  imp.back.addEventListener('click', () => {
    if (!imp.stepSummary.hidden) importStep('map');
    else resetImport();
  });

  imp.go.addEventListener('click', async () => {
    const update = importMode() === 'update';
    const changes = update ? imp.updates : [];
    const rows = update ? (addUnmatched() ? imp.newFromUnmatched : []) : imp.ready;
    const total = changes.length + rows.length;
    imp.go.disabled = true;
    imp.back.hidden = true;
    imp.error.hidden = true;
    imp.progress.hidden = false;
    imp.dialog.dataset.busy = '1';
    imp.dialog.querySelectorAll('input[name="unmatched"]').forEach((i) => { i.disabled = true; });
    state.busy = true;

    let updated = 0;
    let added = 0;
    const progress = () => { imp.bar.style.width = `${Math.round(((updated + added) / total) * 100)}%`; };
    try {
      for (let i = 0; i < changes.length; i += UPDATE_BATCH) {
        const chunk = changes.slice(i, i + UPDATE_BATCH);
        const { error } = await sb.rpc('update_leads', { changes: chunk });
        if (error) throw error;
        updated += chunk.length;
        progress();
      }
      for (let i = 0; i < rows.length; i += INSERT_BATCH) {
        const chunk = rows.slice(i, i + INSERT_BATCH);
        const { error } = await sb.from('leads').insert(chunk);
        if (error) throw error;
        added += chunk.length;
        progress();
      }
      imp.summary.insertAdjacentHTML('beforeend', summaryHTML([
        ...(update ? [['Updated', updated, true]] : []),
        ...(added || !update ? [[update ? 'Added as new leads' : 'Imported', added, true]] : [])
      ]));
      toast(update
        ? `Updated ${plural(updated, 'lead')}${added ? ` and added ${added.toLocaleString('en-ZA')} new` : ''}.`
        : `Imported ${plural(added, 'lead')}.`);
    } catch (err) {
      console.error(err);
      imp.error.textContent = needsDbUpdate(err) || /address|maps_url/.test(err.message)
        ? 'Your database needs a small update before this file can be imported. ' +
          'In Supabase, open SQL Editor and run leads/supabase-setup.sql again (see SETUP.md), then try again.'
        : `Stopped after ${update ? `updating ${updated.toLocaleString('en-ZA')} and ` : ''}adding ${added.toLocaleString('en-ZA')} of ${total.toLocaleString('en-ZA')}: ${err.message}. ` +
          'You can run the same file again: changes already made are skipped.';
      imp.error.hidden = false;
    } finally {
      delete imp.dialog.dataset.busy;
      state.busy = false;
      imp.dialog.querySelectorAll('input[name="unmatched"]').forEach((i) => { i.disabled = false; });
      importStep('finished');
      await loadLeads();
    }
  });

  // Don't let Escape close the dialog half-way through an import.
  imp.dialog.addEventListener('cancel', (e) => {
    if (imp.dialog.dataset.busy) e.preventDefault();
  });

  /* ---------- Installable app ---------- */
  // The service worker keeps the app's own files on the phone so it opens quickly (see sw.js).

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker:', err));
  }

  const install = { bar: $('#install-bar'), text: $('#install-text'), btn: $('#install-btn'), prompt: null };
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const tipHidden = () => { try { return localStorage.getItem('dl-install-hidden') === '1'; } catch (e) { return false; } };
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Android and desktop Chrome/Edge offer their own install prompt; we show it from a button.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    install.prompt = e;
    if (tipHidden()) return;
    install.text.textContent = 'Install the lead tracker as an app on this device.';
    install.btn.hidden = false;
    install.bar.hidden = false;
  });

  install.btn.addEventListener('click', async () => {
    if (!install.prompt) return;
    install.prompt.prompt();
    await install.prompt.userChoice;
    install.prompt = null;
    install.bar.hidden = true;
  });

  window.addEventListener('appinstalled', () => { install.bar.hidden = true; });

  // iPhone and iPad have no install prompt, so explain the Share menu instead.
  if (isIOS && !installed() && !tipHidden()) {
    install.text.innerHTML = 'Install this as an app: tap <strong>Share</strong> <svg class="inline-icon" aria-hidden="true"><use href="#i-share"/></svg>, then <strong>Add to Home Screen</strong>.';
    install.bar.hidden = false;
  }

  $('#install-close').addEventListener('click', () => {
    install.bar.hidden = true;
    try { localStorage.setItem('dl-install-hidden', '1'); } catch (e) { /* private mode */ }
  });
})();
