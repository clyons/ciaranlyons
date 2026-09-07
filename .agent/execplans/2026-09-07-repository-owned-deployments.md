# Move deployments into this repository

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

The CiaranLyons.com source repository will own its deployments instead of requiring a second repository (`clyons/resume`) and a manually copied `gh-pages` artifact. Every push to `main`—including every merged pull request—will build, test, upload, and smoke-test the production site. Maintainers will be able to request a Cloudflare Pages preview of `development` or any feature branch from the Actions UI without enabling deployment on ordinary branch pushes.

The observable result is a successful `Deploy production site` workflow on a merge to `main`, a `Deploy preview site` workflow that reports a Pages preview URL when dispatched with a non-`main` branch, and no remaining deployment instruction that points to `clyons/resume`.

## Progress

- [x] (2026-09-07 20:34Z) Inspected the current manual `clyons/resume` deployment procedure, repository workflows, build requirements, and GitHub repository configuration.
- [x] (2026-09-07 20:34Z) Chose Cloudflare Pages direct upload: it supports a production upload plus stable branch preview aliases while keeping preview deployment manual.
- [x] (2026-09-07 20:48Z) Added production and on-demand preview workflows, a unit-tested preview-ref validator, and workflow timing summaries.
- [x] (2026-09-07 20:42Z) Replaced the old deployment documentation, updated the TIL publishing instructions, and removed the GitHub Pages-only `public/CNAME` and `public/.nojekyll` files.
- [x] (2026-09-07 20:42Z) Validated the workflows, tests, lint, and clean build; recorded the local build timing below.
- [x] (2026-09-07 22:00Z) Rebuilt the current `origin/main` revision (`a5dcedb`) in an isolated worktree and uploaded it to production to synchronize Pages with the canonical source. Lint, 28 tests, production build, and post-upload smoke tests passed.

## Surprises & Discoveries

- Observation: This repository has no GitHub Pages configuration, GitHub Actions deployment environment, or repository Actions secrets.
  Evidence: `gh api repos/clyons/ciaranlyons` returned `has_pages: false`; the Pages endpoint returned 404; the environments endpoint returned no environments; and the Actions secrets listing returned no names.
- Observation: A production build intentionally fails without the two identity values when `REQUIRE_WELL_KNOWN=true`.
  Evidence: `docs/operations/deploy.md` and `scripts/write-well-known.mjs` define this safeguard.
- Observation: The prior Pages production artifact came from an older source revision and differed from `origin/main`; a DNS cutover alone does not synchronize an existing Direct Upload artifact.
  Evidence: the prior public homepage contained `This site: writing, notes, projects, and TILs under my own domain.`, while the `origin/main` build at `a5dcedb` contains `This site: writing, notes &amp; various projects.`

## Decision Log

- Decision: Use Cloudflare Pages Direct Upload rather than retaining GitHub Pages or copying artifacts into another repository.
  Rationale: The site is a static Astro build, and Pages supports a production upload plus branch-specific preview URLs. Direct upload keeps all build, test, and deployment logic in this repository and removes the `clyons/resume` dependency.
  Date/Author: 2026-09-07 / Codex
- Decision: Make previews `workflow_dispatch` only, with an explicit ref input, instead of deploying every branch push or every pull request.
  Rationale: This satisfies previews "on request," controls deployment volume, and avoids granting a deployment path to routine feature pushes.
  Date/Author: 2026-09-07 / Codex
- Decision: Put identity build values in the GitHub `production` environment and do not make them available to previews.
  Rationale: Production needs both identity files and must fail closed if either is absent. Preview sites do not need those public-domain identity records.
  Date/Author: 2026-09-07 / Codex
- Decision: Measure elapsed checkout-to-result time in the Actions job summary and treat the first successful post-cutover production deployment as the baseline.
  Rationale: This captures the user-visible automated delivery path, including correctness gates and production smoke testing. Subsequent tuning must retain those gates.
  Date/Author: 2026-09-07 / Codex
