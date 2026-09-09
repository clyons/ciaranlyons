# Publish a Found Quote

Found Quotes are words by other people that Ciaran wants to remember. Each quote is a durable, repository-owned record with its own permalink. It is curation—not a Note and not Ciaran's authored Writing.

## Add one quote

Create one file at `content/found-quotes/<slug>.md`. Use a short, stable, URL-safe slug and this shape:

```markdown
---
attribution: "Person or organization credited with the words"
source: "Book, article, talk, conversation, or other source"
sourceDate: 2026-09-07
sourceUrl: "https://authoritative.example/source"
emphasis: "Optional exact phrase to render with semantic emphasis"
via: "Optional place or person through which Ciaran found it"
viaUrl: "https://optional.example/discovery-path"
date: 2026-09-07
updated: 2026-09-07
tags:
  - systems
---

The exact quotation goes here. Do not add a Markdown blockquote marker.
```

The quote body, `attribution`, `source`, and `date` are required. `date` is when the quote entered this collection. `sourceDate`, `updated`, `sourceUrl`, `emphasis`, `via`, `viaUrl`, and `tags` are optional; `viaUrl` requires `via`. Set `sourceDate` only when the original source establishes an exact calendar date; it orders quotes added on the same day without altering their permalinks.

- `attribution` answers who said or wrote the words.
- `source` identifies where the words originally appeared.
- `emphasis` identifies one exact, case-sensitive phrase in the quotation to render as `<em>` without enabling arbitrary Markdown or HTML.
- `via` records where Ciaran encountered the quote; it is not a substitute for the original source.

Preserve the exact words and punctuation. Prefer an authoritative source URL when one exists. Do not silently repair or modernize quoted text, and do not invent attribution or provenance. If a later correction is necessary, change the canonical quote file and set `updated` to the correction date.

Separate source paragraphs with one blank line. When Ciaran deliberately removes material between quoted passages, put `[…]` on its own line between blank lines. The brackets distinguish an editorial elision from an ellipsis that belongs to the speaker; the renderer announces the omission and presents it as a compact separator.

Typography is automatic. A single-paragraph quote up to 40 Unicode characters stays at display scale; one from 41–85 characters uses display scale on desktop and reading scale on mobile; anything longer or containing multiple paragraphs uses reading scale everywhere. Preserve the source's real paragraph structure, but do not add manual line breaks, presentation frontmatter, or other formatting merely to force a tier.

The generated permalink is `/found-quotes/YYYY/MM/DD/<slug>/`. Do not change a published slug or date without treating it as a URL migration.

## Compose a collection

A named, ordered collection is a Writing because its selection and framing are Ciaran's editorial work. Reference existing Found Quote slugs in display order:

```markdown
---
title: "Found Quotes: Stewardship"
description: "A handful of ideas about caring for outcomes without controlling everything."
date: 2026-09-07
foundQuotes:
  - first-stable-quote-slug
  - second-stable-quote-slug
---

An introduction or connective note explaining why these words belong together.
```

Keep the quote text and provenance in the Found Quote files. The Writing page, search index, and Standard.site document expand the references automatically. A Note may link to a quote or react to one, but it is not the collection container.

## Review and publish

Run `npm test`, `npm run check`, `npm run build`, and `npm run test:ui`. The build's social-preview gate must pass. Inspect the quote archive, detail permalink, search JSON, `/feed.xml`, and `/found-quotes/feed.xml`. Review the source text and provenance as carefully as the layout.

Open `dist/og/found-quotes/YYYY/MM/DD/<slug>.png` before merge. Confirm that the quotation remains legible, any truncation is intentional, and the attribution and source are correct. If the quote is part of a new Writing collection, also open `dist/og/writing/YYYY/MM/DD/<writing-slug>.png`. Inspect each built page to confirm its Open Graph and Twitter metadata points to that exact preview. Include the build result and every inspected preview path in the PR validation evidence. Follow the full [content social preview contract](./deploy.md#content-social-previews).

Use a fresh feature branch and open a focused PR that names the ExecPlan when the change is substantial. Ordinary quote changes follow the repository deployment runbook: merge the verified source PR to `main`, let GitHub Actions deploy production, and then verify the public permalink, archive, search, and feeds.

`preview: true` is reserved for clearly fictional design fixtures on preview-only branches. It adds a visible warning, but it does not make sample content safe for production. Remove the fixture or replace it with approved real content before merge.
