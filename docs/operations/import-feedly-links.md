# Import Feedly saved articles

Feedly saved articles become local Markdown entries in `content/links/`. The static site, not Feedly or ATproto, is the source of truth after import.

The importer accepts either the documented Feedly API or a JSON file with the same stream-response shape. It follows every continuation page, accepts only HTTP(S) destinations, removes common tracking parameters and `access_token` query values, stores a short plain-text excerpt rather than article content, and skips existing Feedly IDs or normalized target URLs.

## Exercise the bundled fixture

The repository includes an invented two-page fixture for development and visual review:

```bash
npm run links:sync -- \
  --dry-run \
  --input scripts/fixtures/feedly/two-pages.json \
  --report .context/feedly-links-fixture-report.json
```

The fixture is invented and exists only to exercise parsing, pagination, duplicate handling, unsafe-URL rejection, and dry-run behavior. It is not a real account export.

## Import from the Feedly API

Feedly currently limits self-service API tokens, so first obtain a supported token for the account. Keep it in the process environment; never put it in a command argument, source file, report, or Git-tracked environment file.

```bash
export FEEDLY_ACCESS_TOKEN='…'
npm run links:sync -- --dry-run --report .context/feedly-links-backfill.json
```

By default the importer resolves the profile and requests `user/<profile-id>/tag/global.saved`. If the account uses another confirmed saved stream, set `FEEDLY_STREAM_ID` or pass `--stream-id`.

Review the report and a CSV before writing files. Pay particular attention to rejected destinations, duplicate URLs, save-date fallbacks, and query parameters that might contain private data. The report and CSV contain no Feedly credential or full article body, but they contain article metadata and must remain under the gitignored `.context/` directory.

```bash
npm run links:sync -- --dry-run \
  --input .context/feedly-saved-browser-export.json \
  --report .context/feedly-links-backfill.json \
  --csv .context/feedly-saved-articles.csv
chmod 600 .context/feedly-saved-browser-export.json \
  .context/feedly-links-backfill.json \
  .context/feedly-saved-articles.csv
```

CSV fields are RFC 4180 quoted, and values beginning with spreadsheet formula characters are prefixed with an apostrophe. The current reviewed export contains 2,633 source saves, 2,625 publishable Links, eight duplicate destinations, and no rejected or fallback-dated items. Eight Stratechery URLs contained subscriber `access_token` query values; normalization strips them, which reveals the eighth duplicate.

After review:

```bash
npm run links:sync
npm run links:sync -- --dry-run
```

The second command should report zero new writes. Existing files are never overwritten, so manual commentary and `standardUri` metadata are preserved. To retry a single bad pre-publication import, remove only its named `content/links/<slug>.md` file after confirming it has no manual changes, correct the source/transformation, and rerun.

## Repair legacy Feedproxy destinations

Some historical Feedly records contain a Google Feedproxy redirect rather than the publisher URL. First generate a review report; the command is dry-run by default and never changes content unless `--apply` is supplied:

```bash
npm run links:recover-feedproxy -- --report .context/feedproxy-recovery.json
```

The recovery tool uses exact-title FeedBurner items and known publisher-owned identifiers, URL schemes, APIs, and archive indexes. It proposes a replacement only after the destination responds successfully and its rendered title or text agrees with the saved Link metadata. Review every proposed `oldTargetUrl`, `targetUrl`, evidence, and validation result before applying a batch:

```bash
npm run links:recover-feedproxy -- --apply --report .context/feedproxy-recovery-applied.json
```

Use `--slug <slug>` or `--limit <N>` for a narrow, reviewable batch. An unresolved record is intentionally left unchanged. The JSON reports belong under gitignored `.context/` and should not be committed.

For a complete destination audit, including non-Feedproxy Links, run:

```bash
npm run links:audit -- \
  --report .context/link-destination-audit.json
```

The audit follows redirects, bounds response size and request duration, and checks successful pages against the saved title and description. It distinguishes verified pages, semantic mismatches, access restrictions, definitive failures, and transient unavailability. A `200` response is not sufficient by itself.

