# earn-handbook-theme

Shared UI assets for EARN markdown-driven handbook sites.

This repo contains only reusable theme files:

- layout templates
- HTML component partials
- design tokens and typography
- layout CSS
- minimal progressive-enhancement JS

## Current Consumers

This theme is the source of truth for the checked-in `web/theme/` copies used by the internal handbook sites.

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
    check-consumer-theme.mjs
    serve-preview.mjs
    sync-consumer-theme.mjs
    theme-sync-lib.mjs
  tests/
    theme.spec.js
  theme-sync.manifest.json
  playwright.config.js
  package.json
  README.md
```

## Preferred Integration

Consumer repos should vendor a checked-in copy of the managed payload at:

```text
web/theme/
```

The source-of-truth repo stays in `earn-handbook-theme/`; consumer repos receive only the manifest-managed payload.

## Sync Manifest

The vendor payload is defined in [theme-sync.manifest.json](/Users/daliso/Developer/EARN_Group/earn-handbook-theme/theme-sync.manifest.json). The synced payload includes:

- `.gitignore`
- `.github/workflows/theme-quality.yml`
- `components/**`
- `js/**`
- `styles/**`
- `theme/**`
- `scripts/serve-preview.mjs`
- `scripts/validate-theme.sh`
- `tests/theme.spec.js`
- `preview/index.html`

The following paths are intentionally not vendor-synced to consumer repos:

- `README.md`
- `package.json`
- `package-lock.json`
- `playwright.config.js`
- `theme-sync.manifest.json`
- `scripts/check-consumer-theme.mjs`
- `scripts/sync-consumer-theme.mjs`
- `scripts/theme-sync-lib.mjs`
- local runtime or cache output such as `.git/`, `node_modules/`, `test-results/`, and `.DS_Store`

## Consumer Requirements

Each consumer repo should provide:

- `web/theme/` as a checked-in vendor copy from this repo
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

From this repo, sync a consumer theme copy with:

```bash
npm run sync -- --target ../agOS/web/theme
```

Preview the same operation without changing the consumer repo:

```bash
npm run sync:dry-run -- --target ../agOS/web/theme
```

Verify a consumer copy matches the manifest-managed payload:

```bash
npm run check:consumer -- --target ../agOS/web/theme
```

After a real sync, commit the updated `web/theme` tree in the consumer repo in the normal way.

## Local Validation

Validate the source-of-truth theme repo and the manifest-managed payload with:

```bash
npm run validate
```

Override the preview port for browser smoke tests when `4173` is already in use:

```bash
PORT=4473 npm run test:browser
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
