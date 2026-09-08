# About page design QA

**Prototype:** `/about/`

**Design basis:** `design/about-a-audit.md`

**Verdict:** READY

## Visual review

- PASS — The page now has one dominant, poster-scale headline and a consistent 3:4 portrait instead of the off-brand circular crop.
- PASS — Biography, experience, selected work, and contact form one continuous editorial composition; repeated card-like containers, shadows, and competing headline scales have been removed.
- PASS — Experience reads as a restrained chronology and selected work as a numbered index, creating hierarchy without introducing another grid of blocks.
- PASS — The contact close is intentionally quiet and keeps email as the primary action.
- PASS — Light and dark themes were reviewed at 1440px desktop width. Mobile was reviewed at 390px and 320px with no horizontal overflow.
- PASS — The redesigned desktop page is approximately 3,245px tall, down from approximately 4,918px in the reviewed About A direction.

## Content and requirements

- PASS — PQ Program reach is stated as “over 250,000 participants.”
- PASS — No one-million-participant claim remains in the page source.
- PASS — The page does not discuss assessment volume, so no unrelated assessment claim was introduced.
- PASS — The temporary `/about-a`, `/about-b`, and `/about-c` routes are absent; the selected direction is implemented at `/about/`.

## Interaction and accessibility

- PASS — The page exposes one `h1`, a labelled primary navigation, working internal and external links, and visible keyboard focus inherited from the site system.
- PASS — The primary email action and social controls retain comfortable pointer targets.
- PASS — Entrance motion is limited to the hero composition, link motion communicates direction, and both are disabled under `prefers-reduced-motion`.
- PASS — Responsive AVIF portrait sources are provided with a JPEG fallback and descriptive alternative text.
- NOTE — Automated structure, keyboard, viewport, and visual-regression checks pass. A manual screen-reader pass remains a sensible pre-publication spot check, but no blocking semantic issue was found.

## Validation evidence

- `npm run lint` — 104 files checked; 0 errors, 0 warnings, 0 hints.
- `npx tsc --noEmit` — passed.
- `npm test` — 70 tests passed.
- `npm run build` — 4,067 pages built; 68 Open Graph images verified; Pagefind indexed 2,662 pages.
- `npm run test:ui` — 94 Playwright tests passed across desktop and mobile projects.
