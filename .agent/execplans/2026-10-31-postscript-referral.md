# Add the Postscript application referral

This ExecPlan is a living document governed by `.agent/PLANS.md`.

## Purpose / Big Picture

Make `https://ciaranlyons.com/postscript` redirect immediately to `https://stealmysms.com/?ref=postscript`. The independently hosted destination will frame the application and measure referred visits and engagement in Google Analytics 4.

## Progress

- [x] (2026-10-31 23:27Z) Inspected both repositories, deployment contracts, Cloudflare project and DNS, and available analytics.
- [x] (2026-10-31 23:33Z) Added both redirect forms; lint/typecheck, 122 tests and artifact build passed, and dist/_redirects matches source.
- [x] (2026-10-31 23:35Z) Destination PR clyons/steal-my-sms#1 merged; Pages deployment 75200c54-d673-4f6c-8260-a710c771babb succeeded from 2722b370b5214ab1fdbb6f6c40be71e0fa361dc1. Public HTTP smoke passed with both referral modules and nine images.
- [ ] Merge the redirect PR and verify production.

## Surprises & Discoveries

- Observation: `steal-my-sms/` is an independent private Git checkout ignored by this parent repository. Its `main` branch publishes through Cloudflare Pages Git integration.
  Evidence: its remote is `clyons/steal-my-sms`; this repository has no tracked files at that path.
- Observation: Cloudflare MCP can inspect Pages and DNS but lacks Redirect Rules, Web Analytics and D1 scopes. These are explicit scope errors, not expired OAuth.
  Evidence: scoped 403/401 responses; Pages and DNS reads succeeded. Do not initiate another login. A source-controlled Pages `_redirects` file needs no new permission.
- Observation: Cloudflare Web Analytics does not retain query strings or support custom events. The user's existing Google Analytics account is accessible in Chrome.
  Evidence: Cloudflare Web Analytics FAQ; Analytics UI personal account Ciaran Lyons.

## Decision Log

- Decision: Use `public/_redirects` with exact slashless and trailing-slash paths and HTTP 302.
  Rationale: Pages processes redirects before serving content; 302 allows later application changes without permanently cached destinations.
  Date/Author: 2026-10-31 / Codex
- Decision: Use a separate GA4 property for the destination and standard campaign dimensions for `ref` labels.
  Rationale: Meets traffic and engagement needs without a backend or broader Cloudflare permission. Keep implementation in the independent repository.
  Date/Author: 2026-10-31 / Codex

## Outcomes & Retrospective

Destination published and publicly smoke-tested. Its separate GA4 property is configured and the production measurement module is served. Main-site redirect deployment and public verification remain.

## Context and Orientation

Astro copies `public/` into `dist/`. `.github/workflows/deploy-production.yml` is the sole production deploy controller for this repository. `docs/operations/deploy.md` describes the contract. The separate destination uses its own `dist/` source files and Git integration.

## Plan of Work

Create `public/_redirects` for both forms of `/postscript`. Document the redirect and reporting destination in `docs/operations/referrals.md`. Do not alter deployment workflows. In the separate checkout, use its own ExecPlan for the banner, GA4 setup, engagement events, and validation. Publish that destination before merging this redirect.

## Concrete Steps

From this repository root run `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build:artifact`. Inspect `dist/_redirects`. Validate the PR body with `npm run pr:validate -- --body-file .context/postscript-pr.md`. Open/read back the PR, confirm its metadata check, merge after checks pass, and monitor Deploy production site.

## Validation and Acceptance

Both `/postscript` and `/postscript/` return HTTP 302 with Location `https://stealmysms.com/?ref=postscript`. The destination renders a dismissible application banner and About page link. GA4 receives a real tagged browser visit and engagement events. Production smoke tests pass.

## Idempotence and Recovery

File edits and checks are repeatable. Inspect current PR/deployment state before retrying an uncertain publish. Roll back through a new revert commit on main; never push to a merged feature branch. Destination rollback follows its own runbook.

## Artifacts and Notes

Local validation: Astro 145 files, 0 errors/warnings/hints; TypeScript passed; 122 tests passed; artifact build verified 103 social previews and indexed 2,683 pages. Both expected redirect lines exist in dist/_redirects. Publication verification remains.

## Interfaces and Dependencies

Cloudflare Pages `_redirects` syntax; existing Astro public asset copying; independent destination GA4 property; no new npm dependencies or credentials.

## Change Log

- 2026-10-31: Created plan and recorded inspected infrastructure and permission limits.

- 2026-10-31: Updated acceptance to link to the About page at Ciaran’s request.
