# Publish content

Use this procedure for a small Writing edit. [TIL publishing](./publish-til.md) and [Found Quote publishing](./publish-found-quote.md) add their own content, search, feed, and UI requirements; retain those checks when using this common procedure. [Deployment](./deploy.md) owns production and preview policy.

1. Read the relevant runbooks, `AGENTS.md`, PR template, and PR metadata gate once. Start from current `origin/main` on an unmerged feature branch. Finish the copy and metadata before validation. Writing files live in `content/writing/<slug>.md`; the date determines `/writing/YYYY/MM/DD/<slug>/`. At most one file may set `featured: true`; otherwise the latest Writing is selected for the homepage.
2. Run one local pass, recording start/end times and source identity:

   ```bash
   set -e
   date -u '+%Y-%m-%dT%H:%M:%SZ'
   git rev-parse HEAD
   git diff HEAD --binary | shasum -a 256
   npm ci --ignore-scripts
   npm run lint
   npx tsc --noEmit
   npm test
   npm run build:artifact
   git diff --check
   date -u '+%Y-%m-%dT%H:%M:%SZ'
   ```

   Stop on failure. `build:artifact` is for a pass that already ran lint successfully on the same source. Standalone `npm run build` runs lint first and remains the safe general build command. The artifact cleans `dist/`, renders Astro, verifies social previews, indexes Pagefind, and writes identity files. Keep command output and build timestamps in ignored `.context/`; include concise results in the PR. For committed source, record the commit SHA; for uncommitted changes, also record the diff digest and paths/digests of untracked source files.
3. Reuse that artifact for HTTP and visual review:

   ```bash
   PORT=4377 node scripts/serve-dist.mjs
   # In another terminal:
   npm run publication:verify -- --file content/writing/on-alignment.md --origin http://127.0.0.1:4377
   PLAYWRIGHT_PORT=4377 npm run test:ui -- --grep 'document heads|homepage'
   ```

   Supply the Writing file being published. The read-only verifier checks the article title and metadata, canonical URL, exact social-image URLs/alt text, actual 1200×630 PNG, Writing archives (including the dated archives), RSS item, and homepage feature against source. Only production HTTPS and explicit loopback HTTP origins are accepted. It does not execute Markdown or publish anything. TIL and Found Quote paths are not supported by this helper yet; use their runbooks' route checks.

   Open the article and homepage at desktop/mobile widths. Review copy and formatting fidelity, including intentional emphasis and links. Open the **exact** `dist/og/writing/YYYY/MM/DD/<slug>.png`; check legibility and truncation. Dimensions alone cannot establish visual quality. Run additional UI tests required by the actual scope. Playwright reuses this server locally; leave `CI` unset. Do not update approved baselines unless visuals intentionally changed.

   Builds fetch public Bluesky Notes. A new build can change output even on the same Git revision. Record build time and artifact identity (for example, sorted SHA-256 hashes of `dist/` files under `.context/`); compare a later manifest and re-review changed output. Rebuild or repeat checks only after changed inputs, failures, or a specific unresolved concern.
4. Compose `.context/content-pr.md` from `.github/pull_request_template.md`. Retain the exact headings, populate an existing ExecPlan path or `N/A reason: <substantive explanation>`, replace every placeholder, and include real validation output plus inspected preview paths. Before creating **or editing** the PR, run:

   ```bash
   npm run pr:validate -- --body-file .context/content-pr.md
   gh pr create --base main --title '<specific change>' --body-file .context/content-pr.md
   gh pr view --json body -q .body > .context/saved-pr-body.md
   npm run pr:validate -- --body-file .context/saved-pr-body.md
   gh pr checks
   ```

   The same validator runs in PR Quality Gates, including on body edits. Confirm its metadata job has started and passes; then wait for the required quality checks. Avoid polling an unchanged pending state in a tight loop.
5. Before merge, fetch `origin/main`, check `git log origin/main..HEAD --oneline`, and confirm every commit belongs to this change and the PR head still matches the validated commit. Merge only the intended head after required checks pass. A merged branch is retired; follow-up work requires a new branch.
6. Follow production for that **exact merge SHA**:

   ```bash
   gh run list --workflow deploy-production.yml --branch main --commit <merge-sha>
   gh run watch <run-id> --exit-status
   npm run smoke:production
   npm run publication:verify -- --file content/writing/on-alignment.md
   ```

   Production is successful only when the workflow, smoke test, and targeted public check pass. A preview is requested separately through the manual workflow only when explicitly needed. Never upload local artifacts. For a failed release, follow the recovery steps in the deployment runbook.

Record local preparation/validation, PR duration, production duration, dependency install plus upload/tooling, queue/setup, and targeted public verification separately. Cache hits and cold installs are different conditions. The first optimized release is one sample; collect more during real publications, without dummy production pushes.
