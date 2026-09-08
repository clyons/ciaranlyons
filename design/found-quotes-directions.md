# Found Quotes interface directions

Source of truth: `design/context.md`

## Direction A — Editorial ledger (selected)

Principle: The words are the interface. Present one generous full-width quotation at a time, separated by the site's existing hairlines.

Layout: Existing page title and lede, followed by a single-column reading measure. Each entry uses a large serif quotation, a compact attribution/source line, and a quiet `#` permalink marker; dates remain structural metadata rather than visible quote context. The newest quote can appear as a quiet full-width home section between the featured essay and projects.

Components: Semantic quote figure, blockquote, figcaption, source link, permalink, preview-content label, and empty state.

Optimizes for: Reading, provenance, calm hierarchy, accessibility, and consistency with Writing and Notes.

Sacrifices: Lower information density; long archives will eventually need pagination.

Fit to success criteria: Strongest. Full quote, attribution, source, and permalink are visible together without a card UI or interaction.

## Direction B — Annotated index

Principle: Treat the collection as a reference catalogue.

Layout: A narrow left rail for attribution/date/source and a wider right column for quotation text. Dense rows expose more records above the fold.

Components: Two-column archive row, metadata rail, source link, quote text, permalink.

Optimizes for: Fast scanning by author and date; larger future collections.

Sacrifices: The quotation loses visual primacy, and the layout collapses into a less coherent stack on mobile.

Fit to success criteria: Moderate. Provenance is strong, but reading flow and 320px behavior are weaker.

## Direction C — Curator's commonplace cards

Principle: Make every quote feel like a clipped object from a personal commonplace book.

Layout: Responsive two-column cards with varied quote lengths, tinted surfaces, and tags.

Components: Card grid, tags, quote card, source footer, hover state.

Optimizes for: Browsing variety and visual personality.

Sacrifices: Conflicts with the site's explicitly cardless editorial language, creates awkward height imbalance, and elevates tags that are not needed in v1.

Fit to success criteria: Weakest. It is visually distinct but drifts from the existing design system and makes long quotations harder to read.

## Recommendation and choice

Proceed with **Editorial ledger**. It extends the site's current grammar instead of inventing a quote application inside it. It also makes the curation boundary clearest: the quote is large, the provenance is precise, and Ciaran's voice appears only in page framing or a separate Writing entry.

The user asked to proceed through implementation without an intermediate selection pause, so the recommended direction is treated as selected for the reference mock and build.
