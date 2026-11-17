# Enrich Link metadata

`npm run links:enrich` fills in descriptions, tags, and page metadata for Links in `content/links/`. It reads each destination page, asks a configurable model for a one-sentence description and two to five tags drawn from the collection's own vocabulary, and writes the result into the Link's front-matter. It never deletes a Link, never changes a `targetUrl`, and never overwrites a value a person wrote.

Every content-changing command is a dry run unless `--apply` is given. Dry runs fetch pages and call the model, then cache both under the gitignored `.context/link-enrichment/`, so the `--apply` run that follows reuses them instead of paying again.

## Quick reference

| Task | Command |
|---|---|
| See what needs work | `npm run links:enrich -- status` |
| Enrich one Link | `npm run links:enrich -- --slug <slug> --apply` (or `--url <targetUrl>`) |
| Enrich every Link never enriched | `npm run links:enrich -- --missing --apply` |
| Enrich in resumable batches | `npm run links:enrich -- --missing --limit 100 --apply`, repeated |
| Process the whole collection | `npm run links:enrich -- --all --apply` |
| List failures | `npm run links:enrich -- failures` |
| Retry transient failures | `npm run links:enrich -- --failed --apply` |
| Retry every failure, including broken pages | `npm run links:enrich -- --failed --include-permanent --apply` |
| Regenerate machine-written fields for one Link | `npm run links:enrich -- --slug <slug> --re-enrich --apply` |
| Regenerate after changing the model or prompt | `npm run links:enrich -- --stale --apply` |
| Refetch and regenerate only where the page changed | `npm run links:enrich -- --changed --apply` |
| Inspect one Link's metadata and provenance | `npm run links:enrich -- show <slug>` |
| View the tag vocabulary and possible duplicates | `npm run links:tags` |
| Merge one tag into another, after review | `npm run links:enrich -- merge-tags --from ai-agent --to ai-agents --apply` |
| Record two similar tags as intentionally distinct | `npm run links:enrich -- keep-distinct ux user-experience --apply` |

Selection flags (`--missing`, `--failed`, `--stale`, `--changed`, `--all`) choose which Links a run looks at. `--slug`, `--url`, and `--slugs-file` override them. `--offset` and `--limit` cut the selection into batches; a batch stopped by an error or Ctrl-C resumes on the next run, because each Link is written atomically as soon as it is done and `--missing` skips Links that already have an enrichment record.

`--report .context/<name>.json` writes every result, proposed change, and the token usage to a JSON file for review.

`--fields description,tags` limits a run to the named fields. A partial run leaves other empty fields available: after `--fields tags --apply`, use `--slug <slug> --fields description --apply` or `--all --fields description --apply` to fill descriptions later. `--missing` continues to select only Links with no enrichment record.

Model and prompt upgrades are tracked separately for descriptions and tags. Run `--stale --fields tags --apply` to upgrade tags first, then `--stale --fields description --apply` with the same model to upgrade descriptions. Each run selects Links whose requested, regenerable fields are still stale; human-authored values stay protected.

`--fields author,sourceTitle` uses declared page metadata without calling a model, including on thin pages whose title matches the saved Link. These runs can succeed without model credentials. Trusted bylines and publishers are also saved during mixed runs when model output is inconclusive or a per-Link generation error occurs.

## How new Links are enriched

`npm run links:sync` writes new Link files first, prints its summary, and then starts `scripts/enrich-links.mjs` as a separate process for exactly the slugs it just wrote, with `--apply`. The import is finished before enrichment begins, so a slow page, a missing API key, or a model outage cannot block or roll back an import. If enrichment does not finish, the sync prints the retry command, and the slug list is kept at `.context/link-enrichment/new-links.txt`:

```bash
npm run links:enrich -- --slugs-file .context/link-enrichment/new-links.txt --apply
```

Pass `--no-enrich` to `links:sync` to skip the step. A Link added by hand is picked up by the next `--missing` run.

## Choosing the model

The model is configuration, written as `<provider>:<model>`. Set `LINK_ENRICH_MODEL` in the environment or pass `--model`:

| Provider | Example | Credentials and endpoint |
|---|---|---|
| `anthropic` (default) | `anthropic:claude-opus-5-5` | `ANTHROPIC_API_KEY`, or an `ant auth login` profile. `LINK_ENRICH_EFFORT` sets effort (default `low`). |
| `openai` | `openai:<model>` | `OPENAI_API_KEY`; `LINK_ENRICH_BASE_URL` overrides the endpoint. |
| `ollama` | `ollama:llama3.1:8b` | A local Ollama server at `http://localhost:11434/v1`, or `LINK_ENRICH_BASE_URL`. |
| `openai-compatible` | `openai-compatible:<model>` | Any Chat Completions server with JSON-schema output (OpenRouter, LM Studio, vLLM). Requires `LINK_ENRICH_BASE_URL`; `LINK_ENRICH_API_KEY` is optional. |
| `file` | `file:.context/responses.json` | Reads answers keyed by slug from a JSON file. Pairs with `--export-requests`, below. |
| `fake` | `fake:test` | Deterministic filler for tests. Refuses `--apply` unless `--allow-fake` is also given. |

