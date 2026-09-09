# Recover definitively unreachable Link destinations

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Visitors to `/links/` should be sent to a usable original article when any historical destination is definitively unreachable. The initial live audit identified 1,016 such records, including 562 Google Feedproxy URLs returning HTTP 404. This work will safely replace destinations that can be proven to resolve to the saved article, retain an Internet Archive fallback when a live original cannot be proven, and record a repeatable audit/remediation tool for the remaining broken outbound links.

The result is observable by running the recovery tool in dry-run mode, reviewing its CSV/JSON report, applying only high-confidence replacements, and verifying that every changed `targetUrl` either responds successfully, is an explicit archived snapshot, or is a documented historical publisher URL replacing a defunct intermediary. Existing Link permalinks and handwritten commentary must remain unchanged. Destination audit status and timestamp fields may be added without changing the visible page.

## Progress

- [x] (2026-09-08 18:00Z) Completed a live audit of all 2,625 Link destinations: 562 Feedproxy URLs return HTTP 404.
- [x] (2026-09-08 18:04Z) Created this ExecPlan and began recovery-source feasibility testing.
- [x] (2026-09-08 21:09Z) Proved FeedBurner source feeds can supply exact-title publisher URLs and verified five candidate destinations with HTTP 200 responses.
- [x] (2026-09-08 21:14Z) Implemented the dry-run-by-default Feedproxy recovery tool, focused unit coverage, package command, and operations documentation.
- [x] (2026-09-08 21:16Z) Applied the five independently validated high-confidence replacements and confirmed a repeat dry run proposes zero additional changes.
- [x] (2026-09-08 21:18Z) Completed final test, lint, build, diff, and live destination validation.
- [x] (2026-09-08 21:22Z) Added and applied a Tumblr post-ID recovery rule for 43 `timoni` records; every resulting permalink returned HTTP 200.
- [x] (2026-09-08 21:24Z) Added and applied a published-date-and-slug recovery rule for 24 Seth's Blog records; every resulting permalink returned HTTP 200.
- [x] (2026-09-09 04:56Z) Exercised archive-index lookup, publisher-native discovery, and exact-title web search against every still-unresolved member of a 1,023-item baseline superset of the original 1,016.
- [x] (2026-09-09 04:57Z) Applied 540 semantically verified replacements: 259 live publisher URLs and 281 Internet Archive snapshots.
- [x] (2026-09-09 04:58Z) Produced `.context/link-recovery-ledger.json`; all 516 unresolved baseline-superset records have explicit archive and web-search outcomes.
- [x] (2026-09-09 10:05Z) Replaced 33 remaining Feedproxy intermediaries with strongly reconstructed historical publisher URLs, leaving 215 Feedproxy records for which no defensible original destination is known.
- [x] (2026-09-09 10:10Z) Added `destinationStatus` and `destinationLastCheckedAt` to all 2,625 Links and rendered `rel="nofollow"` for every state other than `verified`.
- [x] (2026-09-09 10:18Z) Added a privacy-reviewed durable ledger for all 516 unresolved records and prevented audit reports from retaining credential-bearing redirect parameters.

## Surprises & Discoveries

- Observation: The current Feedproxy endpoint is not merely redirecting differently; 562 imported destinations return HTTP 404.
  Evidence: The live audit performed on 2026-09-08 followed redirects for all 2,625 `content/links/*.md` targets. `feedproxy.google.com` accounted for 562 of 852 HTTP 404 outcomes.

- Observation: A representative Internet Archive CDX request did not return within 30 seconds from this environment.
  Evidence: `curl --max-time 30` against `https://web.archive.org/cdx/search/cdx` for the LukeW/Functioning Form Feedproxy target timed out with zero bytes. Archive access must therefore be treated as an unreliable optional source and the tool must be resumable.

- Observation: A live FeedBurner feed is useful but intentionally incomplete historical recovery evidence.
  Evidence: The first all-record dry run selected 563 Feedproxy source files and found exactly five candidates with a single exact normalized title in their source feed; 558 records had no exact title match. The tool therefore does not infer URLs from source names, slugs, or web-search results.

- Observation: The Internet Archive availability API was usable even though the CDX endpoint had timed out.
  Evidence: The all-record archive pass selected 959 broken or unavailable destinations, semantically validated 225 snapshots, and recorded 734 unresolved outcomes (671 without a snapshot, 50 semantic mismatches, and 13 timeouts).

- Observation: Publisher-owned identifiers and indexes recovered substantially more than generic search.
  Evidence: Stable Tumblr IDs, date/title URL schemes, WordPress search APIs, consolidated publisher archives, and migrated Google blog patterns recovered Feedproxy groups including Timoni, Seth's Blog, ParisLemon, Dullneon, Kevin Kelly, LukeW, Wondermark, Subtraction, QuickSprout, Google Search Central, A List Apart, Buffer, Inside Facebook, Less Doing, and others.

