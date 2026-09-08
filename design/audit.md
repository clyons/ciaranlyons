# Site design audit — 2026-09-08

target: production `https://ciaranlyons.com/` and the committed desktop/mobile visual baselines

goal: Preserve a calm editorial rhythm across the home page, archives, and representative detail pages while keeping scanning and retrieval clear.

## Result

No high-severity visual or rhythm problems found. The home page now has a consistent transition from `Latest found quote` into Projects, and the current Found Quote reading scale preserves its prose-like treatment without overwhelming surrounding content. Archive headers, row dividers, mobile navigation, and the responsive Links search treatment are generally coherent.

| # | area | issue | sev | fix | eff | status |
|---|---|---|---|---|---|---|
| 1 | TIL archive rhythm | TIL used the Links-style search control inside a full generic `.section`. Its `58–92px` padding above and below created a noticeably taller empty band than the compact Links tools strip, and visually separated search from both the TIL header and `Recent`/`Topics`. | MED | Extracted a shared compact `archive-tools` class and retained the full-width mobile treatment. | S | Fixed |
| 2 | Archive affordances | Projects, TIL listings, TIL date archives, and Writing date archives rendered a literal `->`; after correcting the glyph, those rows still used an unstyled `.arrow` while Home and search used the larger, centered treatment. | MED | Replaced the ASCII glyphs and consolidated every full-row internal arrow onto the shared `row-action` treatment, retaining `aria-hidden`. | S | Fixed |

## What should stay

- The home sequence has clear, intentional changes of scale: proposition, featured writing, a single found quote, then compact project rows.
- Archive pages share a dependable pattern of title/lede, one divider, then editorial rows. The mobile versions retain the same hierarchy without horizontal overflow.
- Links has the right retrieval density: a visible search action, search-plus-button sizing that becomes full width on mobile, and year navigation kept adjacent to the control.
- The About page’s broader section spacing is justified by its long-form narrative and reads well at both desktop and mobile widths.
- Found Quote reading pages use the reduced `found-quote--reading` scale appropriately; long quotations still feel distinct from body text rather than shouting.

## Evidence and limits

- Reviewed production-rendered content for Home, About, Writing, Notes, Projects, and TIL, plus committed desktop/mobile baselines for Home, About, Writing, Notes, Links, Projects, Found Quotes, and a Note detail page.
- Checked the corresponding layout and responsive CSS, archive templates, and existing UI assertions. The production deployment for the immediately preceding home-page refinement passed build, UI tests, and smoke tests.
- The in-app browser session was unavailable in this environment, so this is a visual/source audit rather than a fresh interactive assistive-technology pass. A manual keyboard and screen-reader pass remains appropriate after the next visual change.
