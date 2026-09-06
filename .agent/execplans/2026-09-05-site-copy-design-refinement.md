# Refine Site Copy and Design

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Bring the current CiaranLyons.com implementation closer to its intended feel: a personal, durable home for writing, notes, projects, and TILs that reads like Ciaran rather than like an implementation brief.

Users should see clearer headings, less generic generated copy, and a more deliberate editorial visual system across the home page, archives, articles, notes, projects, and search.

## Progress

- [x] (2026-09-05 20:14Z) Initial audit and planning completed.
- [x] (2026-09-05 20:17Z) Reworked homepage, archive, TIL, project, search, and About copy to remove implementation-brief language.
- [x] (2026-09-05 20:20Z) Refined global typography, spacing, color, focus states, row interactions, media styling, and mobile sizing.
- [x] (2026-09-05 20:27Z) Validation complete.
- [x] (2026-09-05 20:32Z) Added the supplied profile portrait to the About page, favicon and Apple touch icons, and standard Open Graph metadata; omitted Twitter-specific metadata.

## Surprises & Discoveries

- Observation: The site currently builds cleanly, but the generated output still includes placeholder-style writing content on this branch.
  Evidence: `content/writing/the-ai-boom-ends-in-fraud-or-collapse.md` contains the sentence "This is a placeholder for the permanent version of the essay."

- Observation: Several visible headings and descriptions describe the site architecture instead of the reader-facing subject.
  Evidence: Home and archive copy includes "permanent addresses", "owned URLs", "represented on ciaranlyons.com", and "durable URLs".

- Observation: Chrome's Mac headless screenshot mode produced a stale/cropped article screenshot even after the served CSS contained the updated viewport and prose measure rules.
  Evidence: `curl http://127.0.0.1:4321/src/styles/global.css` showed the latest `max-width` and mobile prose rules, while repeated article screenshots remained visually identical.

## Decision Log

- Decision: Keep the existing sparse, editorial structure and refine it with typography, spacing, and copy instead of adding new page sections or decorative cards.
  Rationale: The site is meant to be a personal publishing home, so restraint and readable hierarchy matter more than additional UI components.
  Date/Author: 2026-09-05 / Codex

- Decision: Use system Georgia plus system sans rather than adding a webfont dependency.
  Rationale: The site is fast, small, and editorial; a dependency is not needed to improve hierarchy.
  Date/Author: 2026-09-05 / Codex

- Decision: Use the supplied portrait for the About page, browser icons, and standard Open Graph previews, but do not add Twitter card metadata.
  Rationale: The portrait improves person-level recognition where it is useful while respecting the requested exclusion of Twitter-specific sharing support.
  Date/Author: 2026-09-05 / Codex

## Outcomes & Retrospective

The site now reads less like a launch scaffold and more like a personal publishing home. Homepage and archive headings were simplified, project/TIL descriptions were tightened, and the remaining placeholder writing entry was removed from the generated site.

The visual system remains cardless and editorial, with a quieter light background, stronger serif/sans hierarchy, better archive row behavior, clearer focus states, and safer mobile sizing.

The supplied square profile photo is stored as a 1200px optimized JPEG in `public/images/`, rendered as a circular About-page portrait, and used to generate a favicon and Apple touch icon. It is also available to standard Open Graph consumers; Twitter card metadata is intentionally absent.

## Context and Orientation

This is an Astro static site. The relevant surfaces are:

- `src/pages/index.astro`: home page sections and reader-facing headings.
- `src/pages/about.astro`, `src/pages/writing/index.astro`, `src/pages/notes/index.astro`, `src/pages/projects.astro`, `src/pages/search.astro`: top-level archive pages.
- `src/pages/**/[year]/**/*.astro`: date archive headings and list presentation.
- `src/layouts/BaseLayout.astro`: global metadata, header, footer, and social links.
- `src/styles/global.css`: typography, spacing, responsive behavior, list rows, articles, media, and search.
- `content/*.md`: source copy for About, Projects, Writing, TIL, and Notes.

## Plan of Work

First, revise visible copy and headings so they describe the content plainly: writing as essays, notes as short posts, TIL as practical notes, projects as selected work.

Second, refine the CSS around a tighter editorial system: cleaner background, better serif/sans scale, more readable archive rows, stronger focus states, calmer hover motion, and mobile spacing that avoids oversized headings.

Third, build the site and run targeted searches for placeholder/generic phrasing.

Fourth, inspect rendered pages at desktop and mobile sizes and record any remaining gaps.

## Concrete Steps

From repository root:

    npm run build
    rg -n -i "placeholder|permanent addresses|owned URLs|durable URLs|represented on ciaranlyons.com|built things, experiments" content src dist

Run a local server for visual QA and inspect `/`, `/about`, `/writing`, `/notes`, `/projects`, `/til`, `/search`, and a representative article/TIL/note page.

## Validation and Acceptance

- `npm run build` exits 0.
- Homepage and archive headings no longer use generic implementation-language phrases.
- Placeholder source content is either removed by the concurrent cleanup or clearly called out as remaining outside this pass.
- Desktop and mobile homepage/archive screenshots show no obvious overlap, broken layout, or text overflow.
- Site remains cardless and editorial, with improved typographic hierarchy and consistent interactive states.

## Idempotence and Recovery

All edits are ordinary source changes. If a copy or design change is not wanted, inspect `git diff` and revert only that hunk. Re-running build and visual QA is safe.

## Artifacts and Notes

Validation:

    npm run build

Result: 0 Astro check errors, 0 warnings, 0 hints; 31 static pages built.

Profile asset validation:

    npm run build
    rg -n 'twitter:' src dist

Result: build completed successfully; the Twitter-specific metadata search returned no matches.

Targeted text check:

    rg -n -i "permanent addresses|owned URLs|durable URLs|represented on ciaranlyons.com|built things, experiments|This is a placeholder|The AI Boom Ends" content src dist

Result: no matches.

Screenshot artifacts:

- `.context/site-home-mobile-4.png`
- `.context/site-writing-mobile-3.png`
- `.context/site-til-mobile-3.png`
- `.context/site-home-desktop-3.png`

Note: repeated Mac Chrome headless captures of the article page appeared cropped even after the served CSS showed the updated mobile width rules, so article validation relied on source CSS review and build output rather than that screenshot.

## Interfaces and Dependencies

No new runtime dependencies are planned. Existing Astro content loaders and route contracts should remain unchanged.

## Change Log

- 2026-09-05: Created the plan from template.