- Decision: Perform the one-off production synchronization from the exact `origin/main` commit after validating it in an isolated worktree.
  Rationale: It restores the canonical source immediately without mixing a content change into the deployment-automation branch. Future source synchronization remains the responsibility of the merge-triggered workflow after that workflow is merged.
  Date/Author: 2026-09-07 / Codex

## Outcomes & Retrospective

The repository has a reviewed-but-not-yet-merged automatic production path on every push to `main`, manually requested non-`main` branch previews, production-only identity values, timing summaries, and regression tests for that contract. The prior artifact-copy procedure and GitHub Pages marker files are gone.

The required one-time Cloudflare project, custom-domain, GitHub Environment, and Actions secret setup is complete. The custom domain is active and the one-off synchronization upload took 20 seconds (following a 10-second local install/lint/test/build validation run); production smoke tests passed. The first merge-triggered Actions run remains the automation baseline to record in GitHub after this branch merges.

## Context and Orientation

`package.json` defines the Astro validation, test, and build commands. Its `build` command first clears `dist/`, type-checks and builds the site, then runs `scripts/write-well-known.mjs`. Production must supply `ATPROTO_DID` and `STANDARD_SITE_PUBLICATION_AT_URI` with `REQUIRE_WELL_KNOWN=true`; otherwise that script intentionally fails.

The existing `docs/operations/deploy.md` documents a manual process that copies `dist/` to the `gh-pages` branch of `clyons/resume`. `docs/operations/publish-til.md` repeats that obsolete dependency. The current GitHub Actions workflows only enforce pull-request quality and branch hygiene; none deploy this repository.

The implementation will add Cloudflare Pages Direct Upload workflows under `.github/workflows/`. Production will deploy on a `push` to `main`. Previews will only run when a maintainer dispatches the preview workflow from `main` and supplies `development`, `origin/development`, or a non-`main` feature branch. Cloudflare Pages treats an upload without `--branch` as production and one with `--branch` as a preview.

## Plan of Work

1. Add `scripts/preview-ref.mjs`, a narrow command-line validator that normalizes `origin/<branch>` to `<branch>`, rejects `main`, and writes a safe Actions output. Add Node tests covering accepted and rejected refs.
2. Add a production workflow with least-privilege GitHub permissions. It will use Node 22, `npm ci --ignore-scripts`, lint, test, build with production environment secrets, deploy `dist/` through the pinned Cloudflare Wrangler action, and run the existing production smoke test. Concurrency will serialize production uploads without cancelling a merge-triggered deployment. A final always-run step will write the elapsed checkout-to-result duration to the job summary.
3. Add an on-demand preview workflow. It will accept a branch ref, validate it, check out that ref, run the same local checks, build without production identity values, and deploy `dist/` to a Pages branch preview. It will report the immutable and branch-alias URLs plus elapsed checkout-to-result duration in the Actions summary. It will use per-ref concurrency and may cancel an older preview request for the same ref.
4. Add workflow-configuration tests that preserve the production trigger, manual-only preview trigger, identity secret boundary, test gates, Cloudflare deploy commands, and absence of the former artifact repository and GitHub Pages marker files.
5. Replace the deployment runbook with the one-time setup, normal production behavior, preview procedure, recovery process, and required secret names. Update the TIL publishing runbook to say that merge automation deploys the site.

## Concrete Steps

From repository root:

    npm ci --ignore-scripts
    npm run lint
    npm test
    npm run build
    git diff --check

After the change merges, a maintainer must follow `docs/operations/deploy.md` to create the Direct Upload Pages project `ciaranlyons`, attach `ciaranlyons.com` and `www.ciaranlyons.com`, create the GitHub `production` environment, and add the documented Actions secrets. Then merge a verified change to `main` and confirm the production workflow and `npm run smoke:production` pass. Request a preview from Actions with `development` or a feature ref and open the URL from the workflow summary.

## Validation and Acceptance

