# Enrich Link metadata with descriptions and an emergent folksonomy

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

The 2,625 Links imported from Feedly arrived with little usable metadata. On 14 November 2026, 1,035 had an empty description, 1,021 had a 320-character feed excerpt cut off mid-sentence, and every Link carried the single Feedly tag `Saved For Later`. Visitors see that thin metadata on `/links/`, on detail pages, in search, and in the Pagefind tag filter.

After this change, `npm run links:enrich` reads each Link's destination page, writes a one-sentence description and two to five topical tags drawn from the collection's own growing vocabulary, and fills a missing author or publisher from the page. It runs on one Link, a batch, or the whole collection, runs automatically after `npm run links:sync` writes new Links, and can be re-run safely as the collection grows or models change. Values a person wrote are never overwritten, and each machine-written field records where it came from, so a future model can regenerate exactly the fields nobody has touched.

Observable result: `npm run links:enrich -- status` reports the collection's state; an enriched Link's detail page shows the new description and tags (for example `/links/2017/06/06/0-tweets-9f4dfb716d/`); `npm run links:tags` lists the vocabulary and possible duplicate tags.

## Progress

- [x] (2026-11-14 19:05Z) Read the Link content model (`src/lib/content.ts`), the Feedly importer, the destination audit and recovery tools, the deployment and publishing runbooks, and the PR gates.
- [x] (2026-11-14 19:40Z) Implemented the three stages as separate modules under `scripts/link-enrichment/`: fetch and extraction, generation with provider adapters, and persistence with field-level provenance.
- [x] (2026-11-14 20:05Z) Added the command line (`scripts/enrich-links.mjs`), the taxonomy file (`content/link-tags.json`), and the post-import hook in `scripts/sync-feedly-links.mjs`.
- [x] (2026-11-14 20:20Z) Added 40 unit and end-to-end tests; `npm test` passes 163 of 163.
- [x] (2026-11-14 20:40Z) Ran the pipeline against 17 real Links with live page fetches. No model API key was available in the session, so generation used the `file` provider with answers written by the coding agent from the exported prompts. Results are recorded below.
- [x] (2026-11-14 20:53Z) Fixed the defects the live sample exposed (placeholder metadata, generic metadata on thin pages, stale URLs and basis carried between attempts, timestamp-only rewrites, tag reordering), re-verified idempotency, and passed lint, TypeScript, build, and the artifact validator.
- [ ] Ciaran: choose the production model and run a measured batch (`--limit 20 --report`) with a real key.
- [ ] Ciaran: decide whether imported feed excerpts may be replaced (`--replace-excerpts`).
- [ ] Ciaran: run the rest of the collection in batches.

## Surprises & Discoveries

- Observation: Most non-empty descriptions are feed text, not Ciaran's writing, but only some can be recognised as such.
  Evidence: 1,021 descriptions end with the importer's truncation marker (`…`) or Feedly's `…Read more ›`. Another 573 are complete short feed summaries, many of them link-blog commentary by other people (Waxy.org Links 87, Waxy.org 69, ParisLemon 20). Nothing in a file distinguishes those from a hand-written description, so they are treated as authoritative.

- Observation: A 200 response is often not the saved resource.
  Evidence: `why-7-99-beats-0-99` now redirects to the Zombies, Run! home page. The extractor read 296 words of unrelated marketing copy; the existing `semanticMatch` check from the Feedproxy recovery tool rejected it, and the Link was recorded as `insufficient-content` with `fetchIssue: "semantic-mismatch"` instead of being described as a fitness app.

- Observation: Thin pages carry site-wide metadata that looks usable.
  Evidence: The YouTube page for `fun-intro-to-siri-shortcuts` returned a title of "- YouTube" and YouTube's generic site description (23 words), which passed the 20-word fallback threshold. The pipeline now uses a page's description only when the page's title matches the saved title; the Link is recorded as `insufficient-content` without a model call.

- Observation: Publishers emit placeholder strings.
  Evidence: Google's developer blog sets `<meta name="description" content="None">`, and the YouTube page declared a canonical URL of `undefined`, which resolved to `https://www.youtube.com/undefined`. Both are now treated as missing.

