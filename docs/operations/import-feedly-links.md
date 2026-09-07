# Import Feedly saved articles

Feedly saved articles become local Markdown entries in `content/links/`. The static site, not Feedly or ATproto, is the source of truth after import.

The importer accepts either the documented Feedly API or a JSON file with the same stream-response shape. It follows every continuation page, accepts only HTTP(S) destinations, removes common tracking parameters, stores a short plain-text excerpt rather than article content, and skips existing Feedly IDs or normalized target URLs.

## Review the bundled mock import

The repository includes an invented two-page fixture for development and visual review:

```bash
npm run links:sync -- \
  --dry-run \
  --input scripts/fixtures/feedly/two-pages.json \
  --report .context/feedly-links-fixture-report.json
```

The three checked-in mock Link entries are visibly labeled on the site. They are not a real account export and must be removed before a production backfill.

## Import from the Feedly API

Feedly currently limits self-service API tokens, so first obtain a supported token for the account. Keep it in the process environment; never put it in a command argument, source file, report, or Git-tracked environment file.

```bash
export FEEDLY_ACCESS_TOKEN='…'
npm run links:sync -- --dry-run --report .context/feedly-links-backfill.json
```

By default the importer resolves the profile and requests `user/<profile-id>/tag/global.saved`. If the account uses another confirmed saved stream, set `FEEDLY_STREAM_ID` or pass `--stream-id`.

Review the report before writing files. Pay particular attention to rejected destinations, duplicate URLs, save-date fallbacks, and query parameters that might contain private data. The report contains no access token or full article body, but it can contain public article metadata and should remain under the gitignored `.context/` directory.

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

OPML is not a substitute: Feedly's OPML export contains subscriptions, not saved articles. Do not use browser cookies or undocumented private endpoints.

## Validate and publish metadata

Builds require no Feedly credential because the imported Markdown is local:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run test:ui
```

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

This creates a `site.standard.document` for the local Link page and saves its AT URI in frontmatter. It does not create a Bluesky post or private bookmark. Do not publish the bundled mock entries to ATproto.