Keep keys in the shell environment. Do not add them to `.env.local` with a whole-file write (see `AGENTS.md`), to command arguments, or to reports.

All providers receive the same system prompt and the same JSON schema (`scripts/link-enrichment/generate.mjs`), and every answer passes through the same validation. The Anthropic adapter uses structured outputs (`output_config.format`). For models that support it, it also opts into Anthropic's server-side refusal fallback (`fallbacks: "default"`), so a misplaced safety decline on an ordinary page is retried on another model instead of failing the Link.

Responses must be objects containing a boolean `sufficientContent`, a string `description`, an array of string `tags`, and a supported `contentType`, with no extra properties. Missing or mistyped values, empty objects, and arrays fail as retryable `invalid-output`; they leave requested fields open. Correct the response and use `--failed --apply` to retry. A valid `sufficientContent: false` response still records `insufficient-content`.

The default is Claude Opus 5.5 at low effort. Cost has not been measured on a live run yet. The sample prompts averaged about 7,000 characters (very roughly 2,000 input tokens), and the prompt grows as the tag vocabulary grows, up to a cap of 200 tags. On that basis, a full pass over 2,625 Links is an estimate of tens of dollars on `anthropic:claude-opus-5-5` and one or two dollars on `anthropic:claude-haiku-5-5`. Run a `--limit 20` batch with `--report` first; the summary prints actual token counts and an estimated cost for Anthropic models.

To generate somewhere else, such as a batch job or another tool, export the prompts and import the answers:

```bash
npm run links:enrich -- --missing --limit 50 --export-requests .context/requests.jsonl
# produce .context/responses.json: { "<slug>": { "sufficientContent": true, "description": "…", "tags": […], "contentType": "article" } }
npm run links:enrich -- --missing --limit 50 --model file:.context/responses.json --apply
```

## What is written, and how human edits are protected

Enrichment may change `description`, `tags`, `author`, and `sourceTitle`, and it adds one `enrichment:` block at the end of the front-matter. All other lines, and the Markdown body, are left byte for byte as they were; the rewrite is parsed back and compared before anything is saved.

The rules, in `scripts/link-enrichment/persist.mjs`:

- An empty field may be filled.
- A completed attempt closes only the fields requested by that run, including ones left empty because the page supplied no value. Other empty fields can be filled by a later run. Older records without `attemptedFields` count as having attempted every field, preserving their existing completion behavior.
- A field that already has a value and no enrichment record is authoritative and is never changed. This covers anything written by hand and anything the Feedly importer stored.
- Imported Feedly excerpts are the exception, and only when `--replace-excerpts` is given. An imported excerpt is a 120 to 340 character description ending in `…`, `[…]`, or `…Read more ›`, the shape the importer produces when it cuts a feed summary. On 14 November 2026, 1,021 Links matched. Another 573 Links hold short feed summaries with no truncation marker; they cannot be told apart from hand-written text, so they are always kept.
- When enrichment writes a field, it records a fingerprint of the value in `enrichment.fields`. If the file later holds a different value, a person edited it. The field is then marked `{"by":"human"}` and is never regenerated, even with `--re-enrich`. Clearing a machine-written field also counts as an edit.
- Tags are tracked individually. `enrichment.fields.tags.added` lists the tags the enricher added. Tags a person adds are kept. A generated tag a person removes is moved to `rejected` and is never proposed for that Link again, including under a reviewed alias.
- A value is never replaced with an empty one. A failed or inconclusive model attempt leaves descriptions and tags intact; trusted extracted bylines and publishers can still be saved.
- `--re-enrich` regenerates only fields still holding exactly what the enricher wrote.
- `--failed` also regenerates unchanged machine-written fields, so a retry after a failed model upgrade replaces the older output. Human edits and rejected tags stay protected.

`npm run links:enrich -- show <slug>` prints each field with its provenance: `empty`, `machine`, `human`, or `legacy` (a pre-existing value).

### The enrichment record