- Observation: Re-running a completed sample rewrote timestamps on three Links.
  Evidence: Links whose pages have no byline kept an empty `author`, so every run saw a fillable field and processed them again. Fields left empty by a completed attempt now reopen only on `--re-enrich` or after a failure, and a write whose only differences are timestamps and counters is skipped. A repeated run over the sample now changes no completed Link.

- Observation: One sample request failed because of this container, not the site.
  Evidence: The Stanford PDF (`donald-knuth-on-claude-opus-...`) returned `503 upstream connect error` from the session's network proxy. That Link's file was reverted so Ciaran's first real run classifies it. PDF handling itself (`unsupported-pdf`) is covered by unit tests.

## Decision Log

- Decision: Store provenance in one `enrichment:` front-matter block per Link rather than in a separate database or sidecar file.
  Rationale: Links are Markdown files and Git is the system of record; a sidecar would drift from the files it describes. The site loader already ignores unknown keys, so no schema or UI change is needed. Field values reuse `description`, `tags`, `author`, and `sourceTitle`.
  Date/Author: 2026-11-14 / Claude Code

- Decision: Detect human edits by fingerprinting what the enricher wrote, instead of asking people to mark edits.
  Rationale: Editing a Markdown file by hand is the only editing interface the site has. Any value that no longer matches its fingerprint is treated as human-authored permanently; removed generated tags are remembered as rejected.
  Date/Author: 2026-11-14 / Claude Code

- Decision: Pre-existing descriptions are authoritative; truncated feed excerpts are replaceable only with `--replace-excerpts`.
  Rationale: The brief requires preserving human-authored descriptions, and the files cannot prove which values are imported. Making replacement explicit leaves the choice to Ciaran.
  Date/Author: 2026-11-14 / Claude Code

- Decision: Author and publisher come from page metadata (Open Graph, JSON-LD, meta tags), not from the model.
  Rationale: Deterministic extraction cannot invent a byline. The model writes only the description, tags, and a content type.
  Date/Author: 2026-11-14 / Claude Code

- Decision: Do not update `destinationStatus` or `targetUrl` from enrichment fetches.
  Rationale: Those fields belong to the reviewed audit and recovery tools, which require semantic checks and explicit `--apply` review. Enrichment records its own `httpStatus`, `fetchIssue`, `finalUrl`, `canonicalUrl`, and `duplicateOf` in its block.
  Date/Author: 2026-11-14 / Claude Code

- Decision: Default model `anthropic:claude-opus-5-5` at low effort, configurable to any supported provider.
  Rationale: Opus 5.5 is Anthropic's current default model. The brief also asks to keep costs low; `anthropic:claude-haiku-5-5` costs about 1/40 as much per token. Choosing between them is Ciaran's call after a measured batch, so the runbook gives both and the run summary prints token counts.
  Date/Author: 2026-11-14 / Claude Code

- Decision: Add `@anthropic-ai/sdk` 1.3.0 as an exact-pinned devDependency, loaded only when the Anthropic provider is used.
  Rationale: The official SDK handles retries, credentials (including `ant auth login` profiles), and typed errors. Like the other link tools, enrichment runs locally and the site build never imports it. The OpenAI-compatible adapter uses `fetch` and adds no dependency.
  Date/Author: 2026-11-14 / Claude Code

- Decision: Enrichment after `links:sync` runs as a child process after the import completes, not inline.
  Rationale: A model or network failure must not block or undo an import. The slug list is kept under `.context/` for a retry.
  Date/Author: 2026-11-14 / Claude Code

## Outcomes & Retrospective

The enrichment system is complete for Priority 1 and 2 of the brief and covers most of Priority 3 (tag consolidation suggestions, selective re-enrichment, content-change detection, and metadata extraction). Related-resource discovery is not implemented.

The live sample exercised every path except a real model call. Its descriptions and tags were written by the coding agent from the exported prompts, using only the material each prompt contained, and they pass the same validation a model's answer would. They carry `model: "file:sample-responses.json"`, so `npm run links:enrich -- --stale --apply` regenerates them with the configured model while preserving any edits made in the meantime.

Remaining gaps: no measured cost or quality figures for a real model; PDFs are not parsed (they fall back to metadata and the saved excerpt); there is no scheduled job, so Links added outside `links:sync` wait for the next `--missing` run; and published `site.standard.document` records keep their old descriptions until republished.

## Context and Orientation

