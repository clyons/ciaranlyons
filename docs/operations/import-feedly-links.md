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
