# Polish mobile navigation, page hierarchy, and visual regression coverage

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Make ciaranlyons.com more reliable and pleasant to use on a phone, remove redundant visual and textual page chrome, and ensure that meaningful layout or accessibility regressions are caught before publication. Visitors will see all primary navigation controls in one intentional mobile row, list-page content will be separated by one line rather than two, and page headings will not repeat themselves through decorative labels. The project list will lead with TIL, and its site card will use the requested lowercase name and revised description. A Playwright harness will exercise the public routes at desktop and mobile widths, verify core keyboard/accessibility behavior, and keep approved screenshots as visual baselines.

## Progress

- [x] (2026-09-07 20:19Z) Inspected the layout, global CSS, route templates, content loader, package scripts, and ExecPlan requirements.
- [x] (2026-09-07 20:19Z) Identified the mobile-nav defect: the `max-width: 420px` grid defines four columns for five controls.
- [x] (2026-09-07 20:24Z) Implemented project ordering and copy, simplified the About/Writing/Notes headers, removed duplicate archive dividers, and repaired mobile navigation.
- [x] (2026-09-07 20:25Z) Added Playwright Chromium projects, a static test server, keyboard/accessibility assertions, mobile layout geometry checks, and desktop/mobile visual baselines.
- [x] (2026-09-07 20:25Z) Ran `npm run test:ui` (36 passed), `npm run check` (0 diagnostics), `npm test` (28 passed), and visually inspected mobile Home and Notes baselines.

## Surprises & Discoveries

- Observation: Projects are sorted alphabetically in `src/lib/content.ts`, which places `CiaranLyons.com` ahead of TIL regardless of Markdown file order.
  Evidence: `loadProjects()` returns `entries.sort((a, b) => a.title.localeCompare(b.title))`.
- Observation: Adjacent generic `.section` elements both contribute a border, yielding a doubled divider between archive headers and their lists.
  Evidence: `.section` has `border-bottom`, while its immediately following sibling also begins with an archive row whose `border-top` is visible.
- Observation: Astro 7's `preview` command starts its server in the background and then exits, which is incompatible with Playwright's `webServer` process lifecycle.
  Evidence: `npm run test:ui:update` reported that the configured preview process exited early, while `astro preview status` showed a background server.

## Decision Log

- Decision: Keep the desktop primary navigation unchanged; use a five-track mobile grid that contains all four links and the theme switch in the same row.
  Rationale: It fixes the control overflow without hiding navigation behind a menu or changing information architecture.
  Date/Author: 2026-09-07 / Codex
- Decision: Use Playwright's built-in `@playwright/test` runner with route smoke, keyboard/focus, and screenshot assertions.
  Rationale: It offers stable browser-driven accessibility checks and visual baselines without introducing an additional test framework.
  Date/Author: 2026-09-07 / Codex
- Decision: Serve `dist/` through `scripts/serve-dist.mjs` during UI tests instead of Astro's preview command.
  Rationale: The small foreground Node server gives Playwright reliable process ownership while still testing the exact generated static site.
  Date/Author: 2026-09-07 / Codex

## Outcomes & Retrospective

All requested UI changes and the test harness are complete. The UI suite contains 36 passing assertions across desktop Chrome and a 390px touch/mobile Chrome viewport. It guards semantic navigation and main landmarks, one H1 per core page, skip-link focus behavior, theme-control state, project copy/order, archive-divider layout, navigation geometry, and eight desktop/mobile full-page visual snapshots. The browser was installed locally with `npx playwright install chromium`; CI or a new machine must do the same before its first UI-test run.

## Context and Orientation

Astro routes live in `src/pages/`; all routes share `src/layouts/BaseLayout.astro`, which contains the skip link, primary navigation, theme switch, main landmark, and footer. `src/styles/global.css` contains all visual rules and the responsive breakpoints. The About page uses `src/pages/about.astro`; the Writing, Notes, and TIL archive headers use their respective `index.astro` files. Project metadata lives in `content/projects/*.md` and is read and ordered by `getProjects()` in `src/lib/content.ts`.