- `content/links/*.md`: one Markdown file per Link, written by `scripts/sync-feedly-links.mjs`. Front-matter fields are listed in `LinkEntry` in `src/lib/content.ts`. Unknown keys are ignored by the loader.
- `src/components/LinkList.astro` and `src/pages/links/[year]/[month]/[day]/[slug].astro` render `description` and `tags`.
- `scripts/recover-feedproxy-links.mjs` exports `semanticMatch`, `plainText`, and `recordableHttpUrl`, which enrichment reuses.
- `docs/operations/import-feedly-links.md` is the import runbook; `docs/operations/enrich-links.md` is the new enrichment runbook.

## Plan of Work

1. `scripts/link-enrichment/extract.mjs`: HTML to text without navigation, ads, comments, or hidden elements; Open Graph, JSON-LD, canonical, and language metadata; content hash.
2. `scripts/link-enrichment/fetch.mjs`: bounded fetch with redirect following, failure categories, retry classification, and per-host pacing.
3. `scripts/link-enrichment/cache.mjs`: page and generation cache under `.context/link-enrichment/`.
4. `scripts/link-enrichment/vocabulary.mjs`: tag normalisation, vocabulary counts, aliases, ignored tags, duplicate suggestions.
5. `scripts/link-enrichment/generate.mjs` and `providers.mjs`: prompt, JSON schema, validation with one corrective retry, and the Anthropic, Chat Completions, file, and fake adapters.
6. `scripts/link-enrichment/persist.mjs`: provenance rules and surgical front-matter rewriting with a parse-back check.
7. `scripts/link-enrichment/pipeline.mjs` and `scripts/enrich-links.mjs`: selection, orchestration, status, and the command line.
8. `scripts/sync-feedly-links.mjs`: run enrichment for newly written Links, with `--no-enrich`.
9. Tests beside each module; runbook; `AGENTS.md` pointer.

## Concrete Steps

From the repository root:

    npm ci
    npm test
    npm run lint
    npx tsc --noEmit
    npm run build
    npm run links:validate-artifact

Live sample (writes only under `.context/` until `--apply`):

    npm run links:enrich -- --slugs-file .context/link-enrichment/sample.txt --model fake:x --export-requests .context/link-enrichment/sample-requests.jsonl
    npm run links:enrich -- --slugs-file .context/link-enrichment/sample.txt --model file:.context/link-enrichment/sample-responses.json --apply
    npm run links:enrich -- --failed --model file:.context/link-enrichment/sample-responses.json --apply
    npm run links:enrich -- --slugs-file .context/link-enrichment/sample.txt --model file:.context/link-enrichment/sample-responses.json --apply   # expect no changes to completed Links

## Validation and Acceptance

Sample of 17 Links, chosen for coverage. "Kept" means the description already had a value and was not changed.

| Link | Case | Outcome | Description | Tags added |
|---|---|---|---|---|
| `0-tweets` | empty description, blog post | enriched, page | generated | social-media, twitter, personal-archives, ephemerality |
| `1-000-chrome-experiments-and-counting` | empty, publisher meta says "None" | enriched, page | generated | creative-coding, web-platform, javascript, digital-art |
| `can-coding-agents-relicense-open-source...` | empty, 2026 post | enriched, page | generated | coding-agents, open-source, software-licensing, copyright |
| `1125-in-which-a-bean-is-juiced` | comic, 9 words of page text | enriched, metadata | generated | webcomics, humor |
| `168-hours-what-i-ve-learned...` | truncated excerpt, missing author | enriched, page | kept; author filled from byline | time-tracking, productivity, habits |
| `15-ahrefs-mcp-use-cases...` | excerpt ending "Read more ›" | enriched, page | kept | model-context-protocol, search-engine-optimization, ai-assistants, prompting |
| `1995-vannevar-bush-symposium-closing-panel` | long transcript, redirect | enriched, page | kept | computing-history, user-interfaces, hypertext, human-computer-interaction |
| `13-year-old-becomes-first-person...` | another person's commentary, paywalled page | enriched, metadata | kept | video-games, tetris, competitive-gaming |
| `twitter-sort` | GitHub repository, link-blog commentary | enriched, page | kept | sorting-algorithms, twitter, programming-humor, crowdsourcing |
| `a-i-isn-t-people` | newsletter with saved subtitle | enriched, page | kept | artificial-intelligence, large-language-models, media-criticism |
| `a-business-with-no-end` | New York Times, access restricted | enriched, excerpt | kept | e-commerce, internet-culture, journalism |
| `2-different-kinds-of-personal-assistants...` | dead host | enriched, excerpt | kept | personal-assistants, artificial-intelligence, serendipity |
| `10-most-innovative-hopscotch-games-of-2015` | timed out | enriched, excerpt | kept | creative-coding, coding-education, game-design |
| `why-7-99-beats-0-99` | owner tag `toread`, redirects to unrelated site | insufficient-content | kept | none |
| `fun-intro-to-siri-shortcuts` | YouTube, only generic metadata | insufficient-content | empty | none |
| `10-great-twitter-tools...` | broken Feedproxy link | failed, broken, not retryable | empty | none |
| `donald-knuth-on-claude-opus...` | PDF | proxy 503 in this container; file reverted | n/a | n/a |

