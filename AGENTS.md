# Repository Agent Guide

## ExecPlans

When writing complex features or significant refactors, use an ExecPlan from `.agent/PLANS.md` from design through implementation.

Use an ExecPlan when any of these are true:

- The task will likely take longer than 60 minutes.
- The task touches multiple subsystems.
- The task changes auth, security, data model, or deployment behavior.
- The task has unknown feasibility and requires prototyping before final implementation.

Small, low-risk edits do not require an ExecPlan.

## ExecPlan Workflow

1. Create a plan file at `.agent/execplans/YYYY-MM-DD-<slug>.md` using `.agent/execplans/TEMPLATE.md`.
2. Keep the plan fully self-contained and understandable to a newcomer with only this repository.
3. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` updated as work proceeds.
4. Implement milestone-by-milestone; do not pause implementation to ask for "next steps" when the plan already defines them.
5. Include concrete validation evidence inside the plan and PR.

## Branch Hygiene (INVIOLATE)

These rules are mandatory. Violating them causes orphaned work that is silently lost.

1. **One branch = one feature.** Each feature branch must contain ONLY commits related to its named purpose. Unrelated fixes or config changes go on their own branches.
2. **Never push commits after PR merge.** Once a PR is squash-merged, the branch is dead. Any commits pushed afterward will be orphaned and lost. The branch is auto-deleted after merge.
3. **Verify branch is clean before merge.** Before requesting merge, confirm all branch commits are included: `git log origin/main..<branch> --oneline` should show only the commits you intend to merge.
4. **Follow-up work = new branch.** After a PR merges, pull latest main and create a fresh branch. Never reuse a merged branch.
5. **A post-merge CI check detects orphaned commits.** If you violate these rules, the `orphan-check` workflow will open an issue. Treat orphan issues as P0.

## Environment Files (INVIOLATE)

**Never overwrite `.env.local` with a heredoc, redirect, or any whole-file write.** Only ever edit specific values using `sed -i` or append with `>>`.

Rationale: `.env.local` at the repo root may be a symlink shared across worktrees. Overwriting it destroys every credential stored there.

**Required pattern:**
```bash
# CORRECT — edit one value
sed -i '' 's/^OLD_KEY=.*/OLD_KEY=newvalue/' .env.local
# CORRECT — add a missing key
echo "NEW_KEY=value" >> .env.local
# NEVER DO THIS — destroys all other values
cat > .env.local << EOF ... EOF
```

## Pull Request Requirements

Every substantial PR should include:

- The ExecPlan path (for example `.agent/execplans/2026-02-13-feature-name.md`)
- A short "what changed" summary
- Validation evidence (build, tests, or explicit `N/A` with reason)

## Cloudflare MCP

- For Cloudflare account, zone, DNS, SSL/TLS, redirect-rule, or related configuration work, use the configured `cloudflare` MCP server instead of asking for API tokens or relying on manual dashboard steps.
- The `cloudflare` server is authenticated user-wide with OAuth, including `dns.read` and `dns.write`. Never print, copy, or commit its credentials.
- Use the `cloudflare-docs` MCP server when current Cloudflare product or API documentation is needed.
- For changes to `ciaranlyons.com`, resolve the account and zone through the MCP, inspect the current state before writing, make the smallest required change, and read the result back to verify it.
- If the server is unavailable or reports an authentication error, first check whether the current Conductor session predates the latest OAuth authorization. Ask for a Conductor restart before initiating another login.

## TIL Publishing

When Ciaran says "TIL this", treat it as a publishing operation for `content/til`.

1. Find or create the appropriate topic directory under `content/til/<topic>`.
2. Create one Markdown document at `content/til/<topic>/<slug>.md`.
3. Use concise frontmatter: `title`, `description`, `date`, `updated`, and `tags`.
4. Preserve the useful factual detail, commands, code, error messages, links, and gotchas.
5. Keep the entry short. Do not inflate a TIL into an essay.
6. Add relevant primary-source links when available.
7. Open a focused diff or PR for review.

Published TIL URLs are date-foldered for hackability:

```text
/til/<topic>/<YYYY>/<MM>/<DD>/<slug>
```

Do not move existing TIL files or change slugs unless Ciaran explicitly asks for a URL migration.