```yaml
enrichment:
  status: "enriched"            # enriched | failed | insufficient-content
  attemptedFields: ["description", "author", "sourceTitle", "tags"]
  basis: "page"                 # page text, page "metadata", or the saved "excerpt"
  model: "anthropic:claude-opus-5-5"
  promptVersion: 2
  generatedAt: "2026-11-14T20:39:50.631Z"
  generations:
    description: {model: "anthropic:claude-opus-5-5", promptVersion: 2, generatedAt: "2026-11-14T20:39:50.631Z"}
    tags: {model: "anthropic:claude-opus-5-5", promptVersion: 2, generatedAt: "2026-11-14T20:39:50.631Z"}
  lastAttemptAt: "2026-11-14T20:39:50.631Z"
  lastFetchedAt: "2026-11-14T20:37:19.001Z"
  httpStatus: 200
  contentHash: "sha256:7bb5f63aff368bd9"
  contentType: "blog-post"
  publisher: "macwright.com"
  language: "en"
  fields: {"description":{"by":"ai","hash":"72e363b86296"},"tags":{"by":"ai","added":["social-media","twitter"]}}
```

Other keys appear when they apply: `fetchIssue` (why the page text was not used), `finalUrl` and `canonicalUrl` (only for trusted pages and when they differ from `targetUrl`), `duplicateOf` (another Link's slug whose URL matches this page's canonical or final URL), `servedModel` (when a fallback model answered), `pagePublishedAt`, `mediaType`, `warnings`, `attempts`, and `error`. Saved target URLs take precedence over enrichment aliases in duplicate checks. Stored aliases on records with fetch issues are ignored conservatively because older records may contain untrusted redirects. The site's content loader ignores the block; nothing in it is displayed.

`enrichment.status` describes the latest attempt. A Link that was enriched and later failed a re-enrichment keeps its earlier fields and provenance.

An author/source-only success records `enriched` for those requested fields. It preserves previous model and generation provenance, or omits those fields if no model has run.

Top-level `model`, `promptVersion`, `generatedAt`, and optional `servedModel` describe the latest successful model attempt. Optional `generations.description` and `generations.tags` record those details for each field independently, including completed attempts that left an empty field empty. Retained values keep their earlier generation identity when a new response supplies no usable replacement. Older records fall back to the top-level provenance, which is preserved per field during their next update; no content migration is required.

`attemptedFields` accumulates the fields whose attempts completed, whether enriched or insufficient in content. Failed attempts preserve the list without closing additional fields. Omitting the list means an older record that attempted all fields; no content migration is required.

## Pages that cannot be read

The fetcher waits up to 15 seconds, reads at most 3 MB, sends requests to any one host one at a time and at least 1.5 seconds apart, and identifies itself with a `CiaranLyons-link-enrichment` user agent.

| `error.category` or `fetchIssue` | Meaning | Retried by `--failed` |
|---|---|---|
| `broken`, `unreachable` | 404 or 410, DNS failure, TLS failure, redirect loop | Only with `--include-permanent` |
| `access-restricted`, `authentication-required`, `paywalled` | 401, 402, 403, 407, or 451 | Only with `--include-permanent` |
| `rate-limited`, `server-error`, `timeout`, `network-error` | 429, 408, 5xx, or a dropped connection; `retryAfterSeconds` is kept when the site sends it | Yes |
| `unsupported-pdf`, `unsupported-content-type` | PDFs, images, and other non-HTML responses | Only with `--include-permanent` |
| `limited-content` | The page loaded but had fewer than 80 words of text | Not a failure |
| `semantic-mismatch` | The page's text does not match the saved title, as when a dead article redirects to a home page | Not a failure |
| `refusal`, `invalid-output`, `truncated`, `no-response` | The model declined, returned unusable output, or the `file` provider had no answer | Yes, except `refusal` |

When the page text is unusable, enrichment falls back to the page's own description (only if the page title matches the saved title) and the description saved at import. With at least 20 words of that material, the model describes what it supports and the record says `basis: "metadata"` or `basis: "excerpt"`. With less, nothing is generated, and the Link is recorded as `failed` or `insufficient-content`. The model may also answer that the material is too thin, which produces `insufficient-content` rather than a guess.

A field whose attempt completed, including `insufficient-content`, is not retried automatically. To try it again, name the Link with `--slug` and add `--re-enrich`. Fields excluded by an earlier `--fields` run remain available for later runs.

Provider problems (bad key, unknown model, exhausted rate limit, unreachable API) stop the run immediately and are not written into any Link. Fix the cause and rerun; finished Links are skipped.

## How the folksonomy grows

There is no fixed taxonomy. At the start of a run, the enricher counts every topical tag in `content/links/`. Each prompt includes the 200 most used, with their counts, and tells the model to reuse a vocabulary tag where one fits. The counts update as the run proceeds, so tags chosen early in a batch are offered to the Links after them.

