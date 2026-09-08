# Repository Guidelines

## Project Structure & Module Organization

The editable website lives in `site/`. Each top-level HTML file represents one route: `index.html`, `about.html`, `programs.html`, `trainers.html`, `pricing.html`, and `contact.html`. Shared styling is in `site/assets/css/styles.css`; shared navigation, accordion, form-validation, and footer behavior is in `site/assets/js/main.js`. Images and the favicon belong in `site/assets/images/`.

Build utilities are under `scripts/`. `scripts/build.js` copies the source site into `dist/`, while `scripts/validate.js` checks required pages, menu links, duplicate IDs, and local asset references. Treat `dist/` as generated output: edit `site/`, then rebuild. Hosting metadata is stored in `.openai/hosting.json` and must not contain secrets.

## Build, Test, and Development Commands

- `npm run build` — recreates the deployable `dist/` directory from `site/`.
- `npm test` — checks JavaScript syntax and validates pages, navigation, IDs, and assets.
- `python -m http.server 4173 --directory site` — serves the editable site locally at `http://localhost:4173`.

Run `npm test` before building, and rebuild after every source change that should be published.

## Coding Style & Naming Conventions

Use two-space indentation in HTML, CSS, JSON, and JavaScript. Prefer semantic HTML, accessible labels, keyboard-friendly controls, and reusable CSS classes over inline styles. Keep JavaScript dependency-free and use `const`, `let`, descriptive camelCase names, and early returns where practical. Use kebab-case for filenames and CSS classes, such as `trainer-card` or `hero-training.png`.

Maintain Vietnamese for visitor-facing copy. Preserve the shared header, navigation destinations, and footer across all six pages.

## Testing Guidelines

There is no external test framework or coverage threshold. `scripts/validate.js` is the required regression check. When adding a page, update its `expectedPages` list and add the page to every main navigation menu. Manually verify responsive navigation, FAQ accordions, and contact-form validation on both narrow and wide viewports.

## Commit & Pull Request Guidelines

Existing commits use short, imperative summaries, for example `Add FORGEFIT browser icon`. Keep each commit focused and avoid committing unrelated generated or temporary files. Pull requests should explain the user-visible change, list test results, link any relevant issue, and include desktop and mobile screenshots for visual changes. Call out changes to pricing, contact details, assets, or hosting configuration explicitly.
