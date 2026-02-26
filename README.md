# earn-handbook-theme

Shared theme assets for EARN markdown-driven handbook sites.

## Folder Structure

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
  js/
    toc.js
    recents.js
    mobile-nav.js
  README.md
```

## Quick Start

1. Copy this repository into each consumer repo at `web/theme/`.
2. In the consumer page shell, include:

```html
<link rel="stylesheet" href="/theme/styles/tokens.css" />
<link rel="stylesheet" href="/theme/styles/typography.css" />
<link rel="stylesheet" href="/theme/styles/layout.css" />
<script defer src="/theme/js/mobile-nav.js"></script>
<script defer src="/theme/js/toc.js"></script>
<script defer src="/theme/js/recents.js"></script>
```

3. Render `theme/layout.html` as the outer shell.
4. Render `theme/document.html` inside `{{DOCUMENT_HTML}}`.
5. Fill component placeholders using your existing markdown build output.

## Required Data Hooks

The theme JS utilities require these attributes/ids in rendered HTML:

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
- Recents clear button (optional): `data-recents-clear`
- Document title node: `data-doc-title`

## Consumption Contract

### Required Mount Path

Consumer repos MUST mount the theme at:

```text
web/theme/
```

This ensures static references like `/theme/styles/layout.css` resolve consistently in Cloudflare deployments.

### Required File Includes

Consumer templates MUST include all shared CSS and JS files:

- `/theme/styles/tokens.css`
- `/theme/styles/typography.css`
- `/theme/styles/layout.css`
- `/theme/js/mobile-nav.js`
- `/theme/js/toc.js`
- `/theme/js/recents.js`

### Safe Branding Overrides

Per-repo branding overrides are allowed only through CSS variables and optional brand utility classes.

Create a repo-local file after theme CSS, for example `web/public/brand.css`:

```css
:root {
  --eh-color-accent: #0f5ba6;
  --eh-color-accent-strong: #083f75;
  --eh-color-accent-soft: #dcecff;
  --eh-font-heading: "Fraunces", "DM Serif Display", Georgia, serif;
}
```

Do NOT rename required selectors or data hooks from this theme.

## Accessibility Defaults

- High-contrast palette (WCAG AA-safe defaults).
- Minimum tap target `48px`.
- Skip link support.
- Keyboard-visible focus rings.
- Large reading scale for executive readability.

## Progressive Enhancement

- No JS required for base navigation and reading.
- JS only enhances TOC highlighting, recents, and mobile drawer controls.
