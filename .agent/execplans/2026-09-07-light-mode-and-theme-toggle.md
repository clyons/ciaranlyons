# Apply the warm light palette and reversible theme toggle

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Give the existing site a warm, editorial light palette based only on the supplied visual reference, without changing its layout or content hierarchy. Visitors can also use one compact header button to make an immediate light/dark comfort adjustment; a second click returns the site to their operating system preference.

## Progress

- [x] (2026-09-07 17:28Z) Inspected the supplied reference, existing global color tokens, and the shared layout.
- [x] (2026-09-07 17:28Z) Read the requested theme-toggle article and created this implementation plan.
- [x] (2026-09-07 17:31Z) Applied the light and dark token sets, header control, and client-side preference behavior.
- [x] (2026-09-07 17:32Z) Ran Astro checks, a production build, generated-HTML inspection, and whitespace validation.
- [x] (2026-09-07 17:59Z) Hardened theme initialization and control binding for pre-paint class application, multiple controls, and Astro page swaps; reran checks and production build.
- [ ] Browser-rendered visual verification is pending because the local browser connector returned a workspace metadata error before it could attach.

## Surprises & Discoveries

- Observation: The existing design already centralizes nearly all site colors in `src/styles/global.css` custom properties.
  Evidence: The stylesheet defines `--bg`, `--ink`, `--muted`, `--hairline`, and accent/surface tokens at its root; only a handful of media/code/input colors are literal values.
- Observation: The current working tree has an unrelated `package-lock.json` change.
  Evidence: `git diff -- package-lock.json` shows only an `engines.node` metadata addition; this work will leave it untouched.

## Decision Log

- Decision: Preserve every existing layout and type rule; change only palette tokens and add the compact theme action to the existing navigation.
  Rationale: The supplied image is explicitly a color reference, not a replacement layout.
  Date/Author: 2026-09-07 / Codex
- Decision: Implement the visible control as a two-state, system-aware action with a three-state persistence model (`light`, `dark`, or absent).
  Rationale: This follows Lea Verou's model: the first click applies the opposite resolved theme, while clicking back to the system-resolved value deletes the stored override.
  Date/Author: 2026-09-07 / Codex

## Outcomes & Retrospective

The existing page layout, typography, and content structure are unchanged. The shared style system now uses the warm reference palette in light mode and a paired high-contrast dark palette. The header includes a compact sun/moon action that follows system preferences until the visitor makes an explicit adjustment, then removes that adjustment when they return to the system-resolved color scheme.

The static production output contains both initialization and interaction scripts along with the accessible control. Astro type checking and the complete build pass with no diagnostics. Browser-rendered visual inspection could not run because the local browser connector did not receive its required workspace metadata; this is an environment/tooling limitation rather than a site validation failure.

Follow-up hardening adds the resolved `dark` class before rendering, while retaining the `data-theme` hook. The runtime now manages every `data-theme-toggle` control rather than assuming one header button, guards against duplicate listeners, and reruns its binding after Astro's `astro:after-swap` event. The existing responsive header remains a single control that works at desktop and mobile widths; this multi-control binding also supports a future distinct mobile control without JavaScript changes.

## Context and Orientation

`src/layouts/BaseLayout.astro` supplies the shared document `<head>`, site header, navigation, and footer for every Astro page. It is the appropriate place for a no-flash theme initialization script, the accessible toggle button, and behavior shared across pages.

`src/styles/global.css` supplies the entire visual system through CSS custom properties and uses them in pages and components. The existing composition, spacing, and typography must remain unchanged. The reference provides a warm white ground, near-black type, gray dividers, and vermilion accent; it does not define a new composition.

The requested behavior stores a literal override in browser `localStorage` only when it differs from the operating system setting. In the absence of that value, `prefers-color-scheme` is followed. An OS preference change updates the page only when there is no explicit user override.

Visual thesis: a quiet, warm-paper editorial surface with precise black type and one energetic vermilion signal.

Content plan: unchanged—current hero, editorial lists, and footer remain as they are.

