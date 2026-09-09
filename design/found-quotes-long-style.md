# Found Quotes long-style study

## Question

How should Found Quotes shift from display typography to sustained-reading typography when the quotation grows beyond a short editorial burst?

## Production treatment

The study page at `/found-quotes/style-study/` now selects one current example from each automatic tier. The same classification runs inside the shared Found Quote component, so archives, date archives, Home, standalone permalinks, and Found Quotes embedded in Writing cannot drift apart.

Flow:

    Found Quote text
      ├─ ≤40 characters, one paragraph → compact → display at every width
      ├─ 41–100 characters, one paragraph → responsive → display desktop, reading mobile
      └─ >100 characters or multiple paragraphs → reading → reading at every width

The treatment keeps the current serif family, orange opening mark, attribution hierarchy, rules, and page shell. The reading tier adjusts the quote measure, size, line height, letter spacing, wrapping mode, and vertical padding. Blank-line-separated passages remain semantic paragraphs with a compact paragraph gap rather than an empty line.

## Reading scale

- Desktop: `clamp(1.65rem, 2.5vw, 2.2rem)` at `1.2` line height, capped at a 48rem measure.
- Mobile: `clamp(1.5rem, 6.2vw, 1.75rem)` at `1.26` line height. The 24px floor keeps quotation prose visibly larger than body copy.
- Reading-scale block padding is reduced, and paragraph breaks use a `0.48em` gap.
- A standalone `[…]` marks editor-elided material as a muted, compact separator. Genuine ellipses belonging to the quoted speaker remain ordinary inline `…` characters.
- The collection date remains in frontmatter and the dated canonical URL, but each on-page quote uses a compact `#` bookmark link rather than displaying the date as contextual metadata.
- Classification is server-rendered from content. The renderer normalizes whitespace, counts Unicode code points, and treats multiple authored paragraphs as reading prose regardless of raw length. It emits a stable tier class and `data-quote-tier`; CSS variables select typography without runtime JavaScript or slug exceptions.
- Character thresholds are deterministic inputs rather than claims about every possible font rendering. Browser tests enforce the visual outcome by counting actual line boxes for all display-tier quotes at each supported reference width.

## Acceptance check

- Every compact quote retains its visual punch and occupies no more than two rendered lines at 1280px, 390px, and 320px.
- Responsive quotes remain display-sized for up to three desktop lines and switch to reading type on mobile.
- Long and multi-paragraph passages are materially easier to read and occupy less vertical space.
- The long treatment remains unmistakably part of the same Found Quotes system.
- Archive and detail pages have no horizontal overflow at 1280px, 390px, or 320px.
- Found Quotes embedded in Writing remain at least 1.25 times the surrounding body-copy size.
