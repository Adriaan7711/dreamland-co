# Dreamland Co. website

Static site for **Dreamland – The Colour Coded Pillow**. Plain HTML, CSS and JavaScript: no build step. Open `index.html` to view it locally.

| File | What it holds |
|---|---|
| `index.html` | All page content (English) and SEO / structured data |
| `js/main.js` | English + Afrikaans text (`I18N` object), WhatsApp messages, quiz, form, gallery |
| `css/style.css` | Design: colours are at the top as CSS variables |
| `images/` | Photos as WebP + JPG, at 800px and 1600px wide |

## Common edits

- **Change a price:** update it in `index.html` (product card + JSON-LD), in `PRODUCTS` and the `opt.*` lines in `js/main.js`.
- **Change wording:** edit the matching key in both `en` and `af` in `js/main.js`.
- **Site address / custom domain:** see `CNAME.example`, then replace `https://adriaan7711.github.io/dreamland-co/` in `index.html`, `404.html`, `sitemap.xml` and `robots.txt`.
- **Real logo:** see the `LOGO` comment in the header of `index.html`.
