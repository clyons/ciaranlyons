# About A design audit

Target: `http://127.0.0.1:4322/about-a/`

Goal: introduce Ciaran as a person and operator, establish credible experience, surface a small amount of representative work, and make contact feel natural. The page should extend the site’s editorial character without reading like a résumé template or a stack of landing-page modules.

## Prioritized findings

| # | Area | Issue | Severity | Concrete fix | Effort |
|---|---|---|---|---|---|
| 1 | Rhythm | Six consecutive sections use the same full-width block, label, large heading, generous padding, and divider. Every topic receives equal visual weight, creating the blocky stop/start feeling. | High | Merge “Now” and “The through-line” into one continuous editorial introduction. Use only three major page movements: opening profile, experience/work, contact. Remove most section-ending rules. | M |
| 2 | Hierarchy | Four H2s render at 79.2px desktop and 48.75px mobile. Their repeated display scale competes with the hero and makes supporting information feel like another hero each time. | High | Keep the H1 as the only poster-scale statement. Set major section headings around 42–54px desktop and 36–42px mobile; use quiet labels only where they aid scanning. | S |
| 3 | Density | The page reaches 4,918px desktop and 5,034px mobile despite containing a short biography, four history entries, and three case studies. Large padding and headings overwhelm the amount of content. | High | Target roughly 3,300–3,700px. Reduce vertical padding by 30–40%, tighten work rows, and let related paragraphs share one reading flow. | M |
| 4 | Portrait | Removing the circle helped, but the framed 4:5 rectangle still behaves like an isolated profile component. On mobile it becomes a shallow banner crop, weakening the person-first intention. | Medium | Keep a consistent portrait crop across breakpoints, use a slimmer 3:4 editorial image, align it to the headline baseline, and let it bleed slightly beyond the text grid rather than sitting as a self-contained block. | S |
| 5 | Experience | “Selected history” is a rigid three-column data table with four repeated rules. It communicates facts efficiently but shifts the page toward an executive résumé. | Medium | Use a compact editorial chronology: organization and role on one line, result as a smaller orange/mono annotation beneath. Keep one opening rule and whitespace between entries instead of boxing every row. | M |
| 6 | Case studies | Each case study repeats metadata, a large multi-line title, summary, arrow, and divider. The pattern is heavier than the three links warrant. | Medium | Make the title the link and keep one short line of context. Use a numbered list or hanging index with whitespace; reserve dividers for the list boundary, not every item. | S |
| 7 | Contact | The full-bleed orange rectangle is visually louder than the biography and reads like a marketing-page conversion band. “Elsewhere” then creates a second ending before the actual footer. | Medium | End with one generous typographic sentence—“Email is best. hello@…”—on the page background, using orange for the link/arrow. Fold social links into the site footer or a single quiet line. | S |
| 8 | Copy | The hero repeats the homepage proposition, while the strongest personal idea—small improvements compounding—gets another oversized section later. | Medium | Let the hero identify Ciaran rather than restate the homepage. Keep “I build things that last and grow” as a short through-line inside the introduction, then move directly into current work. | M |

## Recommended revision: Editorial profile, less constructed

1. **Opening profile:** `About Ciaran` label, an identity-led H1, two-sentence introduction, and one consistent 3:4 portrait. No bottom rule; the image slightly breaks the grid.
2. **Continuous narrative:** one wide editorial passage combining current work, prior growth experience, and the systems/automation through-line. A single “Now” marginal label is enough.
3. **Experience and work:** a compact chronology followed by three restrained case-study links. One shared section heading, fewer rules, smaller type.
4. **Quiet ending:** one email invitation and one line of social links. No orange panel.

Type hierarchy: one poster-scale H1, one medium display size for section headings, reading-scale body, mono only for metadata. Limit the page to two or three horizontal rules outside the header/footer.

## What should remain

- The hard-edged portrait direction rather than returning to an avatar circle.
- The existing cream, ink, orange, serif, mono, and dark-mode tokens.
- The person-first hero and clear factual outcomes.
- Real links and the current minimum-width/accessibility behavior.

## Verification

- Captured and inspected at 1440×1000 and 390×844 in the live browser.
- Measured section heights and computed heading sizes.
- Confirmed one H1, working portrait loading, and zero horizontal overflow.
- Full WCAG conformance would still require manual assistive-technology testing after a revision is implemented.

Verdict: **REVISE** — Concept A has the right ingredients, but repeated section architecture and oversized supporting headings make it feel like a stack of blocks. The fix is consolidation and hierarchy, not another visual theme.

## Selected implementation direction

- Visual thesis: a warm, unboxed editorial profile with one strong portrait, one poster-scale idea, and a looser reading rhythm.
- Content plan: identity-led hero, continuous career narrative, shared experience/work evidence section, quiet contact ending.
- Interaction thesis: paired hero-copy and portrait entrances plus directional case-study hover; all motion is removed under reduced-motion preferences.
