# Repair Link enrichment from review

This ExecPlan is a living document. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` current, following `.agent/PLANS.md`.

## Purpose / Big Picture

Complete the review repairs for PR #118's Link enrichment tooling. Enrichment must preserve human descriptions and tags, allow partial field runs and later model upgrades, trust only matching destination metadata, reuse model output only for matching inputs, and require `--apply` for taxonomy writes.

This is the single review-remediation plan. It consolidates four repair rounds covering 12 findings. The original feature plan, `.agent/execplans/2026-11-14-link-metadata-enrichment.md`, remains separate. Three findings from the latest review are recorded below as nonblocking follow-ups; they are outside this completed repair scope.

## Progress

- [x] (2026-11-16 21:28Z) Read the repository guidance and PR #118 at `a7015acd3dbc9091f5c0c08ade4cb277a6e0746b`; fast-forwarded the existing `clyons/pr-118-review` branch before implementation.
- [x] (2026-11-16 21:30Z) Repaired human tag ownership during merges, failed model-upgrade retries, partial field completion, and `keep-distinct` dry runs. Added eight regressions; six reproduced failures before repair. All 23 focused tests and 171 repository tests passed, with lint, TypeScript, build, artifact validation, and diff checks.
- [x] (2026-11-16 23:03Z) Repaired redirect trust, independent author/publisher extraction, and provider cache identity. Added nine regressions; eight initially failed. All 40 focused tests and 180 repository tests passed, with TypeScript, build, lint, artifact validation, and diff checks.
- [x] (2026-11-16 23:43Z) Repaired provenance-only rejected-tag merges, prompt-input cache invalidation, and malformed output validation. Seven new regressions failed before repair. All 47 focused tests and 187 repository tests passed, with TypeScript, build, artifact validation, and diff checks.
- [x] (2026-11-16 23:55Z) Repaired partial model/prompt upgrades and merges into existing aliases. Six new regressions failed before repair. All 42 persistence/pipeline tests and 193 repository tests passed, with TypeScript, lint, build, artifact validation, and diff checks.
- [x] (2026-11-17 00:26Z) Recorded the latest review's 193 passing tests, clean lint/TypeScript/diff checks, and three reproduced nonblocking follow-ups; consolidated the four review plans at the user's request and removed the superseded copies.

## Surprises & Discoveries

- Observation: A single completion status previously closed fields excluded by `--fields`.
  Evidence: A tags-only run left empty descriptions unavailable to later ordinary runs. Completion now accumulates in `attemptedFields`.
- Observation: Human ownership and rejection history must be resolved before merging tags.
  Evidence: A human tag could become machine-owned when merged with a generated synonym; a removed generated tag could exist only in provenance and be skipped by a current-tags-only merge.
- Observation: Extraction and generation have different success conditions.
  Evidence: Valid author/publisher metadata was previously discarded after an inconclusive model response or per-Link provider error, and extraction-only success could overwrite model provenance.
- Observation: Stored redirect aliases can outlive the evidence that made them untrustworthy.
  Evidence: Older records with `fetchIssue: semantic-mismatch` could claim a separately saved publisher homepage as a duplicate.
- Observation: Model names and body hashes do not identify all generation inputs.
  Evidence: Same-basename response files shared output; effort/endpoint changes were omitted; updated page metadata, saved context, and owner interests could reuse obsolete answers.
- Observation: Schema validation must reject structurally empty answers.
  Evidence: The earlier coercion accepted `{}` or arrays as successful enrichment with no usable output, closing every field.
- Observation: Generation provenance must follow each retained value independently.
  Evidence: A tags-only model B upgrade previously made model A's retained description look current. An empty replacement proposal must also retain the older value's generation identity.
- Observation: Merge targets may already be reviewed aliases.
  Evidence: With `ux -> user-experience`, merging `usability` into `ux` previously undid the earlier consolidation.

## Decision Log

- Decision: Human ownership wins when a human tag and a generated synonym collapse; resolve inferred removals before renaming and canonicalize rejection comparisons.
  Rationale: Regeneration must preserve the owner's choices and never restore a rejected topic under an alias.
  Date/Author: 2026-11-16 / Codex
- Decision: Enable regeneration for `--failed` selections while retaining fingerprints and rejected-tag protections.
  Rationale: A failed model upgrade preserves old machine values; retrying it must be able to replace them.
  Date/Author: 2026-11-16 / Codex
- Decision: Accumulate completed fields in `enrichment.attemptedFields`; treat older records without this list as having attempted all fields.
  Rationale: Partial runs remain resumable without reopening completed legacy fields. Failed attempts close no additional fields.
  Date/Author: 2026-11-16 / Codex
- Decision: Guard `keep-distinct` writes with `--apply`, matching other content-changing commands.
  Rationale: Previewing a reviewed pair must leave an existing taxonomy unchanged and must not create an absent file.
  Date/Author: 2026-11-16 / Codex
- Decision: Index saved target URLs before aliases, ignore stored aliases on records with fetch issues, and gate newly observed URLs on page trust.
  Rationale: Rejected redirects must not contaminate duplicate hints or override authoritative saved targets.
  Date/Author: 2026-11-16 / Codex
- Decision: Generate only for fillable descriptions or tags; persist trusted extracted metadata independently and preserve model provenance when no model runs.
  Rationale: Declared bylines and publishers do not depend on model sufficiency. Fatal provider errors still stop without writing the in-progress Link.
  Date/Author: 2026-11-16 / Codex
- Decision: Hash output-affecting provider settings and use one content-hashed response-file snapshot per invocation.
  Rationale: Cache identities must distinguish paths, contents, effort, token limits, and endpoints without persisting credentials or endpoint details in key parts.
  Date/Author: 2026-11-16 / Codex
- Decision: Hash the request built with an empty vocabulary; use prompt version 2 and generation cache namespace `generation-v3` for strict response validation.
  Rationale: Stable prompt inputs must invalidate cached answers, while evolving vocabulary counts must not prevent reuse between a dry run and its applied batch. Old malformed cached output must not bypass validation.
  Date/Author: 2026-11-16 / Codex
- Decision: Store optional `generations.description` and `generations.tags`, with legacy fallback to top-level generation metadata.
  Rationale: Partial model/prompt upgrades must leave excluded fields stale; retained values with no usable replacement keep their earlier generation identity.
  Date/Author: 2026-11-16 / Codex
- Decision: Resolve merge destinations through the validated taxonomy before rewriting Links, retaining previous aliases and treating canonical self-merges as no-ops.
  Rationale: A later merge must preserve earlier reviewed consolidations.
  Date/Author: 2026-11-16 / Codex
- Decision: Finish this repair scope and record the latest three findings as nonblocking follow-ups instead of starting another repair round.
  Rationale: The latest review reached diminishing returns after the core fixes. The user accepted recording the remaining edge cases and requested one consolidated review plan.
  Date/Author: 2026-11-17 / Codex and Ciaran

## Outcomes & Retrospective

The 12 findings across the four repair rounds are implemented. The suite grew from 163 to 193 passing tests. Human fields and rejected tags remain protected; partial field completion and model/prompt upgrades are independent; extraction works without generation; malformed output remains retryable; generation caches cover stable request inputs and provider settings; and reviewed tag aliases remain consistent.

The last repair round passed the production build and artifact validation. The subsequent review reran tests, lint, TypeScript, and diff checks successfully, using temporary fixtures for additional reproductions. It did not rerun the build or call live providers. The documentation consolidation changes no implementation or collection files.

At completion of the review, repairs were local and uncommitted on `clyons/pr-118-review`; no push, PR update, merge, deployment, or live enrichment had been performed during the repair/review tasks. Ciaran subsequently authorized a PR, merge, and production deployment. The original PR's 17-Link sample remains intact. Live model cost/quality measurement and the remaining collection rollout stay with the original feature plan.

The latest review left these follow-ups in Conductor. They are reproduced but intentionally deferred, not implementation checkboxes for this plan:

| Priority | Follow-up | Observed behavior and future repair |
|---|---|---|
| P2 | Partial `--changed` refresh | `--changed --fields tags --apply` advances the shared `contentHash` while leaving the old description. A later description-only `--changed` run reports unchanged, and model/prompt staleness does not select it. Track content versions per field or preserve outstanding updates before the unchanged shortcut in `scripts/link-enrichment/pipeline.mjs`. |
| P2 | Destination-error retries with cached content | After a previously enriched Link fails a refetch with a 503 or timeout, `--failed` can use the older successful page cache, clear the error, and report success without an HTTP retry. Bypass or invalidate cached content for destination-error retries while retaining it for model-only errors in `scripts/link-enrichment/pipeline.mjs`. |
| P3 | File-provider status identity | `status --model file:.context/responses.json` compares the full spec with saved `file:responses.json`, reporting fresh output as stale even though the matching `--stale` run selects nothing. Resolve the provider ID in `scripts/enrich-links.mjs` before counting stale records. |

## Context and Orientation

- `scripts/enrich-links.mjs`: CLI selection, status, tag merges, and `keep-distinct`.
- `scripts/link-enrichment/pipeline.mjs`: loading, selection, destination trust, extraction/generation orchestration, caching, and writes.
- `scripts/link-enrichment/persist.mjs`: human ownership fingerprints, attempted fields, rejected tags, generation provenance, and surgical front-matter rewriting.
- `scripts/link-enrichment/generate.mjs`: prompts, output schema, validation, corrective retries, and tag normalization.
- `scripts/link-enrichment/providers.mjs`: Anthropic, compatible API, reviewed-file, and fake adapters, including cache identities.
- `scripts/link-enrichment/{generate,persist,pipeline}.test.mjs`: regressions using temporary collections and stubbed providers/network calls.
- `docs/operations/enrich-links.md`: public CLI behavior and compatibility rules. `src/lib/content.ts` ignores enrichment records when loading the site.

A fingerprint identifies the exact value enrichment wrote. A later different value is human-owned. A generation record identifies the model and prompt version behind a field. A taxonomy alias maps a reviewed tag spelling to its canonical destination.

## Plan of Work

The four milestones are complete:

1. In `scripts/enrich-links.mjs`, `persist.mjs`, and `pipeline.mjs`, repair merged-tag ownership, failed model-upgrade retries, partial completion, and dry-run protection. Add regressions before repair and document the resulting behavior.
2. In `pipeline.mjs`, `persist.mjs`, and `providers.mjs`, gate URL aliases on trusted page evidence, separate extracted fields from model success, and introduce complete provider cache identities. Exercise negative trust cases and positive extraction/cache controls.
3. In `scripts/enrich-links.mjs`, `generate.mjs`, `persist.mjs`, and `pipeline.mjs`, handle provenance-only tag removals, hash stable prompt inputs, and reject malformed output. Increase the prompt/cache versions and prove corrected failed responses remain retryable.
4. In `persist.mjs`, `pipeline.mjs`, and `scripts/enrich-links.mjs`, preserve per-field generation histories and resolve alias destinations before merging. Cover partial upgrades in both directions, legacy records, retained values, timestamp idempotency, and alias preservation.

Each milestone updated the runbook and ran focused regressions followed by repository validation. The final documentation step consolidates these records, checks the required plan sections, and confirms all implementation changes remain untouched. No additional repair milestone is authorized by this consolidation.

## Concrete Steps

For implementation verification, run from `/Users/ciaran/conductor/workspaces/ciaranlyons/daegu`:

    node --test scripts/link-enrichment/generate.test.mjs scripts/link-enrichment/persist.test.mjs scripts/link-enrichment/pipeline.test.mjs
    npm test
    npm run lint
    npx tsc --noEmit
    npm run build
    npm run links:validate-artifact
    git diff --check
    git diff --name-only -- content

The focused and full suites must pass; the full suite currently has 193 tests. Lint, TypeScript, build, artifact validation, and whitespace checks must exit zero. The build includes lint. The final content-path command should show no collection changes from the local review repairs; compare against the starting snapshot when other content changes already exist.

For this documentation-only consolidation, validate all required headings from `.agent/PLANS.md`, confirm only one review-remediation plan remains, check for references to deleted plan paths, run `git diff --check`, and compare the tracked source diff with the saved fingerprint in `.context/review-execplans-before-consolidation.json`. A full test/build rerun is unnecessary because implementation files are unchanged.

## Validation and Acceptance

- Merging a human tag with a generated synonym in either direction preserves human ownership through regeneration; merging two machine tags keeps machine ownership.
- An inferred removal or stored rejection is renamed even when the tag exists only in provenance. Future proposals using either alias remain blocked, and unrelated current tag bytes stay unchanged.
- A failed model upgrade retains old values; a corrected `--failed` retry can replace unchanged machine values while preserving human edits and rejections.
- Tags-only and description-only runs leave excluded empty fields available through an explicit slug or `--all`; completed empty fields remain closed. Legacy records retain their existing completion semantics.
- `keep-distinct` without `--apply` leaves taxonomy bytes unchanged or the file absent; an applied pair is normalized and saved once.
- Semantically rejected redirects never produce duplicate hints. Saved targets outrank aliases; old untrusted aliases are ignored and trusted aliases still work.
- Author/source-only runs call no model and save trusted metadata on substantial or thin matching pages. Per-Link generation errors or insufficient output do not discard trusted extracted fields. Fatal provider errors retain the stop-without-writing behavior.
- Cache identity distinguishes provider settings and response-file paths/contents; identical inputs reuse answers. Refetched page metadata, saved context, and owner interests invalidate generations even when body text is unchanged.
- `{}`, arrays, missing properties, wrong types, and unsupported content types produce retryable `invalid-output`. Corrected reviewed responses can succeed under `--failed`; intentional `sufficientContent: false` remains supported.
- Partial model/prompt upgrades keep the excluded field's earlier generation identity and staleness. Empty proposals do not relabel retained values, human fields stay protected, and timestamps alone do not rewrite completed files.
- A merge into an existing alias uses its canonical destination and preserves previous mappings. Repeated merges and canonical self-merges leave files unchanged.
- Consolidation preserves these decisions, evidence, and deferred issues in one complete plan, removes the three superseded copies, and leaves code, tests, the runbook, and collection content unchanged.

## Idempotence and Recovery

Regression tests create and remove temporary collections and use stubbed network/model responses. No real Link, taxonomy, credential, or environment file needs modification. Repeated completed runs remain idempotent; cache-version upgrades ignore older entries without deleting them. Keep the existing branch and preserve all pre-existing local changes.

The complete original four review plans and the tracked source-diff fingerprint are backed up in `.context/review-execplans-before-consolidation.json`. Earlier repair snapshots remain listed below. Recover an accidentally altered file selectively from the appropriate snapshot; do not reset the working tree and discard earlier repairs. No commit, push, PR mutation, merge, deployment, or live model call is part of this consolidation.

## Artifacts and Notes

Historical repair evidence, in order:

| Repair round | Reproduction evidence | Passing validation and logs |
|---|---|---|
| Ownership, retries, partial runs, dry runs | Eight new tests; focused run initially 17 passed / 6 failed | Focused 23/23; full 171/171; lint 158 files with zero diagnostics; TypeScript/build/artifact/diff checks passed. Build: `.context/pr-118-fixes-build.log`. |
| URL trust, extraction, provider cache identity | Eight initial failures; nine regressions after adding a negative extraction-only case | Focused 40/40; full 180/180; TypeScript/build/lint/artifact/diff checks passed. Build: `.context/pr-118-follow-up-build.log`. Provider test file separately passed 9/9 after test cleanup. |
| Rejected tags, prompt cache identity, output validation | Seven failing regressions: `.context/link-enrichment-regressions-before.log` | Focused 47/47: `.context/link-enrichment-regressions-after.log`; full 187/187: `.context/link-enrichment-final-tests.log`; successful types/build/artifact logs: `.context/link-enrichment-final-{types,build,artifact}.log`. |
| Partial model/prompt upgrades and alias targets | Six failures, 36/42 passing: `.context/partial-upgrade-regressions-before.log` | Focused 42/42: `.context/partial-upgrade-regressions-after.log`; full 193/193: `.context/partial-upgrade-test.log`; successful types/build/artifact logs: `.context/partial-upgrade-{types,build,artifact}.log`. |

The last repair build generated 4,125 pages, verified 124 social preview images, and indexed 2,693 pages. Artifact validation checked 7,021 files, 2,625 Link detail pages, 1,363 archives, and at most 50 rows per archive page. Astro reported zero errors, warnings, and hints; Vite's chunk-size advisory was nonfatal.

The latest review independently passed `npm test` (193/193), `npm run lint` (158 files, zero diagnostics), `npx tsc --noEmit`, and `git diff --check`. Logs: `.context/review-tests.log`, `.context/review-lint.log`, and `.context/review-types.log`. It reproduced the three deferred findings using temporary fixtures and no live network/model calls. Full build, artifact validation, and UI tests were not repeated in that pass.

Retained recovery artifacts:

- `.context/link-enrichment-before-final-fixes.patch` and `.context/link-enrichment-content-before-final-fixes.txt`: baseline before the third repair round.
- `.context/link-enrichment-after-final-fixes.patch` and `.context/link-enrichment-final-delta.diff`: third-round result and inspected delta.
- `.context/link-enrichment-before-partial-upgrade-fixes.patch`: baseline before the fourth repair round.
- `.context/review-execplans-before-consolidation.json`: originals of all four review plans and the tracked-diff fingerprint before consolidation.

## Interfaces and Dependencies

- `enrichment.attemptedFields?: string[]` accumulates completed attempts for `description`, `author`, `sourceTitle`, and `tags`; absent lists retain legacy all-fields semantics.
- `enrichment.generations.description` and `.tags` optionally record `model`, `promptVersion`, `generatedAt`, and `servedModel`. Top-level values describe the latest successful model attempt and remain the fallback for legacy files.
- `getCacheIdentity()` optionally returns a string or promise covering provider settings; custom providers without it fall back to `id`.
- `renameTagInLink`, `generateMetadata`, `planEnrichment`, `buildRequest`, and `runEnrichment` retain their calling interfaces. Existing ownership fingerprints and the site's public content model remain unchanged.
- Prompt version is 2; the generation-cache namespace is `generation-v3`. These review repairs add no packages beyond the original feature's dependencies.

## Change Log

- 2026-11-16: Completed the first review round's four repairs and eight regressions; recorded compatibility, dry-run behavior, and 171 passing tests.
- 2026-11-16: Completed the second round's three repairs and nine regressions; recorded independent extraction, trusted aliases, provider identities, and 180 passing tests.
- 2026-11-16: Completed the third round's three repairs and seven regressions; recorded rejection history, stable prompt identity, strict output validation, and 187 passing tests.
- 2026-11-16: Completed the fourth round's two repairs and six regressions; recorded per-field generation provenance, canonical merge destinations, and 193 passing tests.
- 2026-11-17: Consolidated the four review ExecPlans into this file at Ciaran's request, preserved their validation/recovery history, removed three superseded plans, and documented three nonblocking follow-ups without extending implementation scope.
