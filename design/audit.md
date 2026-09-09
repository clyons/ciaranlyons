# Site design audit — 2026-09-08

target: production `https://ciaranlyons.com/` and the committed desktop/mobile visual baselines

goal: Preserve a calm editorial rhythm across the home page, archives, and representative detail pages while keeping scanning and retrieval clear.

## Result

The cross-site rhythm remains coherent, but the historical Found Quotes type study was never generalized beyond one hard-coded permalink. Long quotations therefore render as oversized display text in archives, Home, and Writing collections. This is the highest-priority remaining harmonization issue.

| # | area | issue | sev | fix | eff | status |
|---|---|---|---|---|---|---|
| 1 | Found Quote typography | Every archive and Writing quote defaults to display scale; only the Great Silence permalink receives the reading class via a hard-coded slug. Current quotes reach 17 large-text lines on desktop, 28 at 320px, and 22 inside mobile Writing. The one mobile reading exception is only about 17% larger than body copy. | HIGH | Implement the content-derived compact/responsive/reading tiers and rendered-line regression checks in `.agent/execplans/2026-09-08-harmonize-found-quote-typography.md`; keep reading type at least 25% larger than Writing body copy. | M | Proposed |
| 2 | TIL archive rhythm | TIL used the Links-style search control inside a full generic `.section`. Its `58–92px` padding above and below created a noticeably taller empty band than the compact Links tools strip, and visually separated search from both the TIL header and `Recent`/`Topics`. | MED | Extracted a shared compact `archive-tools` class and retained the full-width mobile treatment. | S | Fixed |
| 3 | Archive affordances | Projects, TIL listings, TIL date archives, and Writing date archives rendered a literal `->`; after correcting the glyph, those rows still used an unstyled `.arrow` while Home and search used the larger, centered treatment. | MED | Replaced the ASCII glyphs and consolidated every full-row internal arrow onto the shared `row-action` treatment, retaining `aria-hidden`. | S | Fixed |

## What should stay

- The home sequence has clear, intentional changes of scale: proposition, featured writing, a single found quote, then compact project rows.
- Archive pages share a dependable pattern of title/lede, one divider, then editorial rows. The mobile versions retain the same hierarchy without horizontal overflow.
- Links has the right retrieval density: a visible search action, search-plus-button sizing that becomes full width on mobile, and year navigation kept adjacent to the control.
- The About page’s broader section spacing is justified by its long-form narrative and reads well at both desktop and mobile widths.
- The approved large Found Quote scale should remain unchanged for quotations that occupy no more than two lines at the reference viewport.

## Evidence and limits

- Reviewed production-rendered content for Home, About, Writing, Notes, Projects, and TIL, plus committed desktop/mobile baselines for Home, About, Writing, Notes, Links, Projects, Found Quotes, and a Note detail page.
- Checked the corresponding layout and responsive CSS, archive templates, merged PR history, ExecPlans, and existing UI assertions. Measured all 28 current quotations at 1280px, 390px, and 320px; actual line boxes confirm the scale-selection gap described above.
- The in-app browser session was unavailable in this environment, so this is a visual/source audit rather than a fresh interactive assistive-technology pass. A manual keyboard and screen-reader pass remains appropriate after the next visual change.
