# Use supplied OpenAI credentials for Link enrichment

This ExecPlan is a living document. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` current under `.agent/PLANS.md`.

## Purpose / Big Picture

Make `npm run links:enrich` and post-import enrichment use OpenAI by default and recognize the OpenAI endpoint and credentials already supplied by Conductor. Verify the actual model path by regenerating the eight recently imported Links, preserving human and imported fields.

## Progress

- [x] (2026-11-17 01:09Z) Located supplied `OPENAI_BASE_URL` and session proxy credentials without printing their values. Confirmed that the supplied endpoint exposes Responses rather than Chat Completions.
- [x] (2026-11-17 01:11Z) Completed a real authenticated structured-output canary with `gpt-6-astra`; HTTP 200, completed response, valid JSON.
- [x] (2026-11-17 01:13Z) Added native Responses, the OpenAI default, supplied endpoint/session credential resolution, and operating guidance. All 17 focused generation/provider tests passed, including six new request/configuration/isolation regressions.
- [x] (2026-11-17 01:15Z) Regenerated all eight recent Links through OpenAI after reviewing a dry run. Verified imported fields and every older Link remained unchanged; the applied pass reused cached model answers.
- [x] (2026-11-17) Completed idempotence and repository checks: repeat enrichment wrote zero files; lint and TypeScript passed; all 199 tests passed; the build and Link artifact validator passed; all eight pages passed local HTTP verification.
- [ ] Publish the focused change through PR checks and the existing production workflow; verify the public result.

## Surprises & Discoveries

- Observation: The supplied configuration was present even though `OPENAI_API_KEY` was absent.
  Evidence: Conductor supplies an OpenAI base URL and a separate session proxy token. The previous adapter ignored both.
- Observation: The supplied endpoint supports Responses only.
  Evidence: Chat Completions returned `conductor_route_not_supported`; Responses returned HTTP 200 when supplied with the session token.

## Decision Log

- Decision: Default to `openai:gpt-6-astra` and use Responses for the native OpenAI provider.
  Rationale: Official current guidance resolves that model, and a live structured-output request succeeded through the supplied endpoint.
  Date/Author: 2026-11-17 / Codex
- Decision: Resolve the endpoint from `LINK_ENRICH_BASE_URL`, then `OPENAI_BASE_URL`, then the public OpenAI default. Send a Conductor session token only to the exact `https://api.conductor.build` origin.
  Rationale: Respect explicit overrides and supplied configuration while keeping session credentials bound to their intended service. API keys and session tokens remain in process memory.
  Date/Author: 2026-11-17 / Codex
- Decision: Retain Anthropic as an explicit provider and keep Chat Completions for Ollama and other compatible servers.
  Rationale: The requested default migration does not require removing supported alternatives.
  Date/Author: 2026-11-17 / Codex

## Outcomes & Retrospective

The supplied OpenAI credentials now work through the normal CLI. OpenAI is the default, and all eight recent Links have actual `openai:gpt-6-astra` generation provenance. Imported fields and all 2,625 older Links are preserved. No new credential or environment-file write was required. A repeat run wrote zero files. Lint, TypeScript, all 199 tests, the artifact build, Link artifact validation, and all eight local HTTP page checks passed. Publication remains in progress.

## Context and Orientation

`scripts/link-enrichment/providers.mjs` selects models, performs model requests, maps usage and errors, and hashes generation settings for caching. `scripts/enrich-links.mjs` imports its default and passes the selected provider into `pipeline.mjs`; `scripts/sync-feedly-links.mjs` invokes that CLI for newly imported slugs. `generate.mjs` validates every response, while `persist.mjs` protects imported values and human edits. Regression coverage is in `scripts/link-enrichment/generate.test.mjs`. The runbook is `docs/operations/enrich-links.md`.

The eight most recent imported slugs are listed in ignored `.context/link-enrichment/new-links.txt`. Their current generated values came from the file provider. Model changes must be applied through `--re-enrich`, never by editing `enrichment:` blocks manually.

## Plan of Work

Add a native Responses adapter that sends the existing prompt and JSON schema, handles refusals and incomplete output, records the served model and token counts, and includes endpoint/reasoning/output-limit settings in its cache identity. Resolve standard OpenAI configuration and tightly scope the Conductor token fallback. Update the default and operating examples, retaining historical test fixtures.

