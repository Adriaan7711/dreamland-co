/* Dreamland Co. – site script (vanilla JS, no build step) */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Contacts and products
     ------------------------------------------------------------------ */
  var WA_DEFAULT = '27823358384'; // Gousia
  var PRODUCTS = {
    soft:   { price: 'R230', colour: 'blue',   dot: 'dot-blue',   accent: '--c-blue' },
    medium: { price: 'R240', colour: 'green',  dot: 'dot-green',  accent: '--c-green' },
    firm:   { price: 'R250', colour: 'orange', dot: 'dot-orange', accent: '--c-orange' },
    xfirm:  { price: 'R260', colour: 'red',    dot: 'dot-red',    accent: '--c-red' },
    knee:   { price: 'R85' }
  };
  var QUIZ_ORDER = ['soft', 'medium', 'firm', 'xfirm'];

  /* ------------------------------------------------------------------
     Translations – edit text here. Keys match data-i18n attributes.
     ------------------------------------------------------------------ */
  var I18N = {
    en: {
      'skip': 'Skip to content',
      'menu': 'Menu',
      'nav.code': 'Colour code',
      'nav.shop': 'Pillows',
      'nav.quiz': 'Find yours',
      'nav.why': 'Why Dreamland',
      'nav.gallery': 'Gallery',
      'nav.stockists': 'Stockists',
      'nav.bulk': 'Bulk orders',
      'nav.contact': 'Order',

      'hero.eyebrow': 'Dreamland – The Colour Coded Pillow',
      'hero.title': 'Your sleeping partner for life',
      'hero.lead': 'Premium pillows with an embroidered colour code that tells you the firmness at a glance. Pick your colour, sleep easy.',
      'hero.find': 'Find your pillow',
      'btn.order': 'Order on WhatsApp',

      'name.soft': 'Soft',
      'name.medium': 'Medium',
      'name.firm': 'Firm',
      'name.xfirm': 'Extra Firm',
      'name.knee': 'Knee pillow',
      'colour.blue': 'Blue',
      'colour.green': 'Green',
      'colour.orange': 'Orange',
      'colour.red': 'Red',

      'code.eyebrow': 'How it works',
      'code.title': 'The colour code, explained',
      'code.intro': 'Every Dreamland pillow carries an embroidered label. The colour tells you the firmness, and the firmer the pillow, the more filling inside.',
      'code.softer': 'Softer',
      'code.firmer': 'Firmer',
      'code.note': 'Fill weight is Unicurl Deluxe fibre per pillow. More fill = a fuller, firmer pillow.',

      'shop.eyebrow': 'Shop',
      'shop.title': 'Our pillows',
      'shop.intro': "Order directly from us on WhatsApp, by phone or by email. We'll confirm stock, payment and delivery or collection with you personally.",
      'tag.soft': 'Blue label · 600g fill',
      'tag.medium': 'Green label · 700g fill',
      'tag.firm': 'Orange label · 800g fill',
      'tag.xfirm': 'Red label · 900g fill',
      'tag.knee': 'Comfort extra',
      'desc.soft': 'Light and gentle, for those who like to sink in.',
      'desc.medium': 'Balanced support. Our most versatile choice.',
      'desc.firm': 'Fuller and more supportive, and holds its height.',
      'desc.xfirm': 'Our fullest pillow, for those who like it firm.',
      'desc.knee': 'A smaller pillow to place between or under your knees for extra comfort. A lovely companion to any Dreamland pillow.',

      'quiz.eyebrow': 'Not sure which colour?',
      'quiz.title': 'Find your pillow',
      'quiz.intro': "Three quick questions and we'll suggest a colour to start with.",
      'quiz.q1': '1. How do you usually sleep?',
      'quiz.side': 'On my side',
      'quiz.back': 'On my back',
      'quiz.stomach': 'On my stomach',
      'quiz.q2': '2. How do you like a pillow to feel?',
      'quiz.softer': 'Softer',
      'quiz.unsure': 'Not sure',
      'quiz.firmer': 'Firmer',
      'quiz.q3': '3. Do you sleep with one pillow or two?',
      'quiz.one': 'One',
      'quiz.two': 'Two, stacked',
      'quiz.error': 'Please answer all three questions.',
      'quiz.submit': 'Show my pillow',
      'quiz.resultLabel': "We'd suggest",
      'quiz.why.soft': 'A lower, softer pillow suits many stomach sleepers, people who stack two pillows, and anyone who likes to sink in.',
      'quiz.why.medium': 'A good middle ground that suits many back sleepers and anyone who wants a bit of everything.',
      'quiz.why.firm': 'A fuller pillow suits many side sleepers who like a little more height under the head.',
      'quiz.why.xfirm': 'Our fullest pillow, for side sleepers who like a high, firm pillow.',
      'quiz.disclaimer': 'This is a general comfort guide, not medical advice. Everyone is different, so feel free to ask us.',

      'why.eyebrow': 'Quality you can feel',
      'why.title': 'Why Dreamland',
      'why.intro': 'Thoughtfully made pillows, finished with care, down to the embroidered label.',
      'f.fluff': 'Retains fluffiness',
      'f.fluffD': 'Keeps its loft night after night.',
      'f.wash': 'Washable',
      'f.washD': 'Easy to keep fresh.',
      'f.soft': 'Soft & light',
      'f.softD': 'Comfortable and easy to handle.',
      'f.allergy': 'Hypoallergenic',
      'f.allergyD': 'Made with hypoallergenic materials.',
      'f.twill': 'Supreme twill casing',
      'f.twillD': 'A smooth, durable twill cover with a neat zip.',
      'f.breath': 'Natural breathing',
      'f.breathD': 'Lets air flow for a fresher feel.',
      'f.fill': 'Unicurl Deluxe filling',
      'f.fillD': 'Springy fibre filling that holds its shape.',
      'cap.labels': 'Embroidered, never printed',
      'cap.tag': 'A colour tab on every seam',
      'cap.zip': 'Supreme twill casing',

      'gallery.eyebrow': 'Gallery',
      'gallery.title': 'Made for restful bedrooms',

      'stock.eyebrow': 'Buy in store',
      'stock.title': 'Also available at',
      'stock.intro': "Prefer to feel before you buy? Visit one of our stockists in Newcastle, Wakkerstroom, Standerton, Ermelo and Volksrust. It's a good idea to phone ahead to check stock.",

      'bulk.eyebrow': 'For hospitality',
      'bulk.title': 'Bulk orders for guesthouses & hotels',
      'bulk.intro': 'Kitting out a guesthouse, B&B, lodge or hotel? We supply in bulk, and the colour code makes it easy for guests to find the pillow they like.',
      'bulk.p1': 'Mix and match firmness levels per room',
      'bulk.p2': 'Consistent quality across every bed',
      'bulk.p3': 'Deal directly with the owners',
      'bulk.cta': 'Ask for a bulk quote',
      'bulk.email': 'Email us',

      'contact.eyebrow': 'Order or ask a question',
      'contact.title': 'Get in touch',
      'contact.intro': "There's no online checkout. Simply WhatsApp, call or email us and we'll sort out your order personally.",
      'form.title': 'Order / enquiry form',
      'form.help': 'Fill this in and tap send. It opens WhatsApp with your message ready to go.',
      'form.name': 'Name',
      'form.phone': 'Phone number',
      'form.pillow': 'Pillow',
      'form.choose': 'Choose…',
      'form.qty': 'Quantity',
      'form.town': 'Town',
      'form.msg': 'Message (optional)',
      'form.to': 'Send to',
      'form.error': 'Please add your name and choose a pillow.',
      'form.send': 'Send on WhatsApp',
      'opt.soft': 'Soft (Blue) – R230',
      'opt.medium': 'Medium (Green) – R240',
      'opt.firm': 'Firm (Orange) – R250',
      'opt.xfirm': 'Extra Firm (Red) – R260',
      'opt.knee': 'Knee pillow – R85',
      'opt.mixed': 'A mix / not sure yet',

      'footer.area': 'Colour coded pillows from a small South African business. Find us in Newcastle, Wakkerstroom, Standerton, Ermelo and Volksrust, or order direct.',
      'footer.contact': 'Contact',
      'footer.explore': 'Explore',
      'footer.rights': 'All rights reserved.',

      'lb.close': 'Close',
      'lb.prev': 'Previous photo',
      'lb.next': 'Next photo',

      'alt.hero': 'Four Dreamland pillows lined up on a bed against a grey tufted headboard, with blue, green, orange and red embroidered labels',
      'alt.soft': 'Dreamland Soft pillow with a blue embroidered label',
      'alt.medium': 'Dreamland Medium pillow with a green embroidered label',
      'alt.firm': 'Dreamland Firm pillow with an orange embroidered label',
      'alt.xfirm': 'Dreamland Extra Firm pillow with a red embroidered label',
      'alt.knee': 'Dreamland knee pillow in its branded packaging',
      'alt.labels': 'Close-up of the four embroidered Dreamland labels: Soft (Blue), Medium (Green), Firm (Orange) and X Firm (Red)',
      'alt.tag': 'Sewn-in Dreamland Co. care label with a red colour tab on the pillow seam',
      'alt.zip': 'White twill pillow casing with a neat concealed zip',
      'g.1': 'Four Dreamland pillows standing upright against a tufted headboard',
      'g.2': 'Close angled view of the four colour coded pillows',
      'g.3': 'Soft, Medium, Firm and Extra Firm pillows lined up on a white bed',
      'g.4': 'Three Dreamland pillows in front of a grey headboard',
      'g.5': 'Medium pillow folded to show its green embroidered label',
      'g.6': 'Extra Firm pillow folded to show its red embroidered label',
      'g.7': 'Dreamland pillows in their branded retail packaging',
      'g.8': 'A made bed styled with plump white Dreamland pillows',
      'g.9': 'White pillows arranged on a bed with a lace runner',
      'g.10': 'Three white pillows stacked on a bed',
      'g.11': 'Two Dreamland care labels with colour tabs',
      'g.12': 'A stack of packaged Dreamland pillows ready for delivery',

      // WhatsApp messages
      'wa.general': "Hi Dreamland Co., I'd like to place an order.",
      'wa.product': "Hi Dreamland Co., I'd like to order the {item} – {price}.",
      'wa.bulk': "Hi Dreamland Co., I'd like a quote for a bulk pillow order for my guesthouse / B&B / lodge / hotel.",
      'wa.item.soft': 'Soft (Blue) pillow',
      'wa.item.medium': 'Medium (Green) pillow',
      'wa.item.firm': 'Firm (Orange) pillow',
      'wa.item.xfirm': 'Extra Firm (Red) pillow',
      'wa.item.knee': 'Knee pillow',
      'wa.form.intro': "Hi Dreamland Co., I'd like to order:",
      'wa.form.pillow': 'Pillow',
      'wa.form.qty': 'Quantity',
      'wa.form.name': 'Name',
      'wa.form.phone': 'Phone',
      'wa.form.town': 'Town',
      'wa.form.msg': 'Message',

      'meta.title': 'Dreamland Co. | Colour Coded Pillows | Your sleeping partner for life'
    },

    af: {
      'skip': 'Gaan na inhoud',
      'menu': 'Kieslys',
      'nav.code': 'Kleurkode',
      'nav.shop': 'Kussings',
      'nav.quiz': 'Vind joune',
      'nav.why': 'Hoekom Dreamland',
      'nav.gallery': 'Galery',
      'nav.stockists': 'Verkooppunte',
      'nav.bulk': 'Grootmaat',
      'nav.contact': 'Bestel',

      'hero.eyebrow': 'Dreamland – Die Kleurgekodeerde Kussing',
      'hero.title': 'Jou slaapmaat vir die lewe',
      'hero.lead': "Premium kussings met 'n geborduurde kleurkode wat jou die fermheid in een oogopslag wys. Kies jou kleur en slaap rustig.",
      'hero.find': 'Vind jou kussing',
      'btn.order': 'Bestel op WhatsApp',

      'name.soft': 'Sag',
      'name.medium': 'Medium',
      'name.firm': 'Ferm',
      'name.xfirm': 'Extra Ferm',
      'name.knee': 'Kniekussing',
      'colour.blue': 'Blou',
      'colour.green': 'Groen',
      'colour.orange': 'Oranje',
      'colour.red': 'Rooi',

      'code.eyebrow': 'Hoe dit werk',
      'code.title': 'Die kleurkode verduidelik',
      'code.intro': "Elke Dreamland-kussing het 'n geborduurde etiket. Die kleur wys die fermheid, en hoe fermer die kussing, hoe meer vulsel binne-in.",
      'code.softer': 'Sagter',
      'code.firmer': 'Fermer',
      'code.note': "Die gewig is Unicurl Deluxe-vulsel per kussing. Meer vulsel = 'n voller, fermer kussing.",

      'shop.eyebrow': 'Winkel',
      'shop.title': 'Ons kussings',
      'shop.intro': 'Bestel direk by ons op WhatsApp, per telefoon of e-pos. Ons bevestig voorraad, betaling en aflewering of afhaal persoonlik met jou.',
      'tag.soft': 'Blou etiket · 600g vulsel',
      'tag.medium': 'Groen etiket · 700g vulsel',
      'tag.firm': 'Oranje etiket · 800g vulsel',
      'tag.xfirm': 'Rooi etiket · 900g vulsel',
      'tag.knee': 'Ekstra gemak',
      'desc.soft': 'Lig en sag, vir dié wat graag wegsink.',
      'desc.medium': 'Gebalanseerde steun. Ons mees veelsydige keuse.',
      'desc.firm': 'Voller en meer ondersteunend, en behou sy hoogte.',
      'desc.xfirm': 'Ons volste kussing, vir dié wat dit ferm verkies.',
      'desc.knee': "'n Kleiner kussing om tussen of onder jou knieë te plaas vir ekstra gemak. 'n Lekker maatjie vir enige Dreamland-kussing.",

      'quiz.eyebrow': 'Nie seker watter kleur nie?',
      'quiz.title': 'Vind jou kussing',
      'quiz.intro': "Drie vinnige vrae en ons stel 'n kleur voor om mee te begin.",
      'quiz.q1': '1. Hoe slaap jy gewoonlik?',
      'quiz.side': 'Op my sy',
      'quiz.back': 'Op my rug',
      'quiz.stomach': 'Op my maag',
      'quiz.q2': '2. Hoe moet jou kussing voel?',
      'quiz.softer': 'Sagter',
      'quiz.unsure': 'Nie seker nie',
      'quiz.firmer': 'Fermer',
      'quiz.q3': '3. Slaap jy met een kussing of twee?',
      'quiz.one': 'Een',
      'quiz.two': 'Twee, op mekaar',
      'quiz.error': 'Beantwoord asseblief al drie vrae.',
      'quiz.submit': 'Wys my kussing',
      'quiz.resultLabel': 'Ons stel voor',
      'quiz.why.soft': "'n Laer, sagter kussing pas baie maagslapers, mense wat twee kussings op mekaar gebruik, en enigiemand wat graag wegsink.",
      'quiz.why.medium': "'n Goeie middeweg wat baie rugslapers pas, en enigiemand wat van alles 'n bietjie wil hê.",
      'quiz.why.firm': "'n Voller kussing pas baie syslapers wat 'n bietjie meer hoogte onder die kop verkies.",
      'quiz.why.xfirm': "Ons volste kussing, vir syslapers wat van 'n hoë, ferm kussing hou.",
      'quiz.disclaimer': "Dit is 'n algemene gemaksgids, nie mediese advies nie. Almal is anders, so vra ons gerus.",

      'why.eyebrow': 'Gehalte wat jy kan voel',
      'why.title': 'Hoekom Dreamland',
      'why.intro': 'Kussings wat met sorg gemaak en afgewerk is, tot by die geborduurde etiket.',
      'f.fluff': 'Behou vorm',
      'f.fluffD': 'Bly nag na nag vol en donsig.',
      'f.wash': 'Wasbaar',
      'f.washD': 'Maklik om vars te hou.',
      'f.soft': 'Sag & lig',
      'f.softD': 'Gemaklik en maklik om te hanteer.',
      'f.allergy': 'Anti-allergies',
      'f.allergyD': 'Gemaak met anti-allergiese materiaal.',
      'f.twill': 'Supreme twill sloop',
      'f.twillD': "'n Gladde, duursame twill-sloop met 'n netjiese rits.",
      'f.breath': 'Natuurlike asemhaling',
      'f.breathD': "Laat lug deur vir 'n varser gevoel.",
      'f.fill': 'Unicurl Deluxe vulsel',
      'f.fillD': 'Veerkragtige veselvulsel wat sy vorm behou.',
      'cap.labels': 'Geborduur, nooit gedruk nie',
      'cap.tag': "'n Kleuroortjie op elke soom",
      'cap.zip': 'Supreme twill sloop',

      'gallery.eyebrow': 'Galery',
      'gallery.title': 'Gemaak vir rustige slaapkamers',

      'stock.eyebrow': 'Koop in die winkel',
      'stock.title': 'Ook beskikbaar by',
      'stock.intro': 'Wil jy eers voel voor jy koop? Besoek een van ons verkooppunte in Newcastle, Wakkerstroom, Standerton, Ermelo en Volksrust. Bel gerus vooraf om voorraad te bevestig.',

      'bulk.eyebrow': 'Vir gasvryheid',
      'bulk.title': 'Grootmaatbestellings vir gastehuise en hotelle',
      'bulk.intro': "Rig jy 'n gastehuis, B&B, lodge of hotel in? Ons verskaf in grootmaat, en die kleurkode maak dit maklik vir gaste om die kussing te kies waarvan hulle hou.",
      'bulk.p1': 'Meng en pas fermheidsvlakke per kamer',
      'bulk.p2': 'Eenvormige gehalte op elke bed',
      'bulk.p3': 'Handel direk met die eienaars',
      'bulk.cta': "Vra vir 'n grootmaatkwotasie",
      'bulk.email': 'Stuur vir ons e-pos',

      'contact.eyebrow': "Bestel of vra 'n vraag",
      'contact.title': 'Kontak ons',
      'contact.intro': 'Daar is geen aanlyn betaalpunt nie. WhatsApp, bel of e-pos ons eenvoudig en ons reël jou bestelling persoonlik.',
      'form.title': 'Bestel- / navraagvorm',
      'form.help': 'Vul dit in en tik stuur. Dit maak WhatsApp oop met jou boodskap gereed.',
      'form.name': 'Naam',
      'form.phone': 'Telefoonnommer',
      'form.pillow': 'Kussing',
      'form.choose': 'Kies…',
      'form.qty': 'Hoeveelheid',
      'form.town': 'Dorp',
      'form.msg': 'Boodskap (opsioneel)',
      'form.to': 'Stuur na',
      'form.error': 'Vul asseblief jou naam in en kies \'n kussing.',
      'form.send': 'Stuur op WhatsApp',
      'opt.soft': 'Sag (Blou) – R230',
      'opt.medium': 'Medium (Groen) – R240',
      'opt.firm': 'Ferm (Oranje) – R250',
      'opt.xfirm': 'Extra Ferm (Rooi) – R260',
      'opt.knee': 'Kniekussing – R85',
      'opt.mixed': "'n Mengsel / nog nie seker nie",

      'footer.area': "Kleurgekodeerde kussings van 'n klein Suid-Afrikaanse besigheid. Kry ons in Newcastle, Wakkerstroom, Standerton, Ermelo en Volksrust, of bestel direk.",
      'footer.contact': 'Kontak',
      'footer.explore': 'Verken',
      'footer.rights': 'Alle regte voorbehou.',

      'lb.close': 'Maak toe',
      'lb.prev': 'Vorige foto',
      'lb.next': 'Volgende foto',

      'alt.hero': "Vier Dreamland-kussings langs mekaar op 'n bed teen 'n grys kopstuk, met blou, groen, oranje en rooi geborduurde etikette",
      'alt.soft': "Dreamland Sag-kussing met 'n blou geborduurde etiket",
      'alt.medium': "Dreamland Medium-kussing met 'n groen geborduurde etiket",
      'alt.firm': "Dreamland Ferm-kussing met 'n oranje geborduurde etiket",
      'alt.xfirm': "Dreamland Extra Ferm-kussing met 'n rooi geborduurde etiket",
      'alt.knee': 'Dreamland-kniekussing in sy verpakking',
      'alt.labels': 'Nabyskoot van die vier geborduurde Dreamland-etikette: Sag (Blou), Medium (Groen), Ferm (Oranje) en Extra Ferm (Rooi)',
      'alt.tag': "Ingewerkte Dreamland Co.-etiket met 'n rooi kleuroortjie op die kussing se soom",
      'alt.zip': "Wit twill-kussingsloop met 'n netjiese versteekte rits",
      'g.1': "Vier Dreamland-kussings wat regop teen 'n kopstuk staan",
      'g.2': 'Nabyskoot van die vier kleurgekodeerde kussings',
      'g.3': "Sag, Medium, Ferm en Extra Ferm kussings langs mekaar op 'n wit bed",
      'g.4': "Drie Dreamland-kussings voor 'n grys kopstuk",
      'g.5': 'Medium-kussing gevou om sy groen geborduurde etiket te wys',
      'g.6': 'Extra Ferm-kussing gevou om sy rooi geborduurde etiket te wys',
      'g.7': 'Dreamland-kussings in hul verpakking',
      'g.8': "'n Opgemaakte bed met vol wit Dreamland-kussings",
      'g.9': "Wit kussings op 'n bed met 'n kantloper",
      'g.10': "Drie wit kussings op mekaar op 'n bed",
      'g.11': 'Twee Dreamland-etikette met kleuroortjies',
      'g.12': "'n Stapel verpakte Dreamland-kussings gereed vir aflewering",

      'wa.general': "Hallo Dreamland Co., ek wil graag 'n bestelling plaas.",
      'wa.product': 'Hallo Dreamland Co., ek wil graag die {item} bestel – {price}.',
      'wa.bulk': "Hallo Dreamland Co., ek wil graag 'n kwotasie hê vir 'n grootmaatbestelling kussings vir my gastehuis / B&B / lodge / hotel.",
      'wa.item.soft': 'Sag (Blou) kussing',
      'wa.item.medium': 'Medium (Groen) kussing',
      'wa.item.firm': 'Ferm (Oranje) kussing',
      'wa.item.xfirm': 'Extra Ferm (Rooi) kussing',
      'wa.item.knee': 'Kniekussing',
      'wa.form.intro': 'Hallo Dreamland Co., ek wil graag bestel:',
      'wa.form.pillow': 'Kussing',
      'wa.form.qty': 'Hoeveelheid',
      'wa.form.name': 'Naam',
      'wa.form.phone': 'Telefoon',
      'wa.form.town': 'Dorp',
      'wa.form.msg': 'Boodskap',

      'meta.title': 'Dreamland Co. | Kleurgekodeerde Kussings | Jou slaapmaat vir die lewe'
    }
  };

  var LANG_KEY = 'dreamland-lang';
  var HTML_LANG = { en: 'en-ZA', af: 'af' };
  var lang = 'en';

  function t(key) {
    var dict = I18N[lang] || I18N.en;
    return dict[key] != null ? dict[key] : (I18N.en[key] != null ? I18N.en[key] : key);
  }

  function waUrl(text, to) {
    return 'https://wa.me/' + (to || WA_DEFAULT) + '?text=' + encodeURIComponent(text);
  }

  function productMessage(id) {
    return t('wa.product').replace('{item}', t('wa.item.' + id)).replace('{price}', PRODUCTS[id].price);
  }

  function waMessageFor(kind) {
    if (kind === 'general') return t('wa.general');
    if (kind === 'bulk') return t('wa.bulk');
    if (PRODUCTS[kind]) return productMessage(kind);
    return t('wa.general');
  }

  function updateWhatsAppLinks() {
    document.querySelectorAll('[data-wa]').forEach(function (a) {
      a.href = waUrl(waMessageFor(a.getAttribute('data-wa')), a.getAttribute('data-wa-to'));
    });
  }

  function applyLanguage(next) {
    lang = I18N[next] ? next : 'en';
    document.documentElement.lang = HTML_LANG[lang];
    document.title = t('meta.title');

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      el.alt = t(el.getAttribute('data-i18n-alt'));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    document.querySelectorAll('.lang-toggle [data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });

    updateWhatsAppLinks();
    if (lastQuizResult) showQuizResult(lastQuizResult, false);
  }

  function readSavedLang() {
    try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; }
  }
  function saveLang(value) {
    try { localStorage.setItem(LANG_KEY, value); } catch (e) { /* storage unavailable */ }
  }

  /* ------------------------------------------------------------------
     Language toggle
     ------------------------------------------------------------------ */
  document.querySelectorAll('.lang-toggle [data-lang]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-lang');
      saveLang(value);
      applyLanguage(value);
    });
  });

  /* ------------------------------------------------------------------
     Mobile navigation
     ------------------------------------------------------------------ */
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  function setNav(open) {
    navToggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  }
  navToggle.addEventListener('click', function () {
    setNav(navToggle.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setNav(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setNav(false);
      navToggle.focus();
    }
  });

  /* ------------------------------------------------------------------
     Find your pillow quiz (general comfort guidance only)
     ------------------------------------------------------------------ */
  var quizForm = document.getElementById('quiz-form');
  var quizResult = document.getElementById('quiz-result');
  var lastQuizResult = null;

  function showQuizResult(id, focus) {
    var p = PRODUCTS[id];
    lastQuizResult = id;
    document.getElementById('quiz-dot').className = 'dot ' + p.dot;
    document.getElementById('quiz-result-name').textContent =
      t('name.' + id) + ' (' + t('colour.' + p.colour) + ') – ' + p.price;
    document.getElementById('quiz-result-why').textContent = t('quiz.why.' + id);
    document.getElementById('quiz-order').href = waUrl(productMessage(id));
    quizResult.style.setProperty('--result', 'var(' + p.accent + ')');
    quizResult.hidden = false;
    if (focus) quizResult.focus();
  }

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

    var score = { stomach: 0, back: 1, side: 2 }[position];
    score += { softer: -1, unsure: 0, firmer: 1 }[feel];
    if (count === 'two') score -= 1;
    score = Math.max(0, Math.min(3, score));

    showQuizResult(QUIZ_ORDER[score], true);
  });

  /* ------------------------------------------------------------------
     Order / enquiry form -> WhatsApp
     ------------------------------------------------------------------ */
  var orderForm = document.getElementById('order-form');

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

    var lines = [
      t('wa.form.intro'),
      '• ' + t('wa.form.pillow') + ': ' + t('opt.' + pillow),
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

    var to = data.get('to') || WA_DEFAULT;
    window.open(waUrl(lines.join('\n'), to), '_blank', 'noopener');
  });

  /* ------------------------------------------------------------------
     Gallery lightbox
     ------------------------------------------------------------------ */
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  var lbSource = document.getElementById('lightbox-source');
  var lbCaption = document.getElementById('lightbox-caption');
  var galleryItems = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
  var current = 0;
  var lastTrigger = null;

  function showSlide(index) {
    current = (index + galleryItems.length) % galleryItems.length;
    var item = galleryItems[current];
    var base = 'images/' + item.getAttribute('data-full') + '-1600';
    var alt = item.querySelector('img').alt;
    lbSource.srcset = base + '.webp';
    lbImg.src = base + '.jpg';
    lbImg.alt = alt;
    lbCaption.textContent = alt;
  }

  if (lightbox && typeof lightbox.showModal === 'function') {
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
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ------------------------------------------------------------------
     Footer year + initial language
     ------------------------------------------------------------------ */
  document.getElementById('year').textContent = new Date().getFullYear();
  applyLanguage(readSavedLang() || 'en');
})();