- `npm run lint`, `npm test`, and `npm run build` exit 0 from the repository root. The tests prove preview-ref behavior and the semantic deployment workflow contract.
- `git diff --check` emits no whitespace errors.
- The production workflow runs only for `push` events on `main`, tests before deployment, deploys `dist/` without a Pages branch option, has production-only identity values with `REQUIRE_WELL_KNOWN=true`, and runs `npm run smoke:production` afterward.
- The preview workflow has only a manual trigger, checks out the supplied non-`main` ref, tests before deployment, supplies `--branch`, and does not expose production identity values.
- The deployment and TIL runbooks contain no `clyons/resume` deployment procedure.

## Idempotence and Recovery

Running lint, tests, and builds is safe to repeat; `build` removes and recreates only the ignored `dist/` directory. Re-running a production workflow uploads another immutable production deployment, so production jobs are serialized. Re-running a preview replaces that branch alias with the new preview artifact; same-ref preview requests cancel older in-progress jobs.

If a production deployment or smoke check fails, do not copy artifacts to the old repository. Fix and merge a new commit to `main`, which starts another production workflow. To roll back content, revert the offending `main` commit and merge the revert; that automatically deploys the reverted artifact. If Cloudflare credentials or custom-domain setup are wrong, correct the external configuration in the runbook, then use GitHub Actions' Re-run jobs on the affected production workflow.

## Artifacts and Notes

- Cloudflare Wrangler action v4 ref resolved on 2026-09-07: `ebbaa1584979971c8614a24965b4405ff95890e0`.
- Cloudflare Direct Upload documentation confirms `wrangler pages deploy <directory>` for production and `--branch=<name>` for previews.
- 2026-09-07 validation from repository root:
  - `npm ci --ignore-scripts` completed: 326 packages installed; audit reported 0 vulnerabilities.
  - `npm run lint` passed: Astro checked 63 files with 0 errors, warnings, and hints.
  - `npm test` passed: 34 tests, 0 failures. This includes the deployment workflow contract, timer, legacy-marker, and preview-ref tests.
  - `time npm run build` passed: 40 static pages built; local clean build elapsed 4.126 seconds. This is a local build-only measurement, not the deployment baseline.
  - Ruby parsed both new workflow files as valid YAML; `git diff --check` passed.
- 2026-09-07 live synchronization:
  - Exact source revision: `origin/main` at `a5dcedb24c2c9235edf284efe6fc45c24b630054`.
  - Isolated validation: `npm ci --ignore-scripts`, `npm run lint`, `npm test` (28 passing), and a required-identity production build all passed in 10 seconds.
  - Production upload: `wrangler 4.61.0 pages deploy dist --project-name=ciaranlyons` completed in 20 seconds.
  - Post-upload: both `https://ciaranlyons.com/` and `https://ciaranlyons.pages.dev/` returned HTTPS 200 and contained the canonical project copy; `npm run smoke:production` passed all checks; the Pages custom domain reported `active`.

## Interfaces and Dependencies

- GitHub Actions secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` for both workflows; `ATPROTO_DID` and `STANDARD_SITE_PUBLICATION_AT_URI` in the GitHub `production` environment only.
- Cloudflare Pages project: `ciaranlyons`, configured as Direct Upload. Production has `https://ciaranlyons.com`; previews receive Cloudflare Pages URLs.
- Removed legacy GitHub Pages artifacts: `public/CNAME` and `public/.nojekyll`. Cloudflare custom-domain configuration is account-managed and must not be represented by either file.
- `.github/workflows/deploy-production.yml`: `push` to `main` contract.
- `.github/workflows/deploy-preview.yml`: `workflow_dispatch` ref input contract.
- `scripts/preview-ref.mjs`: exported `normalizePreviewRef(ref)` and a CLI that emits the normalized `branch` output for Actions.

## Change Log

- 2026-09-07: Created the plan from template and recorded the selected deployment architecture.
- 2026-09-07: Implemented repository-owned Cloudflare Pages production and preview workflows, timing instrumentation, validation tests, and migration documentation.
