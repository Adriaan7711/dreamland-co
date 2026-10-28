/* ==========================================================================
   Dreamland Co. – product and stockist data
   --------------------------------------------------------------------------
   This is the single source of truth for products. Cards on the Home page and
   the detail sections on the Products page are built from this array, so a
   future online shop / cart can read the same data (id, price, images…)
   without rebuilding the pages.

   price  – whole Rand, number (shown as R230)
   weight – fill weight in grams (null if not applicable)
   images – base names in /images; each exists as -800/-1600 .webp and .jpg
   ========================================================================== */

window.DREAMLAND_PRODUCTS = [
  {
    id: 'soft',
    name: { en: 'Soft', af: 'Sag' },
    colour: { en: 'Blue', af: 'Blou' },
    accent: '--c-blue',
    firmness: 1,            // 1 = softest … 4 = firmest
    weight: 600,
    price: 230,
    images: ['pillow-soft-blue', 'pillow-soft-blue-label'],
    alt: {
      en: ['Dreamland Soft pillow with a blue embroidered label', 'Soft pillow folded to show its blue embroidered label'],
      af: ["Dreamland Sag-kussing met 'n blou geborduurde etiket", 'Sag-kussing gevou om sy blou geborduurde etiket te wys']
    },
    summary: {
      en: 'Light and gentle, for those who like to sink in.',
      af: 'Lig en sag, vir dié wat graag wegsink.'
    },
    suits: {
      en: ['People who mostly sleep on their stomach', 'Anyone who likes a low, squashy pillow', 'Those who like to stack two pillows'],
      af: ['Mense wat meestal op hul maag slaap', "Enigiemand wat van 'n lae, sagte kussing hou", 'Dié wat graag twee kussings op mekaar gebruik']
    },
    features: ['fluff', 'wash', 'soft', 'allergy', 'twill', 'breath', 'fill']
  },
  {
    id: 'medium',
    name: { en: 'Medium', af: 'Medium' },
    colour: { en: 'Green', af: 'Groen' },
    accent: '--c-green',
    firmness: 2,
    weight: 700,
    price: 240,
    images: ['pillow-medium-green', 'pillow-medium-green-label'],
    alt: {
      en: ['Dreamland Medium pillow with a green embroidered label', 'Medium pillow folded to show its green embroidered label'],
      af: ["Dreamland Medium-kussing met 'n groen geborduurde etiket", 'Medium-kussing gevou om sy groen geborduurde etiket te wys']
    },
    summary: {
      en: 'Balanced support. Our most versatile choice.',
      af: 'Gebalanseerde steun. Ons mees veelsydige keuse.'
    },
    suits: {
      en: ['Back sleepers', 'People who change position during the night', 'Anyone unsure where to start'],
      af: ['Rugslapers', 'Mense wat snags baie rondrol', 'Enigiemand wat nie seker is waar om te begin nie']
    },
    features: ['fluff', 'wash', 'soft', 'allergy', 'twill', 'breath', 'fill']
  },
  {
    id: 'firm',
    name: { en: 'Firm', af: 'Ferm' },
    colour: { en: 'Orange', af: 'Oranje' },
    accent: '--c-orange',
    firmness: 3,
    weight: 800,
    price: 250,
    images: ['pillow-firm-orange', 'pillow-firm-orange-label'],
    alt: {
      en: ['Dreamland Firm pillow with an orange embroidered label', 'Firm pillow folded to show its orange embroidered label'],
      af: ["Dreamland Ferm-kussing met 'n oranje geborduurde etiket", 'Ferm-kussing gevou om sy oranje geborduurde etiket te wys']
    },
    summary: {
      en: 'Fuller and more supportive, and holds its height.',
      af: 'Voller en meer ondersteunend, en behou sy hoogte.'
    },
    suits: {
      en: ['Side sleepers', 'Anyone who likes a fuller pillow that keeps its shape'],
      af: ['Syslapers', "Enigiemand wat van 'n voller kussing hou wat sy vorm behou"]
    },
    features: ['fluff', 'wash', 'soft', 'allergy', 'twill', 'breath', 'fill']
  },
  {
    id: 'xfirm',
    name: { en: 'Extra Firm', af: 'Extra Ferm' },
    colour: { en: 'Red', af: 'Rooi' },
    accent: '--c-red',
    firmness: 4,
    weight: 900,
    price: 260,
    images: ['pillow-extra-firm-red', 'pillow-extra-firm-red-label'],
    alt: {
      en: ['Dreamland Extra Firm pillow with a red embroidered label', 'Extra Firm pillow folded to show its red embroidered label'],
      af: ["Dreamland Extra Ferm-kussing met 'n rooi geborduurde etiket", 'Extra Ferm-kussing gevou om sy rooi geborduurde etiket te wys']
    },
    summary: {
      en: 'Our fullest pillow, for those who like it firm.',
      af: 'Ons volste kussing, vir dié wat dit ferm verkies.'
    },
    suits: {
      en: ['Side sleepers who like extra height', 'Anyone who prefers a really firm, high pillow'],
      af: ['Syslapers wat van ekstra hoogte hou', "Enigiemand wat 'n baie ferm, hoë kussing verkies"]
    },
    features: ['fluff', 'wash', 'soft', 'allergy', 'twill', 'breath', 'fill']
  },
  {
    id: 'knee',
    name: { en: 'Knee pillow', af: 'Kniekussing' },
    colour: null,
    accent: '--copper',
    firmness: null,
    weight: null,
    price: 85,
    images: ['knee-pillow'],
    alt: {
      en: ['Dreamland knee pillow in its branded packaging'],
      af: ['Dreamland-kniekussing in sy verpakking']
    },
    summary: {
      en: 'A comfort pillow to place between or under your knees.',
      af: "'n Gemakkussing om tussen of onder jou knieë te plaas."
    },
    suits: {
      en: ['Side sleepers who like a pillow between the knees', 'Back sleepers who like a little lift under the knees', 'Anyone wanting an extra comfort pillow'],
      af: ["Syslapers wat graag 'n kussing tussen die knieë het", "Rugslapers wat van 'n bietjie hoogte onder die knieë hou", "Enigiemand wat 'n ekstra gemakkussing wil hê"]
    },
    features: ['fluff', 'wash', 'soft', 'allergy', 'breath', 'fill']
  }
];

window.DREAMLAND_STOCKISTS = [
  { name: 'Clin-Apteek', town: 'Newcastle', phones: ['034 312 2204', '034 312 2205'] },
  { name: 'Honeymoon Valley Cheese', town: 'Wakkerstroom', phones: ['017 730 0331'] },
  { name: 'Maxi-med Apteek', town: 'Standerton', phones: ['017 712 1375'] },
  { name: 'Melrow Apteek', town: 'Ermelo', phones: ['017 811 2641', '082 856 0726'] },
  { name: 'Max Med', town: 'Volksrust', phones: ['017 735 2005'] }
];