`package.json` provides the normal `npm run check`, `npm test`, and `npm run build` validation commands. The Playwright configuration and tests will be added at the repository root under `playwright.config.ts` and `tests/ui/`. Generated screenshots will live under `tests/ui/*.spec.ts-snapshots/`, and Playwright runtime artifacts will remain ignored.

## Plan of Work

First, update the project metadata and deterministic sort to put TIL first. Remove decorative eyebrow text from About, Writing, Notes, and TIL where it simply repeats the visible page heading, then give the generic adjacent sections a one-divider relationship.

Next, refine `BaseLayout.astro` and the mobile CSS. Give the `<main>` landmark a focus target for the skip link and make the theme control expose its pressed state. At mobile widths, place all primary links and the toggle into five constrained columns and remove the old four-column override that forced a wrap. Add durable focus, high-contrast, and motion-reduction details where needed.

Finally, install and configure Playwright. The harness will start Astro's preview server after a build, run desktop and mobile route tests, assert accessible landmarks, skip-link behavior, primary navigation geometry, and theme-toggle state, and capture screenshots of high-value routes. Add scripts and gitignore entries for repeatable local and CI execution. Update this plan with real validation evidence.

## Concrete Steps

From `/Users/ciaran/conductor/workspaces/ciaranlyons/semarang`:

    npm install --save-dev @playwright/test
    npx playwright install chromium
    npm run check
    npm test
    npm run build
    npm run test:ui

When screenshot baselines are intentionally changed, regenerate them with:

    npm run test:ui:update

Expected result: the static build completes, the unit tests pass, and Playwright reports all desktop and mobile tests passing. Its snapshots become the reviewed visual baseline; unexpected pixel changes fail `npm run test:ui` with a diff artifact.

## Validation and Acceptance

- At 320px and 390px widths, About, Writing, Notes, Projects, and the theme switch are all visibly in the primary-navigation row; no control wraps or extends beyond the viewport.
- Keyboard focus reveals the skip link. Activating it moves focus to the main landmark.
- The theme control’s accessible state changes after activation and the site changes theme.
- The About, Writing, Notes, and TIL headers have one visible page title and no eyebrow that repeats it.
- Writing, Notes, Projects, TIL, and Search show a single divider between the header and their following content region.
- `/projects/` renders TIL before `ciaranlyons.com`, and the latter displays the requested copy.
- `npm run test:ui` covers the published core routes at desktop and mobile viewport sizes and compares the defined visual baselines.

## Idempotence and Recovery

The CSS, template, content, and test-file changes are additive and safe to rerun. `npm run test:ui` does not modify sources; it only writes ignored Playwright reports/results on a failure. `npm run test:ui:update` intentionally overwrites only committed baseline images and should be used only after visual review. If browser dependencies are unavailable, rerun `npx playwright install chromium`; deleting ignored `test-results/` and `playwright-report/` is safe if a previous failed run needs to be cleared.

## Artifacts and Notes

- `npm run test:ui` — 36 passed (desktop and mobile Chromium); snapshots committed in `tests/ui/site.spec.ts-snapshots/`.
- `npm run check` — 0 errors, 0 warnings, 0 hints across 63 files.
- `npm test` — 28 passed, 0 failed.
- Mobile Home and Notes baseline images were visually inspected: the five primary controls fit in one row at 390px, and the Notes archive has a single header/content divider.

## Interfaces and Dependencies

- `getProjects(): Promise<ProjectEntry[]>` in `src/lib/content.ts` defines the project ordering surfaced by `/` and `/projects/`.
- `BaseLayout.astro` owns `#main-content`, `[data-theme-toggle]`, and `nav[aria-label="Primary navigation"]`, which the UI tests treat as stable semantic interfaces.
- `@playwright/test` supplies the test runner, the Chromium browser, web-server lifecycle integration, accessible locators, and screenshot assertions.

## Change Log

- 2026-09-07: Created the plan from `.agent/execplans/TEMPLATE.md` and recorded the implementation approach.
- 2026-09-07: Completed the UI polish, accessibility refinements, and Playwright regression harness; recorded validation evidence.
