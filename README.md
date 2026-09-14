[README.md](https://github.com/user-attachments/files/32193386/README.md)
# lucazoe.com — Portfolio Website

Design portfolio for Luca Zoe Pumpe. A static, no-build website: plain HTML, CSS and vanilla JavaScript, no framework and no package manager involved.

## Stack

- **HTML** — one file per page, no templating. Shared markup (nav, footer) is duplicated across pages rather than generated.
- **CSS** — `style.css` (home + legal pages) and `project.css` (case study pages) are separate, independent stylesheets. Each defines its own copy of shared rules (nav, buttons, fonts) rather than importing a common base.
- **JavaScript** — `script.js` (home page: hero, work slider/filters, drag-and-drop sticker faces, contact form) and `project.js` (case study pages: hero parallax, image sliders, lightbox, scroll-based nav/text contrast). No bundler — loaded directly via `<script>` tags.
- **Fonts** — Space Grotesk (display/headings/buttons) and DM Sans (body text), loaded from Google Fonts.

There is no build step. Editing a file and reloading the browser is the entire workflow.

## Local preview

Open the project folder in VS Code and use the **Live Server** extension ("Open with Live Server" on `index.html`) — it serves the folder locally with auto-reload on save. A plain `python3 -m http.server` (or any static file server) works too, since there's nothing to compile.

If a change looks like it "didn't apply," try a hard refresh (Cmd+Shift+R) — Live Server's auto-reload doesn't always bust the browser's own CSS cache.

## Structure

```
index.html                 Home page: hero, work grid/filters, about, contact
project-<slug>.html        One page per case study (see "Pages" below)
impressum.html             Legal notice
datenschutz.html           Privacy policy
index-alternative.html     Draft/alternative layout, not linked from the live site

style.css                  Styles for index.html, impressum.html, datenschutz.html
project.css                Styles for every project-*.html page
legal.css                  Small addendum for impressum/datenschutz
alt-hero.css               Styles specific to index-alternative.html

script.js                  Behaviour for index.html
project.js                 Behaviour for every project-*.html page

images/                    Site-wide images (logo, contact illustration)
icons/                     Small tool/software logos (Figma, Photoshop, …) used in case studies
stickers/                  Draggable face parts used in the home page hero
work/                      Thumbnail images for the home page's work grid
projects/NN-slug/          Full-size images per case study, grouped in
                            hero/ · process/ · product/ · application/

favicon.png, favicon-512.png, apple-touch-icon.png   Site icons
robots.txt, sitemap.xml    SEO basics
CNAME                      GitHub Pages custom domain (lucazoe.com)
```

## Pages

Each case study is one self-contained HTML file, following a fixed section order (see any `project-*.html` for the exact markup):

1. **Hero** — full-bleed photo, project title, one-line description, category tags.
2. **Context** (`#kontext`) — the problem/starting point, next to a photo or slider. Previous/Next project links live at the top of this section.
3. **Product text** (`#produkttext`) — numbered process cards (Concept, Research, Prototyping, …).
4. Further sections vary per project (sketches, device mockups, an outcome slider, phone-mockup videos, etc.) — copy the closest existing page as a starting point rather than building a section from scratch.

To add a new case study: duplicate the project page closest in structure, create a matching `projects/NN-slug/` folder (hero/process/product/application subfolders as needed), add a card to `index.html`'s work grid, and wire up the previous/next links on the new page *and* on its neighbours.

## Conventions worth knowing before editing

- **One breakpoint.** Both stylesheets switch from desktop to mobile at a single `@media (max-width: 1080px)` block — there is no separate tablet breakpoint. Mobile-only fixes belong inside that block; the desktop layout above it must stay pixel-unchanged.
- **Lazy-loaded images.** Most `<img>` tags use `data-src` (not `src`), with an `IntersectionObserver` in the JS files swapping in the real source once the image scrolls into view (see the `img[data-src]` shimmer rules in the CSS). This is a custom pattern — the native `loading="lazy"` attribute is not used on this site.
- **Nav.** Desktop shows a vertical sidebar (rotated text); under 1080px it collapses into a fixed top bar with a hamburger dropdown. The dropdown also carries Impressum/Datenschutz as smaller, secondary links below the main nav items.
- **Contact form.** `script.js` only shows a "Thanks, I'll get back to you soon" message and resets the form — it does not actually send anywhere yet. Wiring it to a real backend (Formspree, a mailto fallback, etc.) is still open.
- **Draft pages.** `index-alternative.html` is a working sketch for a layout variant, not part of the live site — it gets merged into `index.html` once a breakpoint is finalized, not deployed on its own.

## Deployment

The `CNAME` file (`lucazoe.com`) indicates this is deployed via GitHub Pages. There's no CI/build step — whatever is pushed to the repo's Pages branch is what's live.
