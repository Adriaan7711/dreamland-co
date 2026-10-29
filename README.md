# Dreamland Co. website

Static site for **Dreamland – The Colour Coded Pillow**. Plain HTML, CSS and JavaScript: no build step. Open `index.html` to view it locally.

| File | What it holds |
|---|---|
| `index.html` | Home: hero, colour code, product cards, why Dreamland, call-back form, stockists |
| `products.html` | Product details, pillow quiz, bulk orders |
| `about.html` | Story, values, team, gallery, stockists |
| `contact.html` | Contacts, call-back form, WhatsApp order form, stockists |
| `js/data.js` | **Products and stockists** (one array each). Prices, weights, images, "who it suits" |
| `js/i18n.js` | Afrikaans text, plus English text the script builds itself |
| `js/main.js` | Language toggle, product rendering, quiz, forms, gallery. Web3Forms key is at the top |
| `css/style.css` | Design: colours are CSS variables at the top |
| `images/` | Photos as WebP + JPG, at 800px and 1600px wide |

## Before going live

1. **Call-back form:** the Web3Forms access key is set in `WEB3FORMS_ACCESS_KEY` at the top of `js/main.js`. Requests go to the email address the key was registered with.
2. **About page:** search `about.html` for `EDIT: confirm with owners` and replace the invented details. Update the matching Afrikaans text (`about.p1`–`about.p4`) in `js/i18n.js`.
3. **Site address:** if it isn't `https://www.dreamlandco.site/`, find-and-replace that address in every `.html` file, `sitemap.xml` and `robots.txt`.

## Common edits

- **Change a price or product detail:** edit `js/data.js`. Also update the JSON-LD block in `products.html` so Google sees the new price.
- **Change English wording:** edit the HTML page. **Afrikaans wording:** edit the same key in `js/i18n.js`.
- **Header or footer:** they're repeated in all four pages, so change each one.
- **Online shop later:** see the `ADD TO CART` comment in `js/main.js` (product detail sections). Product ids, prices and images are already in `js/data.js`.
- **Custom domain:** see `CNAME.example`.
- **Real logo:** see the `LOGO` comment in the header of each page.