- Observation: A next-day `origin/main` re-audit found 1,023 definitive failures, seven more than the original 1,016-item audit.
  Evidence: The reconstructed baseline contained 857 HTTP 404s, 3 HTTP 410s, 147 DNS failures, 9 redirect loops, 4 TLS failures, 1 refused connection, and 2 `ENETUNREACH` results. The ledger uses this 1,023-item superset so the original 1,016 are necessarily covered despite overnight status drift.

## Decision Log

- Decision: Make no bulk content mutation until a recovery candidate is independently verified against the saved title/source and responds successfully.
  Rationale: A dead redirect URL is not enough evidence to safely substitute a different article. Preserving a dead link is preferable to sending readers to unrelated content.
  Date/Author: 2026-09-08 / Codex

- Decision: Prefer a current publisher URL; use an Internet Archive snapshot only when the snapshot represents the saved target and no reachable original can be proven.
  Rationale: The original article destination is best for readers, while an archive snapshot preserves access without pretending it is a current publisher URL.
  Date/Author: 2026-09-08 / Codex

- Decision: Scope mutation to semantically proven replacements, while attempting recovery for all 1,016 definitive failures.
  Rationale: `401`, `403`, rate limits, and timeouts can be bot or account restrictions rather than reader-visible link rot. DNS failures, redirect loops, TLS failures, refused connections, 404s, and 410s are the definitive baseline; a candidate is written only after its title and, where available, excerpt match the saved record.
  Date/Author: 2026-09-08 / Codex

- Decision: Require an explicit `--apply` flag; make dry-run the command default.
  Rationale: Recovery is a content mutation based on remote evidence. An intentional apply command plus a JSON report makes each small batch reviewable and prevents accidental edits during a future audit.
  Date/Author: 2026-09-08 / Codex

- Decision: Apply the five FeedBurner exact-title candidates and retain the other 558 original targets.
  Rationale: Each applied candidate originated in the identified feed and reached a successful final URL. No evidence sufficient to select a single replacement exists for the remaining records.
  Date/Author: 2026-09-08 / Codex

## Outcomes & Retrospective

The completed repair changes 573 Link destinations: 259 verified live publisher URLs, 281 semantically validated Internet Archive snapshots, and 33 strongly reconstructed historical publisher URLs whose current state remains untrusted. The recovery methods were deliberately independent: live FeedBurner exact-title feeds; stable publisher identifiers and date/slug reconstruction; publisher-owned WordPress APIs and archive indexes; Internet Archive availability plus snapshot-content checks; Common Crawl index probes; and exact-title web search through the search tool, DuckDuckGo, and Bing.

The reconstructed `origin/main` baseline is a 1,023-item superset of the original 1,016 because five more URLs returned 404 and two returned `ENETUNREACH` on the next-day audit. Of that superset, 507 now have usable replacements and 516 remain unresolved at the article-content level. Every one of those 516 has both an Internet Archive lookup outcome and a strict exact-title web-search outcome in `.context/link-recovery-ledger.json`; no semantically ambiguous result was treated as verified. Of those unresolved records, 33 now point at a strongly reconstructed historical publisher path instead of Feedproxy, while 215 remain on Feedproxy because no defensible original target is known. A further 33 changed destinations came from the broader broken-or-unavailable archive queue and were semantically verified before mutation.

All 2,625 Link files now record `destinationStatus` and `destinationLastCheckedAt`. The 1,800 verified destinations retain an ordinary external relationship. The other 825—broken, unavailable, semantically mismatched, or access-restricted—render `rel="external nofollow"`, providing a non-visual trust policy and a future hook for warnings or hiding.

The strict full search pass produced only one safe additional result. It also exposed why title-only matching is unsafe: generic results for “Arduino” and “Glass” passed loose token coverage but represented different pages, so they were rejected and the search acceptance rule was tightened to require the full saved title plus excerpt/page agreement.

## Context and Orientation

This Astro 7 static site loads each Markdown file under `content/links/` in `src/lib/content.ts`. A Link’s `targetUrl` is its outbound destination; local Link permalinks are derived from the immutable local saved date and slug. `src/pages/links/[year]/[month]/[day]/[slug].astro` and `src/components/LinkList.astro` render the outbound anchor directly from that property.

The 2,625 entries were imported from Feedly. Older feed records often retained Google’s RSS redirect URL (`http://feedproxy.google.com/~r/...`) rather than the publisher’s canonical URL. The original Feedly export is not a build dependency and must not be required for recovery. `scripts/sync-feedly-links.mjs` is the existing safe importer precedent; it parses frontmatter-compatible link data, performs dry runs, and avoids destructive rewrites.