Add focused regressions for request shape, configuration precedence, supplied credential forwarding, credential isolation on other origins, refusal/truncation handling, usage, and cache settings. Regenerate only the eight recent Links with the supported CLI, reviewing proposed changes before applying. Finish with one repository validation pass and the existing PR/deployment sequence.

## Concrete Steps

Run from `/Users/ciaran/conductor/workspaces/ciaranlyons/daegu`:

    node --test scripts/link-enrichment/generate.test.mjs
    npm run links:enrich -- --slugs-file .context/link-enrichment/new-links.txt --re-enrich --report .context/openai-enrichment-preview.json
    npm run links:enrich -- --slugs-file .context/link-enrichment/new-links.txt --re-enrich --apply --report .context/openai-enrichment-applied.json
    npm run lint
    npx tsc --noEmit
    npm test
    npm run build:artifact
    npm run links:validate-artifact
    git diff --check

Keep logs and model reports in ignored `.context/`. Compose and locally validate the PR body against `scripts/validate-pr-body.mjs`, then merge only its checked head. Follow the production workflow for that merge SHA and verify the eight public pages.

## Validation and Acceptance

The default provider is OpenAI. A standard key works against the public OpenAI API; the supplied endpoint and session token work in Conductor without an added key. A custom non-Conductor endpoint receives no Conductor token. Responses use the existing strict JSON schema and preserve refusal, retry, served-model, usage, and caching semantics. The eight selected Links show actual OpenAI generation provenance, imported and human-owned fields stay unchanged, and all older Links remain byte-for-byte unchanged. A repeated completed run writes nothing. Required tests, build, PR checks, deployment, smoke test, and targeted public checks pass.

## Idempotence and Recovery

Back up the eight current files under `.context/` before applying the regeneration. Dry-run generation caches results for the applied pass. A failed provider request must stop without replacing the in-progress Link. Restore only affected files from the scoped backup if needed; never reset unrelated work or overwrite `.env.local`. Never print, commit, or persist session tokens or API keys. A merged branch is retired.

## Artifacts and Notes

The authenticated access canary returned `model: gpt-6-astra`, completed status, and `{ "ok": true }` with 48 input and 13 output tokens. It used the supplied endpoint and session token in memory only.

The CLI canary enriched one real Link using 1,516 input and 74 output tokens. The subsequent eight-Link preview reused that result and made seven further calls using 11,879 input and 528 output tokens. All eight preview results were enriched successfully; the applied pass wrote eight files with zero additional model calls. Reports and logs are under `.context/openai-enrichment-{canary,preview,applied}.*`; pre-regeneration source is backed up in `.context/openai-upgrade-before.json`.

Completed validation:

    npm run lint                   # 158 files; zero errors, warnings, or hints
    npx tsc --noEmit                # exit 0
    npm test                       # 199 passed; 0 failed
    npm run build:artifact          # exit 0
    npm run links:validate-artifact # 2,633 detail pages; 1,371 archives; max 50 rows
    git diff --check                # exit 0
    node .context/feedly-latest-verify.mjs http://127.0.0.1:4389
    # PASS: all eight pages, metadata, destination links, tags, archives, and RSS

The repeat ordinary `links:enrich --apply` selected eight completed records and wrote zero files, made zero model calls, and left the post-apply source hashes unchanged. The build produced 7,045 files; both Link feeds contain 50 items. The pages retain the shared 1200×630 `/og/links.png` preview. Validation logs are under ignored `.context/openai-enrichment-{lint,types,tests,build,artifact}.log`.

Official references: [Responses structured output](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) and [current model migration guidance](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#migration-quickstart).

## Interfaces and Dependencies

Add `openaiProvider(...)` with the existing `{ id, getCacheIdentity, generate }` provider interface. Extend the resolver's optional dependency injection for deterministic request tests. Existing `OPENAI_API_KEY` support remains; `OPENAI_BASE_URL` becomes recognized. The Conductor session-token environment variable is a narrowly scoped fallback. No dependency or deployment workflow change is required.

## Change Log

- 2026-11-17: Created the scoped migration plan and verified live access through supplied OpenAI credentials.
- 2026-11-17: Implemented and tested native OpenAI Responses, scoped session authentication, and the default; regenerated the eight recent Links with live model results.
- 2026-11-17: Completed the repository validation pass, idempotence checks, and all eight local HTTP content checks before publication.
