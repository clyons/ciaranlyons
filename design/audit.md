# Site design audit — 2026-09-08

target: production `https://ciaranlyons.com/` and the committed desktop/mobile visual baselines

goal: Preserve a calm editorial rhythm across the home page, archives, and representative detail pages while keeping scanning and retrieval clear.

## Result

The cross-site rhythm is coherent. The remaining Found Quote typography issue is fixed: every renderer now uses one content-derived tier, short quotations retain their display impact, and long passages use a calmer reading scale that remains larger than Writing body copy.

| # | area | issue | sev | fix | eff | status |
|---|---|---|---|---|---|---|
| 1 | Found Quote typography | Every archive and Writing quote defaulted to display scale; only the Great Silence permalink received the reading class via a hard-coded slug. Quotes reached 17 large-text lines on desktop, 28 at 320px, and 22 inside mobile Writing. | HIGH | Implemented shared compact/responsive/reading tiers, a 24px mobile reading floor, and rendered-line, size-ratio, and overflow regression checks. | M | Fixed |
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
- Rechecked the final archive, Home, WAGMI Writing entry, compact permalink, and reading permalink against committed desktop/mobile baselines. The 28 current quotations classify as 4 compact, 2 responsive, and 22 reading; no display-sized quote exceeds two rendered lines at 1280px, 390px, or 320px.
- Automated semantics, keyboard, overflow, and contrast checks pass. A manual screen-reader pass remains appropriate as a separate accessibility check.
