# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Composer-managed **Drupal CMS 11** site (PHP 8.4) — a new **marketing site for
drupal.org** built to match Figma designs. Local development runs on **DDEV**
(project name `drupalorg`, docroot `web`, nginx-fpm). The bulk of the custom work
lives in the custom theme at `web/themes/drupalorg`.

**The theme is a fork of the Mercury theme** (note `generator: mercury` in
`drupalorg.info.yml`). The working approach: **adapt Mercury's existing components
to match the Figma designs, and create new components only where Mercury doesn't
already provide one.** When building UI, check for an existing Mercury-derived
component to adapt before authoring a new one; the Figma designs are the source of
truth.

## Local environment (DDEV)

Run from the project root:

- `ddev start` / `ddev restart` / `ddev stop` — manage the environment
- `ddev composer install` — install PHP dependencies
- `ddev launch` — open the site
- `ddev drush <cmd>` — Drush, e.g. `status`, `user:login`, `cache:rebuild` (`cr`), `update:db`

Config management:
- `ddev drush config:import --yes` — import repo config into the site
- `ddev drush config:export --yes` — export site config back to the repo

After requiring a module: `ddev composer require drupal/<project>` → `ddev drush pm:enable --yes <name>` → `ddev drush cr`.

## Theme development (`web/themes/drupalorg`)

This is where almost all front-end work happens. The theme is **component-based
(Drupal SDC)** and styled with **Tailwind CSS v4** (CSS-first config, no JS config
file). Node `v24.12.0` (see `.nvmrc`).

Run from the theme directory:

- `npm run dev` — Tailwind watch mode
- `npm run build` — compile/minify `src/main.css` → `build/main.min.css`
- `npm run format` — Prettier (Twig + Tailwind class sorting)
- `npm run format:check` — verify formatting

**After any theme change, run `npm run format` then `npm run build`.** The
committed `build/main.min.css` is the served artifact — it must be regenerated or
styles will be stale. Tailwind only sees classes that exist in scanned source, so
new utility classes require a rebuild.

### Architecture

- **SDC components** live in `components/<name>/` (~25 components: card, button,
  hero-*, navbar, footer, accordion, grid, etc.). Each has a `.component.yml`
  (schema/props), a `.twig`, and optionally `.js` and a `.tailwind.css`. Component
  CSS files must be `@import`-ed into `src/main.css` to be bundled.
- **Tailwind theme tokens** are defined in `src/main.css` via `@theme` /
  `@theme inline` blocks (colors map to CSS vars like `--primary`, `--accent`;
  custom type scale, spacing base `4px`). Base element styles, form/webform styles,
  and custom utilities (`.cq-full`, `.region-content`, `.heading-responsive-*`) are
  in the `@layer` blocks there too.
- **CVA (Class Variant Authority)** via the `drupal/cva` module provides the
  `html_cva` Twig function for conditional/variant classes. This is the required
  pattern for any conditional styling — see "Component coding rules" below.
- **PHP hooks** use attribute-based hooks (`#[Hook(...)]`) in
  `src/Hook/ThemeHooks.php`. Notably `preprocess_page` sets `rendered_by_canvas`,
  which distinguishes pages rendered by the **Canvas** page builder
  (`drupal/canvas`) from standard node rendering. `src/RenderCallbacks.php` is a
  pre-render callback registered on the `component` element (e.g. normalizing the
  `hero-blog` date prop).
- **Icons**: Phosphor icon set, configured in `drupalorg.icons.yml`, SVGs under
  `icons/phosphor/`.
- **Libraries**: `drupalorg.libraries.yml`. The `global` library is always
  attached; `build/main.min.css` is marked `minified`/`preprocess: false` so it
  isn't re-minified or aggregated.

### Component coding rules (strictly enforced)

Full detail is in `web/themes/drupalorg/AGENTS.md` — read it before editing
components. Key rules:

- **Never put conditionals or `{% if %}`/`{% for %}` inside HTML attributes**
  (especially `class`). Compute values into variables first, or use `html_cva`.
- Use `html_cva` for all conditional/variant classes. Variant keys use `yes`/`no`
  strings, **not** booleans or `'true'`/`'false'`. Use multi-line CVA formatting;
  use arrays (one class per line) for long class strings.
- Normalize external class inputs to a string before passing as the second arg to
  `.apply()` (parents may pass arrays).
- Always include components with `with_context: false` (function syntax) or
  `with ... only` (tag syntax) to prevent context pollution. Only pass props that
  are actually configurable in the target component's schema.
- Space before `{{ attributes }}`: `<div {{ attributes }}>`, not `<div{{ attributes }}>`.
- No dynamic tag names (`<h{{ level }}>`) and no opening/closing tags split across
  conditionals — use explicit tags or full if/else branches.

## Repository conventions & guardrails

- Custom code goes in `web/modules/custom` and `web/themes/custom` (the active theme
  is the top-level `web/themes/drupalorg`). Do **not** edit Drupal core or contrib
  projects in place.
- Do not commit `vendor/`, uploaded files under `web/sites/*/files`, secrets, or
  machine-local overrides (`.env`, `settings.local.php`, `.ddev/config.local.yaml`).
- Site features are assembled from **recipes** in `recipes/` (largely the
  `drupal_cms_*` set) — the site is a Drupal CMS distribution build.

## References

- DDEV: https://docs.ddev.com/en/stable/
- Drush config workflow: https://www.drupal.org/docs/administering-a-drupal-site/configuration-management/workflow-using-drush