Interaction thesis: the current page entrance remains; the theme button gives immediate visual feedback, its icon crossfades between sun and moon, and links retain their existing restrained hover treatment.

## Plan of Work

1. Add a warm light token set and a high-contrast dark counterpart to `src/styles/global.css`. Replace the remaining literal surface colors with semantic tokens so code blocks, media, and focused inputs work in both themes.
2. Add an icon-only, keyboard-accessible toggle to the existing header navigation in `src/layouts/BaseLayout.astro` and style it in the global stylesheet without moving the navigation.
3. Add an inline, pre-paint initialization script and small interaction script. It resolves the system setting, honors any persisted override, removes an override when a click returns to the system result, and listens for future OS changes only while no override exists.
4. Run the Astro check/build. Start the site locally and verify the color palette and theme transitions in browser conditions.
5. Update this plan with exact validation evidence and outcomes.

## Concrete Steps

From `/Users/ciaran/conductor/workspaces/ciaranlyons/ankara`:

    npm run check
    npm run build

For manual verification, run `npm run dev`, open the home page, activate the header theme button with both pointer and keyboard, and emulate light/dark system preferences in browser developer tools. Expected results: the existing layout is unchanged; the light palette is warm-white/ink/vermilion; first click forces the opposite theme; a click returning to the operating-system-resolved value clears the override; no override follows later OS preference changes.

## Validation and Acceptance

- `npm run check` completes with zero Astro/type diagnostics.
- `npm run build` completes and emits the site successfully.
- In light mode, backgrounds, text, dividers, and links use the reference-derived warm white, near black, graphite, and vermilion palette; no green token remains visible.
- In dark mode, all text, surfaces, focus outlines, code blocks, and interactive controls retain readable contrast.
- The theme button has an accessible name, visible keyboard focus, and updates its descriptive label after each change.
- Theme behavior matches the requested article: storage is absent for system mode and contains only the explicit opposite theme otherwise.

## Idempotence and Recovery

The source edits are additive and can be re-run without data migration. Clearing `localStorage` key `ciaranlyons-theme` restores system-following behavior. If the inline script fails, CSS still provides a system-preference fallback through `prefers-color-scheme`; the site remains usable with its light default.

## Artifacts and Notes

- Reference image: `.context/attachments/tc9P9x/image.png` (local, gitignored).
- Theme-toggle rationale: https://lea.verou.me/blog/2026/dark-mode-toggles/
- 2026-09-07 17:30Z: `npm run check` completed with 0 errors, 0 warnings, and 0 hints across 46 files.
- 2026-09-07 17:31Z: `npm run build` completed successfully, generated 31 static pages, and reran `astro check` with 0 diagnostics.
- 2026-09-07 17:31Z: generated `dist/index.html` contains `ciaranlyons-theme`, the `theme-toggle` button, and both `data-theme` scripts; `git diff --check` returned no whitespace errors.
- 2026-09-07 17:59Z: `npm run check` returned 0 diagnostics; `npm run build` produced 31 pages; generated `dist/index.html` contains the early `dark` class toggle, `data-theme-toggle`, the guarded binder, and `astro:after-swap` listener.
- Browser connector attempt: unavailable because the workspace omitted the connector's required `sandboxPolicy` metadata.

## Interfaces and Dependencies

- `document.documentElement.dataset.theme`: resolved active theme, `light` or `dark`.
- `localStorage['ciaranlyons-theme']`: optional explicit override, `light` or `dark`; absent means follow system.
- `window.matchMedia('(prefers-color-scheme: dark)')`: operating system preference source.
- No new package dependency is required.

## Change Log

- 2026-09-07: Created plan from template and documented the reference-only palette scope and reversible two-state behavior.
- 2026-09-07: Implemented the palette and theme control; recorded build validation and the browser-connector limitation.
- 2026-09-07: Added pre-paint `dark` class synchronization and Astro-navigation-safe, multi-control theme binding after reviewing Militza Maury's implementation.