After reviewing a complete audit, persist its non-visual status and check timestamp into every Link. The command is a dry run unless `--apply` is explicit, and refuses to annotate any destination that has changed since the audit:

```bash
npm run links:annotate -- \
  --audit .context/link-destination-audit.json
npm run links:annotate -- \
  --apply \
  --audit .context/link-destination-audit.json
```

This writes `destinationStatus` and `destinationLastCheckedAt` frontmatter. The current UI does not display either field. Outbound anchors for anything other than `verified` use `rel="nofollow"`; the metadata can later support a warning or visibility policy without another crawl.

Internet Archive recovery consumes that audit and remains a dry run unless `--apply` is supplied. Prefer applying a saved, reviewed report so the exact candidate set is preserved:

```bash
npm run links:recover-archive -- \
  --audit .context/link-destination-audit.json \
  --report .context/link-archive-recovery.json
npm run links:recover-archive -- \
  --apply-reviewed .context/link-archive-recovery.json
```

Each proposed snapshot is fetched and semantically checked; the availability API alone is not enough. The tool leaves a destination unchanged when no snapshot exists, the snapshot is unavailable, or its content does not agree with the saved metadata.

Strict web search is a last recovery pass over the archive report's unresolved records. It queries the exact saved title plus source, checks only a title-agreeing top result, fetches that page, and requires title and content agreement. Search results are never applied from a live run; review the report and apply it explicitly:

```bash
npm run links:recover-search -- \
  --input .context/link-archive-recovery.json \
  --report .context/link-search-recovery.json
npm run links:recover-search -- \
  --apply-reviewed .context/link-search-recovery.json
```

Use `--offset`, `--limit`, and low `--concurrency` values to make the externally rate-limited archive and search passes resumable. Keep unresolved original destinations rather than substituting a merely similar page.

The durable unresolved recovery history is stored in `.agent/execplans/2026-09-08-recover-feedproxy-link-destinations-ledger.json`. Consult it before repeating Archive or web-search work. Raw crawl reports remain gitignored under `.context/`; do not commit them because redirect details may contain short-lived credentials even though the audit tools sanitize recorded URLs.

If API access is unavailable, provide a supported Feedly JSON export instead:

```bash
npm run links:sync -- --dry-run --input /path/to/feedly-export.json
npm run links:sync -- --input /path/to/feedly-export.json
```

OPML is not a substitute: Feedly's OPML export contains subscriptions, not saved articles. A user-directed, one-time browser-session acquisition may store the Feedly stream response under `.context/` when supported export paths are unavailable, but it must keep the web token in memory, send it only to Feedly over HTTPS, and never persist a cookie, token, or authorization header. The importer and production build must remain independent of Chrome.

## Validate and publish metadata

Builds require no Feedly credential because the imported Markdown is local:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run links:validate-artifact
npm run test:ui
```

The built archive is static and paginated at 50 Links per page. Page one keeps each existing archive URL; later pages use `/page/<N>/`. Pagefind indexes only detail content and loads result data in bounded slices, so `/links/` and `/search/` never ship the full collection as a hidden DOM or JSON payload. Both feeds contain at most the latest 50 Links.

ATproto publication is a separate, explicit operation. Review a dry run first:

```bash
npm run standard:publish -- --dry-run --type links
```

For a reviewed live canary, supply a revocable app password securely and publish one slug:

```bash
ATPROTO_DID='did:plc:…' \
ATPROTO_APP_PASSWORD='…' \
npm run standard:publish -- --type links --slug '<reviewed-link-slug>'
```

After verifying that canary's deployed local page and public AT URI, publish the remaining records in resumable batches:

```bash
ATPROTO_DID='did:plc:…' \
ATPROTO_APP_PASSWORD='…' \
npm run standard:publish -- --type links --missing-only --limit 100
```

Candidates are ordered by local path. Each successful `site.standard.document` URI is written atomically before the next record, so rerunning the same command continues with files that still lack `standardUri`. This does not create a Bluesky post or private bookmark. Keep the canary and every batch separate from site deployment.
