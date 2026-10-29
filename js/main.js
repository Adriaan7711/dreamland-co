/* Dreamland Co. – site script (vanilla JS, no build step)
   Loaded on every page after js/data.js and js/i18n.js. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Settings
     ------------------------------------------------------------------ */

  // ▼▼▼ PASTE YOUR WEB3FORMS ACCESS KEY HERE (free at https://web3forms.com) ▼▼▼
  var WEB3FORMS_ACCESS_KEY = "8c0a6f4e-7d6d-4d07-9627-89f7b1b41ed8";
  // ▲▲▲ Call-back requests are emailed to the address you register the key with. ▲▲▲

  var WA_DEFAULT = '27725486329'; // James Prinsloo: all general and order WhatsApp links go here
  var PRODUCTS = window.DREAMLAND_PRODUCTS || [];
  var STOCKISTS = window.DREAMLAND_STOCKISTS || [];
  var I18N = window.DREAMLAND_I18N || { en: {}, af: {} };

  var LANG_KEY = 'dreamland-lang';
  var HTML_LANG = { en: 'en-ZA', af: 'af' };
  var lang = 'en';

  function findProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fill(str, vars) {
    return str.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  }
  function rand(n) { return 'R' + n; }
  function loc(obj) { return obj ? (obj[lang] || obj.en) : ''; }

  /* ------------------------------------------------------------------
     Translation
     English for static text comes from the HTML (captured once below);
     Afrikaans comes from js/i18n.js.
     ------------------------------------------------------------------ */
  function t(key) {
    var d = I18N[lang] || {};
    if (d[key] != null) return d[key];
    if (I18N.en[key] != null) return I18N.en[key];
    return key;
  }

  var originals = [];
  function captureOriginals(root) {
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      originals.push({ el: el, type: 'text', key: el.getAttribute('data-i18n'), en: el.textContent });
    });
    root.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      originals.push({ el: el, type: 'alt', key: el.getAttribute('data-i18n-alt'), en: el.alt });
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      originals.push({ el: el, type: 'aria', key: el.getAttribute('data-i18n-aria'), en: el.getAttribute('aria-label') });
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      originals.push({ el: el, type: 'placeholder', key: el.getAttribute('data-i18n-placeholder'), en: el.placeholder });
    });
  }

  function translateStatic() {
    originals.forEach(function (o) {
      var value = lang === 'en' ? o.en : ((I18N[lang] || {})[o.key] || o.en);
      if (o.type === 'text') {
        if (lang === 'en' && o.el.textContent === value) return; // keep untouched (and its EDIT comments)
        o.el.textContent = value;
      } else if (o.type === 'alt') {
        o.el.alt = value;
      } else if (o.type === 'placeholder') {
        o.el.placeholder = value;
      } else {
        o.el.setAttribute('aria-label', value);
      }
    });
  }

  /* ------------------------------------------------------------------
     WhatsApp links
     ------------------------------------------------------------------ */
  function waUrl(text, to) {
    return 'https://wa.me/' + (to || WA_DEFAULT) + '?text=' + encodeURIComponent(text);
  }
  function itemName(p) {
    return p.colour ? loc(p.name) + ' (' + loc(p.colour) + ') ' + t('pd.pillow') : loc(p.name);
  }
  function productMessage(p) {
    return fill(t('wa.product'), { item: itemName(p), price: rand(p.price) });
  }
  function waMessageFor(kind) {
    var p = findProduct(kind);
    if (p) return productMessage(p);
    if (kind === 'bulk') return t('wa.bulk');
    if (kind === 'callback') return t('wa.callback');
    return t('wa.general');
  }
  function updateWhatsAppLinks() {
    document.querySelectorAll('[data-wa]').forEach(function (a) {
      a.href = waUrl(waMessageFor(a.getAttribute('data-wa')), a.getAttribute('data-wa-to'));
    });
  }

  /* ------------------------------------------------------------------
     Rendering from js/data.js
     ------------------------------------------------------------------ */
  function picture(base, alt, sizes, eager) {
    return '<picture>' +
      '<source type="image/webp" srcset="images/' + base + '-800.webp 800w, images/' + base + '-1600.webp 1600w" sizes="' + sizes + '">' +
      '<img src="images/' + base + '-800.jpg" srcset="images/' + base + '-800.jpg 800w, images/' + base + '-1600.jpg 1600w" sizes="' + sizes + '"' +
      ' width="1600" height="1067"' + (eager ? '' : ' loading="lazy"') + ' decoding="async" alt="' + esc(alt) + '">' +
      '</picture>';
  }

  function firmnessMeter(p) {
    if (!p.firmness) return '';
    var pips = '';
    for (var i = 1; i <= 4; i++) pips += '<span class="pip' + (i <= p.firmness ? ' on' : '') + '"></span>';
    return '<span class="meter" role="img" aria-label="' + esc(fill(t('card.firmness'), { n: p.firmness })) + '">' + pips + '</span>';
  }

  function cardTag(p) {
    return p.colour ? fill(t('card.tag'), { colour: loc(p.colour), weight: p.weight }) : t('card.tagKnee');
  }

  function orderButton(p, extraClass) {
    return '<a class="btn btn-whatsapp ' + (extraClass || '') + '" href="' + esc(waUrl(productMessage(p))) + '" target="_blank" rel="noopener">' +
      '<svg class="icon" aria-hidden="true"><use href="#i-whatsapp"/></svg><span>' + esc(t('btn.order')) + '</span></a>';
  }

  function renderProductCards(el) {
    el.innerHTML = PRODUCTS.map(function (p) {
      return '<article class="product-card" style="--accent: var(' + p.accent + ')">' +
        picture(p.images[0], loc(p.alt)[0], '(min-width: 1150px) 20vw, (min-width: 640px) 50vw, 100vw') +
        '<div class="product-body">' +
          '<p class="product-tag"><span class="dot" style="background: var(' + p.accent + ')"></span>' + esc(cardTag(p)) + '</p>' +
          '<h3>' + esc(loc(p.name)) + '</h3>' +
          firmnessMeter(p) +
          '<p class="product-desc">' + esc(loc(p.summary)) + '</p>' +
          '<p class="price">' + rand(p.price) + '</p>' +
          '<div class="product-actions">' +
            '<a class="btn btn-outline btn-sm" href="products.html#' + p.id + '">' + esc(t('btn.details')) +
              '<span class="visually-hidden">: ' + esc(loc(p.name)) + '</span></a>' +
            orderButton(p, 'btn-sm') +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function renderProductDetails(el) {
    el.innerHTML = PRODUCTS.map(function (p, i) {
      var alts = loc(p.alt);
      var media = '<div class="pd-media">' + picture(p.images[0], alts[0], '(min-width: 900px) 50vw, 100vw') +
        (p.images[1] ? '<div class="pd-thumb">' + picture(p.images[1], alts[1], '(min-width: 900px) 25vw, 50vw') + '</div>' : '') +
        '</div>';

      var specs = '<dl class="pd-specs">' +
        (p.firmness ? '<div><dt>' + esc(t('pd.firmness')) + '</dt><dd>' + firmnessMeter(p) + ' ' + esc(loc(p.name)) + '</dd></div>' : '') +
        (p.colour ? '<div><dt>' + esc(t('pd.label')) + '</dt><dd><span class="dot" style="background: var(' + p.accent + ')"></span> ' + esc(loc(p.colour)) + '</dd></div>' : '') +
        (p.weight ? '<div><dt>' + esc(t('pd.weight')) + '</dt><dd>' + esc(fill(t('pd.weightValue'), { weight: p.weight })) + '</dd></div>'
                  : '<div><dt>' + esc(t('pd.use')) + '</dt><dd>' + esc(t('pd.kneeUse')) + '</dd></div>') +
        '<div><dt>' + esc(t('pd.price')) + '</dt><dd class="price">' + rand(p.price) + '</dd></div>' +
        '</dl>';

      var features = '<ul class="pd-features">' + p.features.map(function (f) {
        return '<li><svg class="icon" aria-hidden="true"><use href="#i-' + f + '"/></svg>' + esc(t('f.' + f)) + '</li>';
      }).join('') + '</ul>';

      var suits = '<ul class="tick-list">' + loc(p.suits).map(function (s) {
        return '<li><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg><span>' + esc(s) + '</span></li>';
      }).join('') + '</ul>';

      return '<section class="product-detail' + (i % 2 ? ' is-flipped' : '') + '" id="' + p.id + '" style="--accent: var(' + p.accent + ')" aria-labelledby="pd-' + p.id + '">' +
        '<div class="container pd-inner">' + media +
          '<div class="pd-info">' +
            '<p class="eyebrow pd-eyebrow"><span class="dot" style="background: var(' + p.accent + ')"></span>' + esc(cardTag(p)) + '</p>' +
            '<h2 id="pd-' + p.id + '">' + esc(loc(p.name)) + '</h2>' +
            '<p class="lead">' + esc(loc(p.summary)) + '</p>' +
            specs +
            '<div class="pd-columns">' +
              '<div><h3>' + esc(t('pd.features')) + '</h3>' + features + '</div>' +
              '<div><h3>' + esc(t('pd.suits')) + '</h3>' + suits + '<p class="small muted">' + esc(t('pd.note')) + '</p></div>' +
            '</div>' +
            '<div class="button-row pd-actions">' +
              orderButton(p) +
              // ADD TO CART: when the online shop is added, put the "Add to cart" button here, e.g.
              // '<button type="button" class="btn btn-primary" data-add-to-cart="' + p.id + '">Add to cart</button>'
              // The product id, name, price and images all come from window.DREAMLAND_PRODUCTS (js/data.js).
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>';
    }).join('');
  }

  function telHref(display) {
    return 'tel:+27' + display.replace(/\D/g, '').replace(/^0/, '');
  }

  function renderStockists(el) {
    var variant = el.getAttribute('data-variant');
    el.innerHTML = STOCKISTS.map(function (s) {
      var phones = s.phones.map(function (n) {
        return '<a href="' + telHref(n) + '"><svg class="icon" aria-hidden="true"><use href="#i-phone"/></svg>' + esc(n) + '</a>';
      });
      if (variant === 'strip') {
        return '<li class="strip-item"><strong>' + esc(s.name) + '</strong><span class="muted">' + esc(s.town) + '</span>' + phones[0] + '</li>';
      }
      return '<li class="stockist card"><h3>' + esc(s.name) + '</h3>' +
        '<p class="stockist-town"><svg class="icon" aria-hidden="true"><use href="#i-pin"/></svg>' + esc(s.town) + '</p>' +
        '<p class="stockist-phones">' + phones.join('') + '</p></li>';
    }).join('');
  }

  function renderPillowOptions(select) {
    var current = select.value;
    select.innerHTML = '<option value="">' + esc(t('form.choose')) + '</option>' +
      PRODUCTS.map(function (p) {
        var label = (p.colour ? loc(p.name) + ' (' + loc(p.colour) + ')' : loc(p.name)) + ' – ' + rand(p.price);
        return '<option value="' + p.id + '">' + esc(label) + '</option>';
      }).join('') +
      '<option value="mixed">' + esc(t('opt.mixed')) + '</option>';
    select.value = current;
  }

  function renderAll() {
    document.querySelectorAll('[data-render]').forEach(function (el) {
      var type = el.getAttribute('data-render');
      if (type === 'product-cards') renderProductCards(el);
      else if (type === 'product-details') renderProductDetails(el);
      else if (type === 'stockists') renderStockists(el);
      else if (type === 'pillow-options') renderPillowOptions(el);
    });
  }

  /* ------------------------------------------------------------------
     Language switching
     ------------------------------------------------------------------ */
  function applyLanguage(next) {
    lang = I18N[next] ? next : 'en';
    document.documentElement.lang = HTML_LANG[lang];
    renderAll();
    translateStatic();
    updateWhatsAppLinks();
    document.querySelectorAll('.lang-toggle [data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
    if (lastQuizResult) showQuizResult(lastQuizResult, false);
    document.querySelectorAll('.callback-form, .trade-form').forEach(refreshCallbackMessages);
  }

  function readSavedLang() {
    try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; }
  }
  function saveLang(value) {
    try { localStorage.setItem(LANG_KEY, value); } catch (e) { /* storage unavailable */ }
  }

  document.querySelectorAll('.lang-toggle [data-lang]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-lang');
      saveLang(value);
      applyLanguage(value);
    });
  });

  /* ------------------------------------------------------------------
     Find your pillow quiz (general comfort guidance only)
     ------------------------------------------------------------------ */
  var quizForm = document.getElementById('quiz-form');
  var lastQuizResult = null;

  function showQuizResult(id, focus) {
    var p = findProduct(id);
    var result = document.getElementById('quiz-result');
    lastQuizResult = id;
    document.getElementById('quiz-dot').style.background = 'var(' + p.accent + ')';
    document.getElementById('quiz-result-name').textContent = loc(p.name) + ' (' + loc(p.colour) + ') – ' + rand(p.price);
    document.getElementById('quiz-result-why').textContent = t('quiz.why.' + id);
    document.getElementById('quiz-order').href = waUrl(productMessage(p));
    document.getElementById('quiz-view').href = '#' + id;
    result.style.setProperty('--result', 'var(' + p.accent + ')');
    result.hidden = false;
    if (focus) result.focus();
  }

  if (quizForm) {
    quizForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(quizForm);
      var position = data.get('position');
      var feel = data.get('feel');
      var count = data.get('count');
      var error = document.getElementById('quiz-error');

      if (!position || !feel || !count) {
        error.hidden = false;
        return;
      }
      error.hidden = true;

      var score = { stomach: 1, back: 2, side: 3 }[position];
      score += { softer: -1, unsure: 0, firmer: 1 }[feel];
      if (count === 'two') score -= 1;
      score = Math.max(1, Math.min(4, score));

      var match = PRODUCTS.filter(function (p) { return p.firmness === score; })[0];
      showQuizResult(match.id, true);
    });
  }

  /* ------------------------------------------------------------------
     WhatsApp order form (Contact page)
     ------------------------------------------------------------------ */
  var orderForm = document.getElementById('order-form');

  if (orderForm) {
    orderForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(orderForm);
      var name = String(data.get('name') || '').trim();
      var pillow = data.get('pillow');
      var qty = Math.max(1, parseInt(data.get('qty'), 10) || 1);
      var error = document.getElementById('form-error');
      var nameInput = document.getElementById('f-name');
      var pillowInput = document.getElementById('f-pillow');

      nameInput.setAttribute('aria-invalid', String(!name));
      pillowInput.setAttribute('aria-invalid', String(!pillow));
      if (!name || !pillow) {
        error.hidden = false;
        (!name ? nameInput : pillowInput).focus();
        return;
      }
      error.hidden = true;

      var selected = pillowInput.options[pillowInput.selectedIndex].text;
      var lines = [
        t('wa.form.intro'),
        '• ' + t('wa.form.pillow') + ': ' + selected,
        '• ' + t('wa.form.qty') + ': ' + qty,
        '',
        t('wa.form.name') + ': ' + name
      ];
      var phone = String(data.get('phone') || '').trim();
      var town = String(data.get('town') || '').trim();
      var message = String(data.get('message') || '').trim();
      if (phone) lines.push(t('wa.form.phone') + ': ' + phone);
      if (town) lines.push(t('wa.form.town') + ': ' + town);
      if (message) lines.push(t('wa.form.msg') + ': ' + message);

      window.open(waUrl(lines.join('\n'), WA_DEFAULT), '_blank', 'noopener'); // orders go to James
    });
  }

  /* ------------------------------------------------------------------
     Request a Call Back form -> Web3Forms
     ------------------------------------------------------------------ */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // Accepts 0XX XXX XXXX and +27 XX XXX XXXX (spaces, dashes and brackets ignored)
  function isSouthAfricanPhone(value) {
    var n = value.replace(/[\s\-().]/g, '');
    return /^0[1-9]\d{8}$/.test(n) || /^\+27[1-9]\d{8}$/.test(n);
  }

  var CB_RULES = {
    first_name: { msg: 'cb.err.first', ok: function (v) { return v.length > 0; } },
    last_name: { msg: 'cb.err.last', ok: function (v) { return v.length > 0; } },
    email: { msg: 'cb.err.email', ok: function (v) { return EMAIL_RE.test(v); } },
    phone: { msg: 'cb.err.phone', ok: isSouthAfricanPhone },
    business_name: { msg: 'trade.err.business', ok: function (v) { return v.length > 0; } },
    contact_person: { msg: 'trade.err.contact', ok: function (v) { return v.length > 0; } }
  };

  function validateField(input) {
    var rule = CB_RULES[input.name];
    if (!rule) return true;
    var ok = rule.ok(input.value.trim());
    var err = document.getElementById(input.getAttribute('aria-describedby'));
    input.setAttribute('aria-invalid', String(!ok));
    err.textContent = ok ? '' : t(rule.msg);
    err.hidden = ok;
    return ok;
  }

  // Forms can set their own messages: data-msg="trade" uses trade.success / trade.error,
  // data-wa picks the WhatsApp message offered when sending fails.
  function setStatus(form, state) {
    var box = form.querySelector('.form-status');
    var msg = form.getAttribute('data-msg') || 'cb';
    var waKey = form.getAttribute('data-wa') || 'wa.callback';
    form.setAttribute('data-status', state || '');
    box.className = 'form-status' + (state ? ' is-' + state : '');
    if (!state || state === 'sending') {
      box.hidden = !state;
      box.textContent = state ? t('cb.sending') : '';
      return;
    }
    box.hidden = false;
    if (state === 'success') {
      box.textContent = t(msg + '.success');
    } else {
      box.innerHTML = esc(t(msg + '.error')) + ' <a href="' + esc(waUrl(t(waKey))) + '" target="_blank" rel="noopener">' +
        '<svg class="icon" aria-hidden="true"><use href="#i-whatsapp"/></svg>' + esc(t('cb.errorLink')) + '</a>';
    }
  }

  function refreshCallbackMessages(form) {
    form.querySelectorAll('[aria-invalid="true"]').forEach(validateField);
    var state = form.getAttribute('data-status');
    if (state) setStatus(form, state);
  }

  // Live validation for a form's required fields; returns those inputs.
  function watchFields(form) {
    var inputs = Array.prototype.slice.call(form.querySelectorAll('input[required]')).filter(function (i) { return CB_RULES[i.name]; });
    inputs.forEach(function (input) {
      input.addEventListener('blur', function () { if (input.value.trim()) validateField(input); });
      input.addEventListener('input', function () { if (input.getAttribute('aria-invalid') === 'true') validateField(input); });
    });
    return inputs;
  }

  document.querySelectorAll('.callback-form').forEach(function (form) {
    var inputs = watchFields(form);
    var button = form.querySelector('[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var invalid = inputs.filter(function (input) { return !validateField(input); });
      if (invalid.length) {
        invalid[0].focus();
        return;
      }

      // Honeypot ticked: almost certainly a bot. Pretend it worked, send nothing.
      if (form.botcheck.checked) {
        form.reset();
        setStatus(form, 'success');
        return;
      }

      if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY === 'PASTE_KEY_HERE') {
        console.warn('Dreamland: add your Web3Forms key to WEB3FORMS_ACCESS_KEY in js/main.js');
        setStatus(form, 'error');
        return;
      }

      var v = function (name) { return form.elements[name].value.trim(); };
      var payload = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: I18N.en['cb.subject'], // always English so inbox filters keep working
        from_name: 'Dreamland Co. website',
        name: v('first_name') + ' ' + v('last_name'),
        first_name: v('first_name'),
        last_name: v('last_name'),
        email: v('email'),
        phone: v('phone'),
        language: lang === 'af' ? 'Afrikaans' : 'English',
        page: document.title,
        botcheck: false
      };

      button.disabled = true;
      setStatus(form, 'sending');

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (!json.success) throw new Error(json.message || 'Web3Forms error');
          form.reset();
          setStatus(form, 'success');
        })
        .catch(function () { setStatus(form, 'error'); })
        .then(function () { button.disabled = false; });
    });
  });

  /* ------------------------------------------------------------------
     Business enquiry form -> lead tracker (Supabase) + email (Web3Forms)
     The enquiry lands in the lead tracker as a warm "Interested" lead and is
     also emailed, so nothing is lost if one of the two is down.
     ------------------------------------------------------------------ */
  var LEADS_DB = window.DREAMLAND_CONFIG || {}; // from leads/config.js

  function saveWarmLead(lead) {
    var url = LEADS_DB.supabaseUrl || '';
    var key = LEADS_DB.supabaseKey || '';
    if (!url || !key || /YOUR-/.test(url + key)) return Promise.reject(new Error('lead tracker not set up yet (leads/config.js)'));
    return fetch(url.replace(/\/+$/, '') + '/rest/v1/leads', {
      method: 'POST',
      headers: { 'apikey': key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify(lead)
    }).then(function (res) {
      if (!res.ok) throw new Error('lead tracker said ' + res.status);
    });
  }

  function emailEnquiry(fields) {
    if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY === 'PASTE_KEY_HERE') return Promise.reject(new Error('no Web3Forms key'));
    var payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: I18N.en['trade.subject'],
      from_name: 'Dreamland Co. website',
      language: lang === 'af' ? 'Afrikaans' : 'English',
      botcheck: false
    };
    Object.keys(fields).forEach(function (k) { payload[k] = fields[k]; });
    return fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (json) { if (!json.success) throw new Error(json.message || 'Web3Forms error'); });
  }

  document.querySelectorAll('.trade-form').forEach(function (form) {
    var inputs = watchFields(form);
    var button = form.querySelector('[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var invalid = inputs.filter(function (input) { return !validateField(input); });
      if (invalid.length) {
        invalid[0].focus();
        return;
      }
      if (form.botcheck.checked) {
        form.reset();
        setStatus(form, 'success');
        return;
      }

      var v = function (name) { return form.elements[name].value.trim(); };
      var message = v('message');

      button.disabled = true;
      setStatus(form, 'sending');

      var attempts = [
        saveWarmLead({
          business_name: v('business_name'),
          contact_person: v('contact_person'),
          phone: v('phone'),
          email: v('email'),
          town: v('town') || null,
          notes: message ? 'Website enquiry: ' + message : null,
          status: 'Interested',
          source: 'Website form'
        }),
        emailEnquiry({
          name: v('contact_person'),
          business: v('business_name'),
          email: v('email'),
          phone: v('phone'),
          town: v('town'),
          message: message
        })
      ].map(function (p) {
        return p.then(function () { return true; }, function (err) {
          console.warn('Dreamland enquiry:', err.message);
          return false;
        });
      });

      Promise.all(attempts).then(function (ok) {
        if (ok[0] || ok[1]) {
          form.reset();
          setStatus(form, 'success');
        } else {
          setStatus(form, 'error');
        }
        button.disabled = false;
      });
    });
  });

  /* ------------------------------------------------------------------
     Gallery lightbox (About page)
     ------------------------------------------------------------------ */
  var lightbox = document.getElementById('lightbox');
  var galleryItems = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));

  if (lightbox && typeof lightbox.showModal === 'function') {
    var lbImg = document.getElementById('lightbox-img');
    var lbSource = document.getElementById('lightbox-source');
    var lbCaption = document.getElementById('lightbox-caption');
    var current = 0;
    var lastTrigger = null;

    var showSlide = function (index) {
      current = (index + galleryItems.length) % galleryItems.length;
      var item = galleryItems[current];
      var base = 'images/' + item.getAttribute('data-full') + '-1600';
      var alt = item.querySelector('img').alt;
      lbSource.srcset = base + '.webp';
      lbImg.src = base + '.jpg';
      lbImg.alt = alt;
      lbCaption.textContent = alt;
    };

    galleryItems.forEach(function (item, i) {
      item.addEventListener('click', function () {
        lastTrigger = item;
        showSlide(i);
        lightbox.showModal();
      });
    });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox || e.target.closest('[data-close]')) lightbox.close();
      var step = e.target.closest('[data-step]');
      if (step) showSlide(current + Number(step.getAttribute('data-step')));
    });
    lightbox.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') showSlide(current + 1);
      if (e.key === 'ArrowLeft') showSlide(current - 1);
    });
    lightbox.addEventListener('close', function () {
      if (lastTrigger) lastTrigger.focus();
    });
  } else {
    // Very old browsers: open the full photo in a new tab instead
    galleryItems.forEach(function (item) {
      item.addEventListener('click', function () {
        window.open('images/' + item.getAttribute('data-full') + '-1600.jpg', '_blank', 'noopener');
      });
    });
  }

  /* ------------------------------------------------------------------
     Fade-in on scroll (CSS skips it for prefers-reduced-motion)
     ------------------------------------------------------------------ */
  function setupReveal() {
    var reveals = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------
     Start-up
     ------------------------------------------------------------------ */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  captureOriginals(document);
  applyLanguage(readSavedLang() || 'en');
  setupReveal();

  // Product sections are built by script, so re-apply any #hash jump once they exist
  if (location.hash && document.querySelector('[data-render="product-details"]')) {
    var target = document.getElementById(location.hash.slice(1));
    var jump = function () { if (target) target.scrollIntoView({ behavior: 'instant' }); };
    jump();
    window.addEventListener('load', jump);
  }
})();
