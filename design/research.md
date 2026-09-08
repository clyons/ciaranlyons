# Links archive design research

flow: Find, browse, and revisit one item in a 2,625-link personal archive.

## Patterns to adopt

- Keep time as the primary browse model. Adactio and Daring Fireball expose durable year/month archives instead of asking readers to learn a bespoke taxonomy.
- Put explicit search beside archive navigation. Waxy's 2026 archive refresh combines a labelled search action, year counts, and a chronological index; Raindrop similarly treats search/filtering as the way into a large collection.
- Keep entries text-first and attributable. Kottke's Quick Links and Waxy use titles, short context, and visible source credit rather than image-card grids.
- Prefer stable, shareable pagination over infinite scroll. Raindrop's public-page rationale explicitly favors page URLs because readers can return to or share a known position.

## Competitor notes

- Adactio: extremely durable year/month hierarchy and visible RSS/search; easy to understand, but its compact controls and long archive index are not comfortable touch targets.
- Daring Fireball: strong authored identity and a simple month archive; scanning is calm, but the archive offers no search in its primary path.
- Kottke Quick Links: readable link-plus-commentary stream with a clear feed affordance; suited to reading the latest items, less suited to finding one old item.
- Waxy: the closest current pattern. Its archive leads with explicit search, year-level item counts, chronological results, and better source attribution.
- Raindrop public collections: validates predictable pagination and human-readable URLs, though its visual bookmark-manager model is heavier than this site's editorial voice needs.

## Pains, gaps, and response

- Pain: chronological indexes become unwieldy without a direct retrieval path. Response: keep Pagefind search prominent and scoped to Links.
- Pain: small year and action links are error-prone on touch screens. Response: use at least 44×44 CSS-pixel hit areas without adding card chrome.
- Pain: image grids emphasize publisher artwork over the curator's judgment. Response: retain the cardless editorial ledger.
- Gap to exploit: combine the longevity of a linkblog with local permalinks, explicit outbound destinations, full archive search, RSS, and optional Standard.site records.

## Sources

- https://adactio.com/links/archive
- https://daringfireball.net/linked/
- https://kottke.org/quick-links/
- https://waxy.org/archives/
- https://waxy.org/
- https://blog.raindrop.io/new-public-page-and-embeds-fab7bcb56b4f/
- https://help.raindrop.io/filters
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced
- https://developer.apple.com/design/human-interface-guidelines/accessibility

Research captures are gitignored under `.context/design/research-*.png`.