Recovery requires public external data. Potential sources are an archived capture of the Feedproxy HTTP redirect (which can contain the original `Location` destination), archived feed XML/item metadata, publisher search pages, and exact-title search results. A candidate is valid only if it has a strong connection to the saved entry: a captured redirect location, exact title plus matching source/author/date, or an archived snapshot of the exact saved target. URLs must be HTTP(S), must not contain credentials, and must respond as a usable final destination when checked.

## Plan of Work

### Milestone 1: Establish safe recovery evidence

Probe representative Feedproxy records from different source feeds against archive indexes and direct snapshot retrieval. Identify the least fragile public source and its response shape. Add that finding to `Surprises & Discoveries`. The acceptance criterion is a reproducible command that produces at least one candidate with enough evidence to distinguish it from an unrelated article.

### Milestone 2: Add a recovery/audit utility

Create `scripts/recover-feedproxy-links.mjs` with exported pure helpers and `scripts/recover-feedproxy-links.test.mjs`. The command must:

- select only `content/links/*.md` with Feedproxy targets by default;
- accept `--dry-run`, an explicit `--apply`, `--report`, `--limit`, and a deterministic `--slug` filter;
- record source evidence, candidate URL, validation status, and confidence without persisting credentials or article bodies;
- never edit a file by default, and edit only a single `targetUrl` scalar for validated candidates when explicitly invoked without `--dry-run`;
- write all reports only to a caller-supplied path, which operational documentation will direct to gitignored `.context/`;
- preserve atomicity and leave a file unchanged on parser, network, or validation failure.

The initial implementation records unresolved entries when no exact FeedBurner title match is available. A later source integration may add reviewable archive-snapshot candidates, but it must not scrape search-engine result pages or apply title-only guesses automatically.

### Milestone 3: Review, apply, and validate

Run the tool against all Feedproxy URLs in dry-run mode. Review all proposed changes, apply only candidates at the tool’s strongest confidence level, then recheck changed targets and run repository validations. Leave unavailable or ambiguous entries intact and report them explicitly for manual review.

## Concrete Steps

From the repository root:

    node scripts/recover-feedproxy-links.mjs --dry-run --report .context/feedproxy-recovery.json
    npm test
    npm run lint
    npm run build

Before an apply run, inspect the report’s candidate URL, evidence, source timestamp, and response status. Then run:

    node scripts/recover-feedproxy-links.mjs --report .context/feedproxy-recovery-applied.json

Repeat the dry run. It should propose zero additional replacements for the entries already updated. Run a bounded live checker over every changed `targetUrl`; expected result is a successful final HTTP response or a documented, intentionally retained unresolved entry.

## Validation and Acceptance

Success requires all of the following:

- Unit tests cover Feedproxy selection, URL validation, confidence thresholds, frontmatter-only replacement, dry-run behavior, failure handling, and idempotent reruns.
- Every changed Link has the same slug, local date path, title, feedly ID, source metadata, and body as before; only `targetUrl` and destination-audit metadata change.
- Each changed destination is tested with redirect following and receives a successful final HTTP response. If a candidate is a Wayback snapshot, it must render the saved article rather than an archive error page.
- `npm test`, `npm run lint`, and `npm run build` succeed from `/Users/ciaran/conductor/workspaces/ciaranlyons/montpellier-v1`.
- The final report distinguishes applied direct URLs, applied archive snapshots, unverified candidates, source/tool failures, and unchanged entries.

## Idempotence and Recovery

Dry runs never write content. Apply mode will use an atomic replacement of the one frontmatter `targetUrl` line after re-reading and validating the file. It will skip a file when its target has changed since the report or when the target is no longer Feedproxy. Re-running after a successful apply skips the updated file, so it is safe to resume after interruption.

To roll back a reviewed batch, restore only the affected `targetUrl` values from the JSON report; do not replace complete Markdown files, as that could remove manual commentary or later metadata. If a recovery source is unavailable, retain the original target and record the failure rather than fabricating a replacement.

## Artifacts and Notes

Initial audit (2026-09-08): 2,625 targets checked; 1,424 successful (`200`/`206`); 852 `404`; 3 `410`; 147 DNS failures; 9 redirect loops. Feedproxy was the largest single source of confirmed failures, with 562 `404` responses.

Raw generated reports are local operational artifacts and must be stored under `.context/`, never committed. They can be large, can contain fetched redirect details, and should not be treated as source content. The compact, privacy-reviewed handoff is `.agent/execplans/2026-09-08-recover-feedproxy-link-destinations-ledger.json`; it intentionally excludes fetched bodies and credential-bearing query parameters.