Checks against the brief:

1. Description accuracy: each generated description was written only from its prompt's material. They are not evidence of a model's quality; a measured batch is still needed.
2. Tag relevance and reuse: 41 topical tags across 13 Links. `creative-coding`, `artificial-intelligence`, and `twitter` are each used twice; no duplicate suggestions.
3. Preservation: no pre-existing description, author, source, or tag was changed. A hand edit made after enrichment (on `0-tweets`, then reverted) was reported as `human`, and a dry `--re-enrich` left the description alone, kept an added tag, and did not restore a removed one.
4. Failures: broken, timed-out, unreachable, access-restricted, rate-limited, and mismatched pages were each recorded with a category; none was deleted or retargeted.
5. Idempotency: a repeated run over the sample left all 13 enriched Links byte for byte unchanged; `--missing` selects none of them.
6. Cost and time: fetching and extracting 17 pages took 16.9 seconds with per-host pacing. Exported prompts averaged 7,026 characters (minimum 3,382, maximum 12,664). Model cost was not measured.

Command results on the final tree: `npm test` 163 passed, 0 failed; `npm run lint` 0 errors, 0 warnings, 0 hints (158 files); `npx tsc --noEmit` exit 0; `npm run build` exit 0; `npm run links:validate-artifact` 2,625 detail pages, 1,363 archive pages, at most 50 rows. `npx playwright test` passed 118 of 122 functional and visual checks, but the visual comparisons are not evidence here: the committed baselines are macOS images, so this Linux container generated its own and compared against them (the generated files were deleted). The 4 failures (the Found Quote type study and the projects card copy, desktop and mobile) fail identically on unmodified `main` at `5895cf2`.

## Idempotence and Recovery

Every content-changing command is a dry run without `--apply`. Each Link is written atomically and only if the file is unchanged since the run read it. Re-running any selection is safe. A run stopped by a provider error writes nothing for the Link in progress; rerun the same command. To undo enrichment on a Link, revert its file with Git; deleting only the `enrichment:` block would make machine-written values look human-authored.

## Artifacts and Notes

Sample inputs and reports are under the gitignored `.context/link-enrichment/` and are not committed, because they contain third-party page text.

    $ npm run links:enrich -- status
    "statuses": { "enriched": 13, "not-attempted": 2609, "failed": 1, "insufficient-content": 2 }
    "missingDescription": 1031, "withoutTopicalTags": 2612, "topicalTags": 41

## Interfaces and Dependencies

- New devDependency: `@anthropic-ai/sdk` 1.3.0 (exact pin).
- New npm scripts: `links:enrich`, `links:tags`; `npm test` also runs `scripts/link-enrichment/*.test.mjs`.
- New file: `content/link-tags.json` (`ignored`, `aliases`, `distinct`, `interests`).
- New front-matter key on Links: `enrichment` (documented in `docs/operations/enrich-links.md`).
- `scripts/sync-feedly-links.mjs`: new `--no-enrich` flag and exported `enrichNewLinks`.
- Environment: `LINK_ENRICH_MODEL`, `LINK_ENRICH_EFFORT`, `LINK_ENRICH_BASE_URL`, `LINK_ENRICH_API_KEY`, and the provider's own key variable.

## Change Log

- 2026-11-14: Created the plan, implemented the system, ran the 17-Link sample, and recorded results.
