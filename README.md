# earn-handbook-theme

Shared UI assets for EARN markdown-driven handbook sites.

This repo contains only reusable theme files:

- layout templates
- HTML component partials
- design tokens and typography
- layout CSS
- minimal progressive-enhancement JS

## Current Consumers

This theme is used as a git submodule by internal handbook sites. Add your repo here when you adopt the theme.

## Repo Structure

```text
earn-handbook-theme/
  theme/
    layout.html
    document.html
  components/
    header.html
    sidebar.html
    breadcrumbs.html
    doc-summary.html
  styles/
    tokens.css
    typography.css
    layout.css
    shell.css
  js/
    toc.js
    recents.js
    mobile-nav.js
    brand.js
    shell.js
  preview/
    index.html
  scripts/
    serve-preview.mjs
  tests/
    theme.spec.js
  playwright.config.js
  package.json
  README.md
```

## Preferred Integration

Consumer repos should mount this repo as a git submodule at:

```text
web/theme/
```

Example:

```bash
git submodule add https://github.com/AfricanTechno/earn-handbook-theme.git web/theme
git submodule update --init --recursive
```

If a consumer repo already exists:

```bash
git submodule sync -- web/theme
git submodule update --init --recursive
```

## Consumer Requirements

Each consumer repo should provide:

- `web/theme/` mounted from this repo
- `web/handbook.config.json`
- `web/public/overrides.css`
- a local shell file such as `web/public/index.html`
- build output wiring that copies `web/theme` into the published static output
- local preview wiring that serves `/theme/*` from `web/theme`

The reusable navigator shell now lives in the theme layer:

- `styles/shell.css`
- `js/brand.js`
- `js/shell.js`

Recommended branding/config payload:

```json
{
  "handbook_title": "AT Handbook",
  "entity_code": "AT",
  "home_url": "/"
}
```

## Required Asset Includes

Consumer templates must include:

```html
<link rel="stylesheet" href="/theme/styles/tokens.css" />
<link rel="stylesheet" href="/theme/styles/typography.css" />
<link rel="stylesheet" href="/theme/styles/layout.css" />
<link rel="stylesheet" href="/styles.css" />
<link rel="stylesheet" href="/overrides.css" />

<script defer src="/theme/js/mobile-nav.js"></script>
<script defer src="/theme/js/toc.js"></script>
<script defer src="/theme/js/recents.js"></script>
```

Load the shared shell assets from `/theme/*` before the repo app bundle:

```html
<link rel="stylesheet" href="/theme/styles/shell.css" />
<script defer src="/theme/js/brand.js"></script>
<script defer src="/theme/js/shell.js"></script>
<script type="module" src="/app.js"></script>
```

## Template Contract

Use:

- `theme/layout.html` as the outer shell
- `theme/document.html` as the document wrapper
- `components/*.html` as reusable slot fragments

Expected placeholders:

- `{{HEADER_HTML}}`
- `{{SIDEBAR_HTML}}`
- `{{DOCUMENT_HTML}}`
- `{{BREADCRUMBS_HTML}}`
- `{{DOC_SUMMARY_HTML}}`
- `{{DOC_HTML}}`

## Required Data Hooks

The JS utilities depend on these hooks being present:

- Sidebar: `data-sidebar`
- Sidebar overlay: `data-sidebar-overlay`
- Menu toggle: `data-mobile-menu-toggle`
- Mobile nav container: `data-mobile-nav`
- Mobile nav buttons: `data-action="menu|search|domains|recent"`
- Search input: `data-search-input`
- Domain nav container: `data-domain-nav`
- TOC content root: `data-doc-content`
- TOC list: `data-toc-list`
- TOC nav: `data-toc`
- TOC toggle button: `data-toc-toggle`
- Recents lists: `data-recents-list`
- Recents clear button: `data-recents-clear` (optional)
- Document title node: `data-doc-title`
- Document purpose node: `data-doc-purpose`

Do not rename these hooks in consumer markup unless the consumer also replaces the matching JS behavior.

## Build And Publish Contract

Consumer repos must make `/theme/...` available in both:

- local preview
- Cloudflare publish output

Recommended publish step:

```text
copy web/theme -> <publish-output>/theme
copy web/handbook.config.json -> <publish-output>/handbook.config.json
remove <publish-output>/theme/.git
```

Recommended local dev routing:

```text
/theme/* -> web/theme/*
/handbook.config.json -> web/handbook.config.json
```

## Safe Overrides

Per-repo overrides should be limited to CSS variables and small utility classes in `web/public/overrides.css`.

Example:

```css
:root {
  --eh-color-accent: #0f5ba6;
  --eh-color-accent-strong: #083f75;
  --eh-color-accent-soft: #dcecff;
  --eh-font-heading: "Fraunces", "DM Serif Display", Georgia, serif;
}
```

Do not fork theme files just to change branding.

## Updating Consumers

When this repo changes, update each consumer repo with:

```bash
git submodule update --remote web/theme
git add web/theme
git commit -m "Update shared handbook theme"
```

If the consumer has pinned submodule changes locally:

```bash
git -C web/theme fetch origin main
git -C web/theme checkout origin/main
```

## Accessibility Defaults

- high-contrast baseline palette
- `48px` minimum touch target
- keyboard-visible focus states
- skip-link support
- large reading scale for executive readability
- progressive enhancement only

## Progressive Enhancement

- base navigation and reading remain usable without JS
- JS enhances TOC highlighting, recent pages, and mobile drawer behavior

## Local Preview

Use the included preview fixture to inspect the shared theme without a consumer repo:

```bash
npm install
npm run preview
```

The preview intentionally exercises:

- long navigation lists
- summary metadata cards
- TOC generation
- related links and recents
- code blocks, tables, lists, and long-form copy

## Browser Smoke Test

The repo includes a Playwright smoke test for the most common responsive targets:

- iPhone Safari shell
- iPad Safari shell
- Android Chrome shell
- Windows desktop Chrome shell
- Windows desktop Firefox shell

Run:

```bash
npm install
npx playwright install chromium firefox webkit
npm test
```

The test serves the preview fixture locally, verifies the main theme regions render, checks that the TOC and recents initialize, and fails if the page introduces horizontal overflow or runtime errors.
