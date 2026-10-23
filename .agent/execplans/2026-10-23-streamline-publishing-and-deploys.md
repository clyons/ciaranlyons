# Streamline content publishing and deployments

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

A small Writing edit should move from final copy to a verified public page without several minutes of repeated checks, custom scripts, and publishing administration. Keep the existing source-PR-to-main-to-GitHub-Actions publishing route, but eliminate duplicate work within each validation stage and make routine publication repeatable.

The observable result is a documented publishing procedure with reusable PR/body and page-verification commands, one Astro check per CI validation job, a locked deployment CLI supplied by the normal dependency install, and measured timings separating local preparation, PR checks, production, and public verification. The production release must still run lint, tests, a clean build, social-preview verification, and the production smoke test.

The user authorized executing this plan on 2026-10-23, including its implementation PR, merge, production release, and verification. The original planning-only boundaries below describe the historical planning turn; they no longer defer the implementation authorized in this session.

## Progress

- [x] (2026-10-23 13:50Z) Read `.agent/PLANS.md`, the plan template, publishing/deployment runbooks, current workflows, and workflow-contract tests.
- [x] (2026-10-23 13:50Z) Recorded the measured PR #91 and production timings and separated workflow duration from the reported seven-minute publishing turn.
- [x] (2026-10-23 13:53Z) Created the implementation milestones, acceptance criteria, and recovery procedure below.
- [x] (2026-10-23 13:53Z) Validated the required sections against the template, UTC progress timestamps, milestone coverage, baseline references, and whitespace.
- [x] (2026-10-23 14:15Z) Milestone 1 complete: Standardize the local content-publishing procedure and reusable verification.
- [x] (2026-10-23 14:15Z) Milestone 2 complete: Remove duplicate Astro checks within CI jobs while retaining every validation gate.
- [x] (2026-10-23 14:15Z) Milestone 3 complete: Lock deployment tooling and improve dependency-cache use.
- [ ] (2026-10-23 13:53Z) Milestone 4 pending: Validate failures and cold installs, publish the authorized implementation, and record before/after timings.

- [x] (2026-10-23 14:10Z) Implemented shared PR validation, Writing publication verification and failure fixtures; added the common runbook and content-specific links.
- [x] (2026-10-23 14:10Z) Split the artifact build from the safe public build, retained CI gates, and added ordering/bypass and actual shell failure tests.
- [x] (2026-10-23 14:10Z) Consulted Cloudflare docs and the pinned action bundle; installed exact Wrangler 4.152.0 and added CLI/version/lockfile guards plus PR npm caching.
- [ ] (2026-10-23 14:10Z) Complete cold install, full local validation, visual review, implementation PR, release, and timing comparison.

- [x] (2026-10-23 14:15Z) Full local validation passed; reviewed article/homepage desktop/mobile and exact social PNG. Confirmed all eight UI snapshot mismatches also occur on baseline main.

- [x] (2026-10-23 14:20Z) Rebased onto concurrent main PR #92 (`d61b4be`), repeated integrated lint/TypeScript/122 Node tests/build and targeted verification, and reviewed the new artifact. Full UI passes 116/120; the four Writing/TIL snapshot mismatches also reproduce against latest main.

## Surprises & Discoveries

