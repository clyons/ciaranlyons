# Found Quotes long-style study

## Question

How should Found Quotes shift from display typography to sustained-reading typography when the quotation grows beyond roughly two display lines?

## Prototype

The study page at `/found-quotes/style-study/` shows only the first four current quotes. The first three retain the approved display treatment. Karl Schroeder's Great Silence quotation uses the proposed reading treatment and links through to its permalink, where the same treatment is applied.

Flow:

    Four-quote type study
      ├─ short quote source/permalink links → existing destinations
      └─ Great Silence `#` link → long-quote permalink

The prototype keeps the current serif family, orange opening mark, attribution hierarchy, rules, and page shell. The reading treatment adjusts the quote measure, size, line height, letter spacing, wrapping mode, and vertical padding. Blank-line-separated passages are modeled as semantic paragraphs with a compact paragraph gap rather than an empty line.

## Proposed reading scale

- Desktop: `clamp(1.75rem, 2.8vw, 2.4rem)` at `1.2` line height, capped at a 48rem measure.
- Mobile: `clamp(1.4rem, 6vw, 1.7rem)` at `1.24` line height.
- Reading-scale block padding is reduced, and paragraph breaks use a `0.48em` gap.
- A standalone `[…]` marks editor-elided material as a muted, compact separator. Genuine ellipses belonging to the quoted speaker remain ordinary inline `…` characters.
- The collection date remains in frontmatter and the dated canonical URL, but each on-page quote uses a compact `#` bookmark link rather than displaying the date as contextual metadata.
- Classification is deliberately explicit in this mock. If the direction is approved, implementation should use a stable editorial field or documented length tier rather than browser-side line measurement, which would shift by viewport and font loading.

## Acceptance check

- The first three quotes retain their visual punch.
- The Great Silence excerpt is materially easier to read and occupies less vertical space.
- The long treatment remains unmistakably part of the same Found Quotes system.
- Archive and detail pages have no horizontal overflow at 1280px, 390px, or 320px.