Proposed tags are normalised to lowercase hyphenated form, deduplicated, capped at five topical tags per Link (counting tags a person already applied), and filtered through `content/link-tags.json`:

- `ignored`: tags present on Links that say nothing about the subject. `Saved For Later` is on every imported Link. A built-in list also drops generic tags such as `technology`, `article`, and `news`.
- `aliases`: reviewed merges. A proposed `ai-agent` becomes `ai-agents` once that alias exists.
- `distinct`: pairs reviewed and kept apart, so they are not suggested as duplicates again.
- `interests`: optional short phrases describing recurring interests, passed to the model as context. It starts empty; add entries only if they help.

`npm run links:tags` lists the vocabulary and possible duplicates: singular and plural forms (`ai-agent`, `ai-agents`), hyphenation (`opensource`, `open-source`), acronyms (`llm`, `large-language-models`), common abbreviations (`ux`, `user-experience`), and near-identical spellings. Nothing is merged automatically. `merge-tags --apply` rewrites the tag on every Link, updates the enrichment records so the rename is not mistaken for a person removing a tag, and adds the alias to `content/link-tags.json`. It also renames rejection history on Links where the tag has already been removed, resolving pending removals before the merge. When a human-selected tag and a generated synonym collapse, the surviving tag stays human-owned and survives later regeneration.

Merge destinations resolve through existing aliases before any files change. With `ux -> user-experience` already recorded, `merge-tags --from usability --to ux --apply` merges into `user-experience`, preserves the `ux` alias, and retargets earlier aliases for `usability`. Merging `user-experience` into its own alias `ux` leaves all files unchanged.

`keep-distinct ux user-experience` previews a reviewed pair without writing. Add `--apply` to save it in `content/link-tags.json` and suppress future duplicate suggestions for that pair.

## Content cache and change detection

Fetched pages are cached as extracted text and metadata, at most 24,000 characters each, in `.context/link-enrichment/content/`. Model answers are cached in `.context/link-enrichment/generations/`, keyed by provider configuration, prompt version, Link, and a hash of the prompt inputs. The hash covers the system prompt, output schema, supplied page text and metadata, saved Link context, owner tags, and recurring interests. Vocabulary counts are deliberately excluded so dry-run answers remain reusable during an applied batch. Metadata-only changes picked up by `--refetch --re-enrich` invalidate the answer even when body text is unchanged.

Provider configuration includes the model, Anthropic effort and output-token limit, and compatible-provider endpoint. Reviewed-file providers include the resolved file path and contents, so editing a response file or choosing another file with the same name invalidates its previous generation cache. Each file provider reads one consistent snapshot per invocation. Configuration identities and prompt inputs are hashed; keys and endpoint details are not copied into cache key parts. Earlier generation cache entries are ignored once after the identity and validation upgrade. The cache is local only; third-party text is never committed. Use `--refetch` to ignore cached pages, `--max-age-days N` to refetch older ones, `--regenerate` to ignore cached answers, or `--no-cache` to skip the cache entirely. Prompt version 2 enforces the response schema; use `--stale` to revisit generations recorded under version 1.

`contentHash` in each record is a hash of the extracted text. `--changed` refetches every enriched Link and regenerates only those whose hash differs.

## Extending the system

The three stages are separate modules in `scripts/link-enrichment/`:

- `fetch.mjs` and `extract.mjs`: retrieval and text extraction. Replace the extractor without touching generation.
- `generate.mjs` and `providers.mjs`: prompt, schema, validation, and model adapters. A new provider is an object with an `id` and an async `generate({ system, user, schema, slug })` that returns `{ output, usage, servedModel }`; register it in `resolveProvider`. Supply `getCacheIdentity()` with an identity covering every output-affecting setting. It may return a string or a promise; custom providers without it use `id` as their identity.
- `persist.mjs`: provenance and front-matter rewriting. A new machine-filled field needs an entry in `scalarFields`, a proposal in `planEnrichment`, and an insertion anchor in `insertAfter`.
- `vocabulary.mjs`: tag normalisation, vocabulary counts, and duplicate suggestions.
- `pipeline.mjs`: selection and orchestration. `scripts/enrich-links.mjs` is the command line.

When the prompt or validation rules change enough that earlier output should be regenerated, increase `promptVersion` in `generate.mjs`; `--stale` then selects Links with requested, regenerable descriptions or tags produced under an older version or a different model.

Validate changes with:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The unit tests cover extraction, fetch failure handling, tag rules, the provider adapters with stubbed clients, every provenance rule, and an end-to-end run over a temporary collection with a fake network and model (dry run, apply, cache reuse, retries, idempotent reruns, human edits, provider outage).