- Observation: The last production workflow occupied 90 seconds; the preceding PR workflow also occupied 90 seconds. The reported seven-minute turn includes additional local preparation, browser review, PR administration, and polling. There is no timestamped record establishing an exact breakdown of all that local handling time.
  Evidence: [PR checks for #91](https://github.com/clyons/ciaranlyons/actions/runs/39963143153) ran from 13:40:20Z to 13:41:50Z; [production](https://github.com/clyons/ciaranlyons/actions/runs/39963404745) ran from 13:42:11Z to 13:43:41Z on 2026-10-23. PR #91 merged at 13:42:09Z.
- Observation: `npm run lint` executes `astro check`, and `npm run build` executes it again. Both the PR quality job and production job run these commands in sequence. The manual preview workflow repeats the same pattern.
  Evidence: `package.json`, `.github/workflows/pr-quality.yml`, `.github/workflows/deploy-production.yml`, and `.github/workflows/deploy-preview.yml`.
- Observation: Uploading changed files was inexpensive. Much of the deployment action's 19 seconds was tool setup and publishing overhead.
  Evidence: production logs show Wrangler absent, `npm i wrangler@4` taking about six seconds, and `Uploaded 51 files (6896 already uploaded) (1.73 sec)`.
- Observation: A small content edit builds the entire site, but static rendering alone was only 12.53 seconds in this sample. The 30-second production build step also included the duplicate check, image verification, and search indexing.
  Evidence: production logs report 4,097 built pages, 96 verified social previews, and 2,678 indexed pages. These counts are observations, not constants to hardcode into tests.
- Observation: Production and preview already use setup-node's npm cache; the PR workflow does not. The npm cache stores downloaded packages, not a complete installed dependency tree, so a cache hit does not eliminate `npm ci`.
  Evidence: the setup-node configuration in the three workflows. Cold and warm installation costs still need comparison after locking Wrangler.
- Observation: Builds also fetch the public Bluesky feed, so identical source can produce different Note pages as the feed changes. Source identity alone is insufficient evidence that two generated artifacts are identical.
  Evidence: `src/lib/atproto.ts` fetches and paginates the author feed during `getAllNotes()`, with local Notes as fallback. The note published during this session appeared in the next build.

- Observation: The full UI suite passes 110 of 118 checks on both optimized and baseline main builds, with the identical eight screenshot mismatches (home, Writing, Notes, TIL at desktop/mobile). Every HTML file and social image is byte-identical between the two builds. Only 11 Pagefind index files differ; search behavior passes in both suites.
  Evidence: `.context/ui-tests.log`, `.context/baseline-ui-tests.log`, `.context/artifact-comparison.json`; no UI snapshot files were changed.
- Observation: Gray-matter supports executable JavaScript frontmatter engines in addition to YAML.
  Evidence: Its installed `lib/engines.js` uses eval for the JavaScript engine. The publication verifier now rejects non-plain-YAML opening delimiters before calling the parser; a fixture proves executable frontmatter is never invoked.

- Observation: Main advanced with PR #92 while PR #93 was under validation. The clean rebase preserves its HLS dependency, media implementation, and updated home/Notes snapshots. Latest-main and optimized artifacts each contain 6,948 files with byte-identical HTML/images; only 11 Pagefind index files differ. The remaining four Writing/TIL snapshot mismatches reproduce on latest main.
  Evidence: `.context/integrated-validation-timings.json`, `.context/integrated-artifact-comparison.json`, `.context/integrated-ui-tests.log`, and `.context/integrated-baseline-ui-tests.log`. This source change also limits direct runtime comparison with PR #91.

## Decision Log

- Decision: Optimize repeated validation and publishing administration before introducing incremental site builds.
  Rationale: The measured bottlenecks include duplicated checks and orchestration; rebuilding only selected routes would complicate archives, feeds, search, social images, and remote Notes for limited initial benefit.
  Date/Author: 2026-10-23 / Codex
- Decision: Keep independent validation of the PR and the merged production revision. Do not deploy a cached PR artifact or assume a PR success validates a different merge commit.
  Rationale: Production builds have a distinct revision and production-only identity settings. The current clean-build and secret-boundary requirements remain executable contracts.
  Date/Author: 2026-10-23 / Codex
- Decision: Preserve a safe standalone `npm run build`; expose a separate artifact-building command for workflows that have already completed lint in the same job.
  Rationale: Removing the duplicate invocation must not turn ordinary local builds into unchecked builds or allow deployment before validation.
  Date/Author: 2026-10-23 / Codex
- Decision: Cache downloaded dependencies and install an exact Wrangler version through the lockfile; do not cache `dist/`, credentials, or production identity files.
  Rationale: This removes a floating install from the deployment action without changing the source of production artifacts. Any benefit must include the additional cost of installing Wrangler through `npm ci`.
  Date/Author: 2026-10-23 / Codex
- Decision: Streamline routine Writing verification while retaining content-specific requirements for TILs and Found Quotes.
  Rationale: Existing runbooks require different checks. A common procedure must document equivalent coverage rather than silently skipping a required suite, social-image inspection, or public verification.
  Date/Author: 2026-10-23 / Codex

- Decision: Use a direct exact development dependency on htmlparser2 12.0.0, already transitively installed by sanitize-html, for structural HTML/XML verification. Reuse the existing date/slug/boolean validators through the installed tsx API.
  Rationale: This avoids regex false positives in archives, RSS, and homepage selection, decodes entities, and keeps Markdown as data. No application rendering or content model changes are needed.
  Date/Author: 2026-10-23 / Codex
- Decision: Validate all exact PR template headings and all referenced plans; reject leftover template placeholders and checklist-only evidence.
  Rationale: This preserves the old gate's populated N/A and plan-existence rules while making the user-wide exact-template contract executable locally and in CI.
  Date/Author: 2026-10-23 / Codex

## Outcomes & Retrospective

Milestones 1–3 and local validation are complete. The safe build composition, failure gates, clean install, targeted article checks, and visual review pass. The final integrated UI run has four independently reproduced Writing/TIL baseline screenshot mismatches; HTML and image output matches latest main. The initial pre-rebase eight mismatches are retained as historical evidence below. Implementation PR and production release remain pending. No CI speed improvement is claimed before release timing evidence.

Update this section at each implementation milestone with actual command results and remaining gaps. Final implementation sign-off requires a successful production deployment of the authorized implementation and a before/after timing comparison; passing local tests alone is insufficient.

## Context and Orientation

Execute from the repository root, `/Users/ciaran/conductor/workspaces/ciaranlyons/chiang-mai`. The original plan was read from the sibling `marseille` workspace and copied here as the living implementation record. The inspected baseline is `origin/main` at `95fa86cff748ccf9a874e91b7c1ce933b32d96cf`, which features On Alignment. Implementation started with the clean existing `clyons/streamline-publishing-deploys-execute` branch, verified equal to current `origin/main`; the user explicitly required retaining its name. Never append work to a merged branch.

`content/writing/*.md` contains essays and their metadata. `src/lib/content.ts` loads them and enforces that at most one is featured. `src/pages/index.astro` selects the featured essay. Canonical Writing URLs use `/writing/YYYY/MM/DD/slug/`. Content changes also affect archive pages, feeds, Pagefind search, and generated social images.

`package.json` currently defines `lint` as `astro check` and `build` as `node scripts/clean-dist.mjs && astro check && astro build && node scripts/verify-og-images.mjs && pagefind --site dist && node scripts/write-well-known.mjs`. `scripts/clean-dist.mjs` deletes only `dist/`. The image verifier checks rendered image metadata and actual generated PNGs. The well-known-file writer enforces required identity values in production.

`.github/workflows/pr-quality.yml` has separate `pr-metadata` and `quality-checks` jobs. The second job waits for metadata, then installs dependencies and runs lint, standalone TypeScript checking, tests, and the build. Its PR body validation is currently an embedded shell script. `.github/pull_request_template.md` and the user/repository guides require the exact populated metadata contract and local validation before creating or editing a PR.

`.github/workflows/deploy-production.yml` deploys every `main` push using GitHub's `production` environment. It installs dependencies, runs lint/tests/build, invokes the SHA-pinned Cloudflare Wrangler action, and runs `scripts/smoke-production.mjs`. That smoke script currently checks common public routes, redirects, feeds, sitemap, and identity endpoints; it does not verify a particular newly edited article. Production uploads are serialized with cancellation disabled.

`.github/workflows/deploy-preview.yml` is manually dispatched from `main` for a supplied non-main ref. It uses `scripts/preview-ref.mjs`, retains validation, and uploads a branch preview. A plan or implementation does not itself request a live preview. Use workflow-contract tests to verify preview configuration unless a preview is explicitly requested.

`scripts/deploy-workflows.test.mjs` protects triggers, validation ordering, secret scopes, upload commands, timers, and the removal of the old artifact-copy path. `docs/operations/deploy.md` is the publishing/deployment authority; `docs/operations/publish-til.md` and `docs/operations/publish-found-quote.md` add content-specific requirements. `tests/ui/site.spec.ts` contains behavioral and screenshot tests. Its Playwright web server currently runs a full build, so launching it after a completed build can repeat work unless an existing server is reused.

## Plan of Work

### Milestone 1: Make routine content publication repeatable

Scope and result: replace one-off PR validation and page-verification scripts with small reusable commands and one short procedure. Avoid constructing a new deployment controller or a general-purpose publishing framework.

Files: add `docs/operations/publish-content.md`, `scripts/validate-pr-body.mjs`, `scripts/validate-pr-body.test.mjs`, `scripts/verify-publication.mjs`, and `scripts/verify-publication.test.mjs`; update `package.json`, `.github/workflows/pr-quality.yml`, relevant publishing runbooks, and repository `AGENTS.md` links where needed.

Extract the current PR metadata validation into a shared script used locally and by the workflow. Preserve exact headings, accepted ExecPlan paths, populated `N/A reason:` requirements, placeholder rejection, and referenced-plan existence checks. The source of truth must remain shared: do not introduce a second, approximately equivalent validator. Preserve the automatic re-run on PR body edits and validate the saved PR body after creation.

Implement a read-only verification command initially supporting Writing files. Given a source file, derive its canonical path and expected title/description/featured status using existing repository conventions. Accept an explicit local HTTP origin for a built artifact and default to the production HTTPS origin for public verification. Check the article's title and metadata, canonical URL, social-image references and dimensions, archive/feed presence, and homepage selection. Validate the selected file is inside the supported content directory and reject unsafe paths/origins; never execute instructions from Markdown. Keep copy/formatting fidelity and visual image review as explicit human/agent checks, rather than assuming every article should lack emphasis or links.

Document a compact sequence: read the applicable contract once; finish source edits; run one local validation pass; review affected article/homepage layouts and the exact social preview; validate the PR body; create/read back the focused PR; wait for required checks; verify intended commits before merge; follow the production run for that exact merge SHA; perform one targeted public check after success. Reuse an already built `dist/` for browser review. Only rebuild or repeat checks after changed inputs, failures, or a specific unresolved concern. Log source revision/diff identity and build time with evidence; a new build containing changed remote Notes invalidates prior artifact-specific review even if Git source did not change.

Commands: run the new script tests, run the validator on the implementation PR body, build once, and run publication verification against that served artifact. Acceptance: a newcomer can publish a small Writing edit using checked-in commands and the runbook, without copying ad hoc scripts from a past session. Verification and PR validation must exit nonzero for substantive mismatches. Do not add automatic merge, posting, deployment, or credential handling to these helpers.

### Milestone 2: Check once per CI validation job

Scope and result: retain lint as a visible gate and eliminate the additional `astro check` nested in the same job's build.

Files: `package.json`, `.github/workflows/pr-quality.yml`, `.github/workflows/deploy-production.yml`, `.github/workflows/deploy-preview.yml`, `scripts/deploy-workflows.test.mjs`, and `docs/operations/deploy.md`.

Add `build:artifact` containing the existing clean, Astro render, image verification, Pagefind, and well-known-file steps, in their current order, without `astro check`. Make public `build` compose `npm run lint && npm run build:artifact`. Workflows keep their explicit lint and test steps and call `build:artifact` afterward. Keep the PR's standalone `npx tsc --noEmit` gate; overlapping tools are not grounds to remove that existing requirement in this initiative.

Extend workflow-contract tests to assert that every artifact build/deploy is preceded by lint and tests in the same revision/job, the public build retains lint, clean output and image verification remain mandatory, and failure prevents upload. Update tests that refer literally to the former build command without weakening their semantic checks. Keep PR metadata validation, existing job/check names, triggers, permissions, production environment, serialized uploads, manual-only previews, and smoke-test behavior intact.

Commands: run the workflow-contract tests, full Node test suite, lint, TypeScript checking, and the new artifact command in that order; separately inspect and smoke-check the safe public build composition. Acceptance: logs for each CI validation job contain one Astro check, and a failed check prevents rendering/upload. A standalone `npm run build` remains safe and produces a complete verified site.

### Milestone 3: Install deployment tooling once and use package caches consistently

Scope and result: remove the deployment action's floating, extra `npm i wrangler@4` path and reduce repeated downloads without treating cached files as trusted production artifacts.

Files: `package.json`, `package-lock.json`, all three workflow files, `scripts/deploy-workflows.test.mjs`, and `docs/operations/deploy.md`.

Before editing action inputs, read current primary Cloudflare documentation through the configured Cloudflare docs tools and the source/docs for the exact pinned Wrangler action. Select and validate an exact compatible Wrangler dependency version; the observed run used `4.152.0`, but that observation is not a requirement to install an outdated version later. Install it as a development dependency and align the action's supported version selection with that locked CLI so the action reuses it. Keep the action pinned by commit SHA. Do not change the lockfile or install packages during upload.

Enable setup-node's npm download cache in PR checks, matching the existing production/preview approach and the repository lockfile. Do not cache `dist/`, `.env*`, session tokens, deployment credentials, identity files, or unverified installed dependency trees. A cache miss must fall back to the same locked install and all checks. Do not assume moving Wrangler into `npm ci` makes its install cost disappear: compare total install-plus-upload time, including a cold cache. If measurements show no net benefit, retain only the reproducibility improvement and document that outcome.

Commands: run a clean `npm ci --ignore-scripts` in a disposable worktree, inspect the local locked Wrangler version, run the Node/workflow-contract tests, then observe the authorized production release. Acceptance: upload logs show the installed locked CLI is reused, no floating package installation occurs, and `git diff -- package.json package-lock.json` is empty after executing the upload action in CI. Existing secret scopes and cold-cache behavior remain correct.

### Milestone 4: Validate, release, and measure

Scope and result: prove functional equivalence and quantify the improvement without making artificial production edits just to generate timing samples.

Files: maintain this plan, `docs/operations/deploy.md`, the new publishing runbook, and tests changed in earlier milestones. Add concise timing output to the workflow summaries if needed; retain the existing always-run total timer. Separate runner queue/setup time from work time when comparing GitHub run/job/step timestamps.

Exercise failure cases in local fixtures/disposable worktrees: malformed PR body, missing referenced plan, bad source path, wrong expected metadata, absent social image, lint/test/build failure, and missing required production identity values. Do not deploy intentionally broken revisions. Existing/new workflow-contract tests must establish upload is gated on successful validation. Preserve the production smoke test and supplement it with the new targeted page verifier; its one-second measured cost gives no reason to remove it.

When implementation publication is authorized, create one focused PR from a fresh branch, validate its completed body locally, read the saved body back, wait for the metadata gate and quality checks, and merge only the intended head. Follow the production run associated with the exact merge SHA and verify its public result. A preview remains on request only. Do not manually upload `dist/`, reuse a PR build for production, or push to the merged branch.

Record local preparation/validation duration, PR run duration, production run duration, install-plus-tooling time, queue time, and public-verification duration. Initial targets for a routine small Writing edit are approximately four minutes from final copy to verified live publication and no more than 150 seconds combined for PR and production workflows under comparable runner/cache conditions, versus the observed 180 seconds. These are targets to measure, not a promised SLA or achieved result. Report the first optimized release honestly; collect additional samples during subsequent authorized publications rather than creating dummy pushes. Defer incremental HTML/image/search builds and changes to remote-Note fetching to a separate plan unless the new profile establishes a material remaining bottleneck.

Acceptance: all functional checks pass on the implementation revision, an authorized production run and targeted live verification succeed, and the plan contains a before/after table with cache/queue conditions and explanations for missed targets. Do not declare a speedup from the 1.73-second upload figure alone or from comparing unlike cold/warm runs.

## Concrete Steps

Run from the repository root. At implementation start, read the current `AGENTS.md`, `.agent/PLANS.md`, and deployment runbook, then create a fresh feature branch from current `origin/main`. Do not reuse this planning branch after it has merged.

Inspect the recorded baseline without publishing:

    gh run view 39963143153 --json createdAt,startedAt,updatedAt,jobs,url
    gh run view 39963404745 --json createdAt,startedAt,updatedAt,jobs,url
    gh run view 39963404745 --log

After implementing the proposed scripts and build split, run one validation pass:

    npm ci --ignore-scripts
    node --test scripts/validate-pr-body.test.mjs scripts/verify-publication.test.mjs scripts/deploy-workflows.test.mjs
    npm run lint
    npx tsc --noEmit
    npm test
    npm run build:artifact
    git diff --check

Expected: every command exits 0; Astro reports no diagnostics; all tests pass; the artifact command ends with `Verified <count> page-specific social preview images.` and a completed Pagefind index. The count depends on actual content and the remote Note snapshot. The safe standalone equivalent for a normal build remains `npm run build`.

Use the same artifact for review in a separate terminal:

    PORT=4377 node scripts/serve-dist.mjs
    node scripts/verify-publication.mjs --file content/writing/on-alignment.md --origin http://127.0.0.1:4377

Expected: title, description, canonical/social metadata, archives/feed links, generated image, and homepage feature agree with the chosen source. Open the article and homepage at desktop/mobile widths, and inspect the exact PNG under `dist/og/writing/2026/10/23/on-alignment.png`. For the UI suite, reuse that running server with the test configuration's matching port (`PLAYWRIGHT_PORT=4377`); do not trigger a second full build merely to review the same output. Run the UI tests required by the actual scope and content-specific runbook; refresh and inspect baselines only when intended visuals changed.

Before an implementation PR write, render its body from `.github/pull_request_template.md`, populate this plan's path and real evidence, then run:

    node scripts/validate-pr-body.mjs --body-file .context/publishing-deploys-pr.md

Expected: valid bodies exit 0; invalid bodies fail locally before `gh pr create` or `gh pr edit`. Use `--body-file`, read back the resulting PR, and confirm the metadata gate starts successfully. After an authorized merge, find the production run by its merge SHA with `gh run list --workflow deploy-production.yml --branch main --commit <merge-sha>`, follow that run, and then execute:

    npm run smoke:production
    node scripts/verify-publication.mjs --file content/writing/on-alignment.md --origin https://ciaranlyons.com

The new command interfaces are implemented and were exercised during this authorized execution. The original planning-only instruction no longer applies.

## Validation and Acceptance

1. The exact PR metadata contract remains shared and locally executable. Valid/invalid body fixtures cover headings, placeholders, substantive N/A explanations, and nonexistent plans; workflow edit-trigger behavior remains unchanged.
2. Each PR/production/preview validation job performs Astro checking once, keeps every currently required gate, and cannot upload after failed validation. Public `npm run build` includes lint and a clean, complete verified artifact.
3. PR checks, production, and previews install from the lockfile. The deployment action reuses the selected Wrangler version without changing dependencies during upload. Cached and uncached installation paths preserve correctness.
4. Production remains every-main-push only, previews remain manual and non-main, production uploads remain serialized, and only the production environment supplies its identity values. No credential or secret scopes change.
5. Local artifact review and final public verification cover the edited routes and feature selection. Existing TIL/Found Quote requirements remain fulfilled. Visual review is retained where specified, without redundant rebuilds for unchanged output.
6. Full Node tests, applicable UI tests, TypeScript checks, lint, image verification, clean build, production smoke, and targeted public verification pass. Include substantive evidence in this plan and the PR.
7. The final timing table distinguishes measured results from goals, shows the full install/upload cost, and describes queue/cache variance. If targets are missed, identify the remaining measured cause rather than removing correctness gates.

## Idempotence and Recovery

Read-only PR/page verification and timing inspection are safe to repeat. Builds recreate only ignored `dist/`; they may see a newer public Bluesky feed, so re-review changed generated output. Reuse existing successful check evidence only for the unchanged source and reviewed artifact; invalidate it after relevant edits or a new build with different inputs.

Never overwrite `.env.local` or `.env.cli`, read credentials into logs, or relocate deployment secrets. Use the configured Cloudflare MCP for any later account/configuration work; this plan does not require DNS, account, or secret changes.

If cache restoration fails, use a locked cold install and retain all gates. If the new build composition or tool pin fails, restore the prior script/workflow configuration together and rerun validation; do not bypass checks or install a floating version during upload. Keep the old npm script's safe behavior available until contract tests establish equivalence.

For failed production or smoke verification, follow `docs/operations/deploy.md`: fix and merge a new commit, or merge a revert of the offending main commit. A known-good source with an infrastructure-only failure can use GitHub's existing re-run path. Do not publish manual artifacts, create replacement sites, or append fixes to a merged branch. After an ambiguous external action, inspect its existing run/PR state before resubmitting.

## Artifacts and Notes

Baseline reference: PR [#91](https://github.com/clyons/ciaranlyons/pull/91), merge `95fa86cff748ccf9a874e91b7c1ce933b32d96cf`, 2026-10-23. The GitHub run links below are durable evidence; this plan does not depend on ignored `.context/` files being present.

| Measurement | PR run | Production run |
| --- | ---: | ---: |
| Total run, including runner/job scheduling | 90s | 90s |
| Main validation/deploy job | 73s | 85s |
| Dependency install | 12s | 8s |
| Standalone lint | 12s | 14s |
| Standalone TypeScript check | 5s | Not a separate step |
| Tests | 4s | 4s |
| Build step, including another Astro check | 31s | 30s |
| Upload action, including Wrangler setup/publish | Not applicable | 19s |
| Production smoke test | Not applicable | 1s |

Sources: [PR run 39963143153](https://github.com/clyons/ciaranlyons/actions/runs/39963143153), [production run 39963404745](https://github.com/clyons/ciaranlyons/actions/runs/39963404745). Step durations are whole-second API timestamps and do not necessarily sum to run duration because of setup, queues, and teardown. The PR also has a separate nine-second metadata job. Production logs show 12.53s of Astro rendering and 1.73s of actual changed-file transfer; neither is an end-to-end delivery measurement.

Implementation evidence (2026-10-23):

Final integrated validation after rebasing onto main `d61b4be370700d56f03ffaafd8fed65688029bba`: `npm ci --ignore-scripts` 6.05s; `npm run lint` 7.44s; `npx tsc --noEmit` 1.71s; `npm test` 1.85s; `npm run build:artifact` 14.32s; `git diff --check` 0.01s. Total 31.38s, 122 passing Node tests, 141 Astro files with zero diagnostics, 4,097 rendered pages and 96 verified social images. Full UI: 116 passed, 4 known Writing/TIL snapshot mismatches in 13.6s; the four mismatches were reproduced against a separate latest-main artifact. Targeted local On Alignment verification: 37ms. Refreshed article/homepage desktop/mobile screenshots use `.context/integrated-*`; exact social PNG matches prior reviewed output.


- Local Node v24.14.0: locked `npm ci --ignore-scripts` 3.64s (warm downloads); focused fixtures 1.95s; `npm run lint` 6.67s (120 files, zero errors/warnings/hints); `npx tsc --noEmit` 1.75s; full Node suite 1.41s; artifact build 8.85s; whitespace check 0.02s. Initial complete pass: 24.32s. After the executable-frontmatter regression fixture and archive-link structural correction, the full suite has 110 passing tests. No rendered input changed after the reviewed build.
- Artifact: 4,097 pages, 96 verified social PNGs, 2,678 indexed pages. Manifest contains 6,945 files. On Alignment and On Ownership verification each passed against the same served artifact in 86ms. Source started at `95fa86cff748ccf9a874e91b7c1ce933b32d96cf`; final PR commit identifies the helper/workflow revision. Build completed at 14:11:42Z.
- Visual review: `.context/article-desktop.png`, `article-mobile.png`, `home-desktop.png`, `home-mobile.png`, and `dist/og/writing/2026/10/23/on-alignment.png`; text, selection, spacing, and social-card legibility are intact. Full UI: optimized 110 passed / 8 baseline screenshot mismatches in 15.2s; separate current-main artifact 110 passed / same 8 mismatches in 12.6s. HTML and images are byte-identical.
- Failure checks: malformed/placeholder/checklist-only PR bodies, nonexistent and escaped plans, unsafe origins/paths, wrong metadata/homepage/feed/archive/image, executable frontmatter, real shell lint/test/build-stage failures, and missing production identities all reject. No broken revision was deployed. The standalone build was exercised with failing lint in a fixture; baseline's original safe build also succeeded on pristine application source.
- Disposable worktree with an empty npm cache: optimized `npm ci --ignore-scripts` 32.33s, local CLI reports 4.152.0. Independent baseline with its own empty cache: 21.64s dependencies + 14.77s action-equivalent floating Wrangler install = 36.41s. This sequential local macOS/Node 24 sample is not directly comparable to Linux CI; a 4.08s difference is preliminary evidence only, with no guaranteed benefit.

| Measurement | Baseline #91 | Optimized implementation |
| --- | ---: | ---: |
| PR run including scheduling | 90s | Pending release |
| Production run including scheduling | 90s | Pending release |
| Combined run duration | 180s | Pending release |
| Production dependency install + upload action | 8s + 19s = 27s | Pending release |
| Local empty-cache install + separate tool install | 21.64s + 14.77s = 36.41s | 32.33s including locked tool |
| Local validation pass | Not measured | 24.32s, plus visual/UI review |
| Targeted local article verification | Not measured | 86ms |
| Final-copy-to-live routine content duration | Approximately 7 minutes reported, uninstrumented | This implementation is not a routine content publication; target not assessed |

Complete the release rows after the authorized production run. To respect the prohibition on pushing to a merged branch and on artificial timing-only production pushes, retain final release evidence in the local living plan and merged PR description, ready to persist with the next substantive publication; do not create a dummy production release solely to record its own timing.

 Store bulky local logs/screenshots under ignored `.context/`; commit only concise evidence and intentional UI baselines. Do not fabricate timestamps for the unmeasured portion of the earlier seven-minute publishing turn.

Planning validation on 2026-10-23: a Node assertion script confirmed the title and all 13 required section headings match the template, every progress checkbox has a UTC timestamp, all four milestones are present, and both baseline run IDs are retained. `git diff --check` exited 0. Application builds/tests were not repeated for this documentation-only plan creation.

## Interfaces and Dependencies

- Existing platform: Node 22 CI, npm lockfile, Astro, Pagefind, Sharp, GitHub CLI/Actions, SHA-pinned Cloudflare Wrangler action, and the existing Cloudflare Pages project. Keep hosting and deployment ownership unchanged.
- Proposed `node scripts/validate-pr-body.mjs --body-file <path>`: read-only validation; exit 0 on the shared metadata contract, nonzero on failure. Keep the workflow's caller-provided body as data, never shell code.
- Proposed `node scripts/verify-publication.mjs --file <writing-markdown> --origin <origin>`: read-only local/public checks derived from supported content metadata; exit nonzero on mismatches; no authentication, mutation, browser-profile access, or deployment.
- Proposed `npm run build:artifact`: clean/render/verify/index/write-identity pipeline after same-job lint; public `npm run build` composes lint and this command. Existing `npm run lint`, `npm test`, `npx tsc --noEmit`, and `npm run smoke:production` retain their contracts.
- Wrangler: exact development dependency selected at implementation time using primary documentation, locked with npm, and reused by the existing action. No additional cloud service or new credential is required.
- Keep dependencies for tests/helpers minimal and reuse existing libraries. Do not add an orchestrator, scheduled job, incremental-build platform, or automatic social-posting behavior.

## Change Log

- 2026-10-23: Executed milestones 1–3 in chiang-mai, added failure and cold-cache evidence, and documented independently reproduced UI snapshot debt. Production receipt is pending.
- 2026-10-23: Created this plan from `.agent/execplans/TEMPLATE.md`, grounded it in PR #91's measured timings, and separated planning from future implementation and deployment.
