# Found Quotes design context

goal: Add a durable, clearly attributed Found Quotes stream that feels native to CiaranLyons.com and lets Writing entries compose ordered quote collections without duplicating quoted text.

user: Readers visiting a personal editorial site on desktop or mobile; Ciaran as the Git-backed author and curator.

JTBD: Readers can scan memorable quotations, understand who said them and where they came from, follow the source, save a stable permalink, and read Ciaran's separately authored collections. Ciaran can add or correct each quote once and reuse it in Writing.

constraints: Astro 7 static output; root `content/` Markdown; existing serif/sans/mono design tokens; light and dark themes; minimum 320px viewport; date-folder URLs; generated search/RSS/sitemap; primary header remains About, Writing, Notes, Projects plus theme control; no database, CMS, client framework, new package, deployment change, or automatic ATProto publication.

success:

- `/found-quotes/` makes quotation, attribution, source, collection date, and permalink legible without opening each item.
- Quote pages and Writing collections use semantic blockquote/citation markup and remain keyboard accessible.
- A Writing entry can reference quote slugs in order, and broken references fail before build or Standard.site publication.
- The feature is discoverable from the home page, footer, search, RSS, and sitemap without adding a fifth primary text link.
- Automated tests, static build, and desktop/mobile visual QA pass before a requested branch preview is deployed.

scope v1:

- One Markdown file per Found Quote.
- Top-level archive, date archives, and item permalinks.
- Shared quote renderer for archive, detail, home, and Writing collection contexts.
- Optional ordered `foundQuotes` references on Writing.
- Search, main RSS, dedicated RSS, sitemap, home, and footer integration.
- Publishing runbook and agent instruction.
- Clearly labeled sample content on the preview branch for design review.

non-goals:

- Topics, author pages, filtering, pagination, likes, random quote controls, database/CMS entry, quote-entry CLI, or automatic Bluesky syndication.
- Treating standalone quotations as Standard.site documents.
- Changing the production deployment workflow or adding Found Quotes to the primary header.

open assumptions:

- Assumption: The preview should contain representative mock records so the populated archive, home module, search, feeds, permalinks, and Writing composition can be reviewed together.
- Assumption: Mock records are review fixtures, not approved production content; they must be replaced or explicitly approved before merge to `main`.
- Assumption: A named collection with ordering and framing is Writing; a Note may link to a quote but does not own a structured collection.

risks:

- The home page can become too dense; suppress its quote module when the featured Writing already contains the newest quote.
- Long quote text or source URLs can overflow narrow screens; verify at 390px and the 320px floor.
- Standard.site could publish incomplete collection text unless the publisher expands references before authentication and writes.
- Preview fixtures could be mistaken for approved content; label them in both source and rendered output and keep merge readiness explicit.

follow-up type study (2026-09-08):

- Preserve the existing display scale for short quotations that read as one or two lines at desktop width.
- Introduce a smaller reading scale for longer quotations so they feel like deliberate excerpts rather than oversized headlines.
- Review the first four archive entries together; use `great-silence-and-technological-efficiency` as the long-quote exemplar on both the study archive and its permalink.
- Tighten the reading tier's line height and vertical padding without changing the short-quote display tier.
- Model blank-line-separated passages as semantic paragraphs with a compact gap, and allow one exact phrase to receive semantic emphasis without enabling arbitrary quote-body HTML.
- Keep attribution, provenance, dates, colors, and the surrounding page shell unchanged.