Recovery run evidence (2026-09-08):

    npm run links:recover-feedproxy -- --report .context/feedproxy-recovery.json
    { "dryRun": true, "selected": 563, "recovered": 5, "unresolved": 558 }

    npm run links:recover-feedproxy -- --apply --report .context/feedproxy-recovery-applied.json
    { "dryRun": false, "selected": 563, "recovered": 5, "unresolved": 558 }

    npm run links:recover-feedproxy -- --report .context/feedproxy-recovery-after.json
    { "dryRun": true, "selected": 558, "recovered": 0, "unresolved": 558 }

    npm run links:recover-feedproxy -- --report .context/feedproxy-recovery-timoni.json
    { "dryRun": true, "selected": 558, "recovered": 43, "unresolved": 515 }

    npm run links:recover-feedproxy -- --report .context/feedproxy-recovery-seth.json
    { "dryRun": true, "selected": 515, "recovered": 24, "unresolved": 491 }

Complete-run evidence (2026-09-09):

    npm run links:recover-archive -- --audit .context/link-destination-audit-semantic.json --report .context/link-archive-recovery.json
    { "selected": 959, "recovered": 225, "unresolved": 734 }

    # Three resumable strict-search batches covered the 734 archive-unresolved records.
    { "selected": 734, "recovered": 1, "unresolved": 581, "skipped": 152 }

    .context/link-recovery-ledger.json
    { "baselineBroken": 1023, "resolved": 507, "remaining": 516,
      "archiveAttempted": 516, "searchAttempted": 516, "bothAttempted": 516 }

    .context/link-destination-audit-effective-final.json
    { "total": 2625, "verified": 1800, "broken": 516, "unavailable": 10,
      "semanticMismatch": 162, "accessRestricted": 137 }

All 540 changed destinations are `verified` in the effective final audit: 259 live publisher URLs and 281 Internet Archive snapshots. A high-concurrency audit temporarily received `ECONNREFUSED` for 54 Wayback snapshots; a concurrency-two retry returned HTTP 200 and repeated semantic validation for all 54. Four locale-sensitive Google Search Central destinations were also explicitly rechecked with `?hl=en` and exact-title matches.

    .context/link-destination-audit-for-annotation.json
    { "total": 2625, "verified": 1800, "broken": 501, "unavailable": 10,
      "semanticMismatch": 175, "accessRestricted": 139 }

The annotation audit incorporates a fresh check of the 33 reconstructed publisher destinations. It classifies 18 as broken, 13 as semantic mismatches, and 2 as access-restricted. The annotation apply selected all 2,625 files; its immediate repeat dry run reported zero changes. A built-artifact check confirmed all 1,800 verified detail-page anchors use `rel="external"` and all 825 non-verified anchors use `rel="external nofollow"`.

    .agent/execplans/2026-09-08-recover-feedproxy-link-destinations-ledger.json
    { "unresolved": 516, "canonicalizedAwayFromFeedproxy": 33, "stillFeedproxy": 215 }

This checked-in ledger is sufficient to resume future recovery without repeating failed Archive and strict-search attempts blindly. Raw `.context/` reports are deliberately non-durable. Audit URL recording removes credential-like query parameters; 35 such parameters found in local redirect results were removed before preparing the durable artifact.

Final repository validation (2026-09-09):

    npm test
    94 tests passed

    npm run lint
    Result (116 files): 0 errors, 0 warnings, 0 hints

    npm run build
    Build completed; 4,067 pages generated; Pagefind indexed 2,662 pages

    git diff --check
    no whitespace errors

An invariant check confirms all 2,625 rendered Link detail pages agree with their frontmatter trust status and every Link has a last-checked timestamp.

## Interfaces and Dependencies

- `content/links/*.md`: Link frontmatter files. `targetUrl` is a required HTTP(S) string.
- `src/lib/content.ts`: validates and exposes Link entries; any changed target must remain valid under `optionalHttpUrl`.
- `scripts/recover-feedproxy-links.mjs`: proposed Node ESM CLI and pure helper exports; built-in `fetch`, `gray-matter`, and Node filesystem APIs are sufficient. Do not add a new runtime dependency solely for recovery.
- Internet Archive and publisher hosts: untrusted remote inputs. Enforce timeouts, bounded concurrency, URL protocol checks, redirects, and no credential-bearing URLs.

## Change Log

- 2026-09-08: Created plan for recovery of the 562 proven-dead Feedproxy destinations.
- 2026-09-08: Added conservative FeedBurner exact-title recovery and applied five validated destinations.
- 2026-09-09: Expanded the work to every definitive failure, added full audit, Internet Archive, publisher-native, Common Crawl, and strict web-search passes, and produced a per-link completion ledger.
- 2026-09-09: Canonicalized 33 additional Feedproxy URLs, persisted audit metadata for the complete collection, and added conditional `nofollow` rendering for untrusted destinations.
- 2026-09-09: Added the compact durable unresolved ledger and sanitized recorded redirect URLs.
