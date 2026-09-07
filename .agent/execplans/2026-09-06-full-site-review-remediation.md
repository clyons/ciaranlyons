# Remediate the full-site review

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `.agent/PLANS.md` as the governing standard for ExecPlans. Keep this document aligned with that contract.

## Purpose / Big Picture

Make CiaranLyons.com secure by default, complete and deterministic as its content grows, safe to operate, resilient without perfect networks or JavaScript, and easier to navigate with assistive technology. A visitor should never be downgraded to HTTP, every published note should receive a stable route, malformed or hostile content should fail safely, credential-bearing scripts should not leak or overwrite unrelated files, and the primary user journeys should have explicit automated checks.

The work originates from the full-site review completed on 2026-09-06. The accepted findings span hosting, content ingestion, ATProto integration, local operations, CI, search, accessibility, performance, privacy, feeds, metadata, and deployment. Because this repository requires one branch per feature, the milestones below are implementation batches intended for separate focused branches/PRs; the ExecPlan remains the shared roadmap and must record the branch/PR used for each batch.

## Progress

- [x] (2026-09-07 01:36Z) Converted the accepted review into a self-contained remediation plan.
- [x] (2026-09-07 01:40Z) Identified the single active full Cloudflare zone for `ciaranlyons.com` through MCP without changing it.
- [x] (2026-09-07 19:22Z) Reauthorized Cloudflare MCP with `zone-settings.read` and `zone-settings.write`; the zone now exposes `#zone_settings:read` and `#zone_settings:edit`.
- [x] (2026-09-07 03:10Z) Verified public DNS and response headers show Cloudflare-proxied traffic.
- [x] (2026-09-07 19:22Z) Enabled Cloudflare's zone-wide HTTPS redirect control and verified plaintext root/feed requests now redirect to HTTPS. The origin's slashless HTTPS downgrade remains until the trailing-slash repository changes deploy.
- [x] (2026-09-07 02:50Z) Completed the remaining P0 application and operations fixes with focused regression coverage.
- [x] (2026-09-07 03:06Z) Completed P1 trust-boundary, publishing determinism, media integrity, secrets, deployment, CI, and test hardening.
- [x] (2026-09-07 03:06Z) Completed P2 search, accessibility, performance, privacy, metadata, URL normalization, and sitemap improvements.
- [x] (2026-09-07 03:08Z) Completed local end-to-end validation and production smoke diagnostics; the final origin-routing checks remain deployment-dependent.
- [x] (2026-09-07 19:35Z) Reconciled the remediation with ten newer `origin/main` commits, preserving the editorial redesign, theme toggle, current content, TIL workflow, and latest-note URL handling.
- [x] (2026-09-07 22:04Z) Published the remediation in PR #34, passed required checks, merged it, and verified the later production deployment with the eight-check smoke suite.
- [x] (2026-09-07 22:19Z) Corrected the `www` HTTPS-to-HTTP redirect, enabled a conservative six-month HSTS policy, and verified the Cloudflare setting plus production response headers.

## Surprises & Discoveries

- Observation: The production host accepts plaintext HTTP, and an HTTPS request to an extensionless internal route returns a redirect whose `Location` uses `http://`.
  Evidence: On 2026-09-06, `https://ciaranlyons.com/about` returned `301 Location: http://ciaranlyons.com/about/`; `/writing`, `/notes`, `/projects`, `/til`, writing details, and note details behaved the same. `http://ciaranlyons.com/` returned `200 OK`, and the HTML response did not include `Strict-Transport-Security`.
- Observation: The static build itself is healthy despite the production transport defect.
  Evidence: `npm run build` checked 46 files with zero diagnostics and generated 31 pages; generated internal targets resolved, all four RSS files were well-formed XML, and `search.json` parsed successfully.
- Observation: The worktree already contained an unrelated `package-lock.json` modification before remediation began.
  Evidence: `git status --short --branch` showed only `M package-lock.json` before this plan was added. Preserve it unless a focused dependency batch intentionally owns and explains it.
- Observation: The connected Cloudflare MCP can list the account's zones but is not currently authorized to read zone SSL/TLS settings.
  Evidence: An unfiltered `GET /zones?name=ciaranlyons.com` returned one active full zone, ID `4e528e05a3b8472de30310dffedf72dd`, under the expected account. Both scoped and unscoped `GET /zones/4e528e05a3b8472de30310dffedf72dd/settings/always_use_https` attempts returned Cloudflare authentication error `10000`. No setting was changed.
- Observation: The public Bluesky feed currently contains one eligible post, matching the checked-in local note.
  Evidence: `npm run notes:sync -- --dry-run` reported `0 written, 1 skipped, 1 eligible` after path validation and atomic-write changes.
- Observation: Static GitHub Pages cannot emit permanent HTTP redirects from Astro compatibility pages.
  Evidence: the topic compatibility routes compile to HTML documents; the existing meta refresh is retained as a compatibility fallback. The canonical URLs are explicit, and real edge redirects require the same currently unauthorized Cloudflare control plane.
- Observation: The production identity records are present, but the deployed site predates the sitemap and URL-normalization changes.
  Evidence: the final production smoke reported `200` for both `.well-known` records and canonical `/about/`, but `404` for `sitemap-index.xml`; local build output contains `sitemap-index.xml`.
- Observation: The apex is publicly proxied through Cloudflare; this was established independently while the original MCP grant could not inspect its setting object.
  Evidence: Cloudflare nameservers are authoritative, apex A records resolve to `104.21.88.232` and `172.67.153.191`, and the HTTPS response includes `server: cloudflare` plus a `cf-ray` header while proxying GitHub Pages.
- Observation: Cloudflare's zone-wide redirect fixes plaintext entry requests but does not rewrite the GitHub Pages origin's `Location` header on an already-HTTPS slashless request.
  Evidence: After `always_use_https` changed from `off` to `on`, `http://ciaranlyons.com/` and `/feed.xml` returned `301` locations using HTTPS, while the currently deployed `https://ciaranlyons.com/about` still returned `301 Location: http://ciaranlyons.com/about/`. The implemented trailing-slash links avoid this path after deployment; `/about/` already returns `200` over HTTPS.
- Observation: The 2026-09-07 HSTS preflight found that all three proxied hostnames complete validated TLS, but `https://www.ciaranlyons.com/` still redirects to `http://ciaranlyons.com/` at the origin.
  Evidence: Cloudflare MCP returned an active/full zone, `always_use_https=on`, SSL mode `full`, active certificate status, and proxied records for the apex, `www`, and `email`. Public TLS verification succeeded for all three hosts; the apex returned `200`, `email` returned `404`, and `www` returned `301 Location: http://ciaranlyons.com/`. Correct the `www` redirect before enabling HSTS.
- Observation: Cloudflare's zone-level HSTS setting emits the header on each proxied hostname's HTTPS response even when `includeSubDomains` is disabled.
  Evidence: After the update, the apex, `www`, and `email` responses each returned `Strict-Transport-Security: max-age=15552000`; `www` now redirects directly to the HTTPS apex. `includeSubDomains` remains absent, so an apex policy does not automatically bind other subdomains that have not independently contacted Cloudflare over HTTPS.

## Decision Log

- Decision: Use Cloudflare's native zone-wide HTTPS redirect control as the first production mitigation, after confirming the exact `ciaranlyons.com` zone and current value through MCP.
  Rationale: The defect is at the deployed routing layer, affects ordinary navigation, and should be stopped at the edge independently of later URL-shape changes in Astro.
  Date/Author: 2026-09-07 / Codex
- Decision: Do not enable HSTS in the same initial mutation.
  Rationale: HSTS persists in browsers and has broader subdomain/certificate consequences. First enforce redirects and verify all relevant hostnames; evaluate HSTS as a separate reviewed step.
  Date/Author: 2026-09-07 / Codex
- Decision: After correcting the `www` downgrade redirect, enable HSTS with a six-month `max-age` (`15552000` seconds), without `includeSubDomains` or preload, and preserve `nosniff=off`.
  Rationale: Cloudflare recommends starting at six months and increasing to twelve after confirming stability. Leaving `includeSubDomains` and preload off avoids binding mail and future subdomains to the apex policy; preserving `nosniff` keeps this change limited to transport security.
  Date/Author: 2026-09-07 / Codex
- Decision: Keep complete route-generation datasets separate from presentation/feed limits.
  Rationale: A display limit must never decide whether a canonical static page exists.
  Date/Author: 2026-09-07 / Codex
- Decision: Establish runtime schemas and safe-path helpers before adding more ATProto or content features.
  Rationale: Dates, identifiers, paths, URLs, remote records, and media currently cross trust boundaries without a single validation layer, causing several related findings.
  Date/Author: 2026-09-07 / Codex
- Decision: Execute remediation as focused PR-sized branches rather than one broad implementation branch.
  Rationale: `AGENTS.md` requires one branch to contain only one feature; the accepted review covers multiple independent features and operational systems.
  Date/Author: 2026-09-07 / Codex
- Decision: Merge local and remote note collections with the local record winning an ID/URI collision, then apply display/feed limits only at the consumer.
  Rationale: Synced local records contain the richer preserved facet/media representation, while remote-only records still need canonical routes. Separating the complete collection from limited views prevents silent route loss.
  Date/Author: 2026-09-07 / Codex
- Decision: Remove the stale post-merge hook rather than replace its process-management behavior.
  Rationale: Astro already provides its development reload behavior, and a Git lifecycle hook should not own or restart an arbitrary local server.
  Date/Author: 2026-09-07 / Codex
- Decision: Remove Google Tag Manager until a deliberate analytics/privacy model exists.
  Rationale: No consent or documented first-party privacy basis exists in the repository; loading no analytics is the safest accurate implementation of the accepted privacy finding.
  Date/Author: 2026-09-07 / Codex
- Decision: Emit trailing-slash internal and canonical URLs while retaining compatibility HTML redirects.
  Rationale: GitHub Pages serves directory-index URLs directly over HTTPS, avoiding its scheme-downgrading slash normalization for ordinary site navigation. The hosting platform cannot represent permanent redirect status in static files.
  Date/Author: 2026-09-07 / Codex
- Decision: Complete the accepted P0–P2 repository remediation on the current `full-site-review-swarm` branch after Ciaran explicitly authorized all milestones.
  Rationale: Every change belongs to the single named full-site remediation outcome, and no unrelated work has been added.
  Date/Author: 2026-09-07 / Codex
- Decision: Treat the latest `origin/main` visual/content behavior as authoritative during reconciliation, then reapply only remediation guarantees that remain relevant.
  Rationale: Main advanced by ten commits after remediation began. Preserving its editorial redesign, light/dark theme behavior, new note/TIL content, TIL runbook, and note-preview parsing prevents this broad hardening PR from reverting newer product work.
  Date/Author: 2026-09-07 / Codex

## Outcomes & Retrospective

All P0–P2 repository implementation milestones are complete and deployed. Cloudflare `always_use_https` is enabled, so plaintext entry requests are redirected at the edge. Content and ATProto inputs now cross explicit validation/sanitization boundaries; complete note snapshots drive routes and search; operational network reads are bounded; media is MIME/size/CID verified; Standard.site writes are deterministic and atomic; 1Password paths distinguish absence from operational failures; CI is pinned and least-privilege; production builds are clean and can require valid identity records; search/accessibility/metadata/profile delivery are improved; GTM is removed; URLs are trailing-slash normalized; and a sitemap is generated. The suite passed 28 focused tests, type/Astro checks were clean, the build emitted all 40 reviewed pages plus a sitemap, feed/search artifacts validated, dry runs recognized both reviewed notes, and the dependency audit was clean. PR #34 merged and the current production deployment passes the eight-check smoke suite. The separately approved transport follow-up corrected the `www` downgrade redirect and enabled a six-month HSTS policy without subdomain inheritance or preload; MCP readback and production headers confirm the intended state.

## Context and Orientation

This is a static Astro 7 site configured by `astro.config.mjs`. Shared HTML metadata and navigation live in `src/layouts/BaseLayout.astro`; global presentation is in `src/styles/global.css`. Markdown source lives under `content/` and is loaded by `src/lib/content.ts`, converted in `src/lib/markdown.ts`, indexed by `src/lib/search.ts`, and fed to static routes under `src/pages/`. Notes can come from local Markdown or ATProto through `src/lib/atproto.ts`; facets render through `src/lib/rich-text.ts`. Feeds are built by `src/lib/feeds.ts` and route-specific `feed.xml.ts` endpoints.

Operational scripts are under `scripts/`: Bluesky note sync, Standard.site publishing, 1Password publishing/refresh, and `.well-known` generation. CI and the orphan check live in `.github/workflows/`; local post-merge behavior lives in `.githooks/post-merge`. Production deploy behavior is documented in `docs/operations/deploy.md` and currently serves the `ciaranlyons.com` custom domain.

The review's durable source of truth is this plan. Its complete accepted remediation inventory is:

- P0 transport and data-loss prevention: enforce HTTPS at Cloudflare; repair the destructive post-merge hook; stop secrets appearing in process arguments/errors; confine Bluesky-derived paths; generate routes from the complete note set and define local/remote source behavior.
- P1 content trust boundaries: validate dates, route segments, TIL path shape and global canonical identity; sanitize Markdown; validate local outbound URLs; validate and snapshot ATProto responses; preserve supported facets/embeds; validate UTF-8 facet boundaries; make feed dates deterministic; make search/content loading complete and build-scoped.
- P1 operations: validate PDS identity/HTTPS before credentials; add network timeouts and response/download bounds; verify media type/size/CID; make remote publication plus local Markdown updates idempotent and atomic; distinguish 1Password not-found from auth/network failures; guard prune; validate env labels; declare `tsx`; make CI permissions explicit; audit immutable push SHAs; and test high-risk scripts and ingestion.
- P2 product quality: make search progressively understandable and resilient with correct live announcements; review/gate GTM; generate responsive portrait formats; add skip navigation and active-page state; repair heading/article/date semantics; enlarge touch targets; narrow page-wide motion; deduplicate CSS; enrich accurate share/structured metadata; harden XML controls and feed copy; replace meta-refresh compatibility pages when hosting permits; prevent numeric-topic collisions; validate production `.well-known` files; make deploys clean/reproducible; pin Actions; align docs/CLI flags; strengthen PR metadata checks; preserve facet offsets when normalizing text; and optionally generate a sitemap.

## Plan of Work

### Milestone 1 — Enforce transport security at the Cloudflare edge (P0)

Use the Cloudflare MCP to locate the exact `ciaranlyons.com` zone, inspect DNS proxy state plus `always_use_https`, and consult the current Cloudflare API/docs before mutation. If the zone is active and traffic is proxied, enable `always_use_https`. Re-read the setting, then probe representative HTTP, extensionless HTTPS, trailing-slash HTTPS, asset, feed, and `.well-known` URLs. Every redirect location must use HTTPS. Do not enable HSTS until all relevant hostnames/certificates have been inventoried and separately approved.

Record the zone ID only where needed for evidence; never record API credentials. If DNS records are not proxied, stop without changing unrelated records because enabling the zone setting alone will not affect traffic; document the exact blocker and the smallest next change.

### Milestone 2 — Prevent P0 local/remote data loss and unsafe writes

In a focused branch, remove or replace `.githooks/post-merge` so it cannot kill arbitrary port listeners or wait indefinitely. Update `scripts/refresh-1password-secrets.ts` so secret replacement programs are never present in argv or unsanitized errors. Add shared safe-path and identifier validation to `scripts/sync-bsky-notes.mjs` so every derived destination is proven to remain under its intended root before atomic write.

Refactor `src/lib/atproto.ts` and note callers so route generation consumes all notes, presentation/feed limits are applied only after canonical routes exist, and local/remote selection or merge behavior is explicit. Add regression fixtures for more than 50 notes and simultaneous local/remote records.

### Milestone 3 — Validate content and external data (P1)

Add a schema-backed ingestion boundary for writing, notes, and TILs. Require real `YYYY-MM-DD` calendar dates, safe path segments, exact TIL nesting, and globally unique canonical TIL identity. Sanitize Markdown output using an explicit allowlist; permit only approved outbound URL protocols/origins where appropriate. Validate ATProto payloads record by record, fetch once per build with a timeout/cache fallback, preserve supported facets/embeds, and reject invalid UTF-8 facet boundaries.

Make feeds reject or omit invalid dates without inventing build-time publication dates. Index full body text and all notes. Memoize collection loading and render body HTML only where needed.

### Milestone 4 — Harden publishing, secrets, CI, and deploys (P1)

Require HTTPS and expected DID/PDS identity before credential submission. Add bounded network reads, timeouts, streamed temporary downloads, MIME/size/CID verification, deterministic record keys or reconciliation, and atomic local updates. Make 1Password operations distinguish absence from failures, guard empty prune, validate env labels, and install a pinned `tsx` dev dependency.

Set minimum GitHub Actions permissions and disable persisted checkout credentials. Make orphan detection inspect `github.event.after`. Add tests with mocked fetch, filesystem, and `op` behavior for adversarial paths, dates, field labels, timeouts, and partial failures. Make production deployment start from a clean artifact tree and fail if required `.well-known` values are missing or invalid.

### Milestone 5 — Improve search, accessibility, performance, privacy, and metadata (P2)

Give search immediate listeners, URL/form or `<noscript>` fallback, validated fetch/error/retry behavior, result counts, and a separate concise status live region. Add skip navigation, `aria-current`, coherent heading/article semantics, `<time datetime>`, larger hit targets, and focused motion. Generate responsive portrait formats and remove duplicate CSS.

Decide and document the analytics privacy model before loading GTM. Add only accurate social/structured metadata, correct feed copy/control characters, replace compatibility meta refresh with real permanent redirects if supported, reserve numeric topics or namespace topic browsing, align operational docs and CLI behavior, strengthen PR evidence validation, and generate a sitemap if desired.

### Milestone 6 — Final end-to-end verification

Run all local checks from a clean install, exercise every high-risk script in dry-run/mocked modes, inspect representative generated HTML/XML/JSON, and smoke-test production transport, canonical routes, redirects, feeds, search, assets, and `.well-known` records. Record every command and outcome here. Verify each feature branch contains only its intended commits before its PR is merged.

### Milestone 7 — Enable HSTS after transport preflight

Inventory every proxied hostname and validate its TLS certificate and redirect behavior. Correct the `www` redirect so HTTPS never emits an HTTP location. Re-read `always_use_https`, SSL mode/status, and `security_header` through Cloudflare MCP. Then enable HSTS with `max_age=15552000`, `include_subdomains=false`, `preload=false`, and the existing `nosniff=false`. Re-read the setting and verify representative HTTPS responses include exactly `Strict-Transport-Security: max-age=15552000` while the complete production smoke suite still passes. Do not enable `includeSubDomains` or preload in this milestone.

## Concrete Steps

From the repository root, the baseline and recurring validation commands are:

    git status --short --branch
    npm ci
    npm run check
    npm run build
    npm audit --omit=dev --audit-level=low

For the initial Cloudflare milestone, use MCP read operations to discover the zone and setting, then update only the exact `always_use_https` zone setting. Validate externally:

    curl -sS -o /dev/null -D - http://ciaranlyons.com/
    curl -sS -o /dev/null -D - https://ciaranlyons.com/about
    curl -sS -o /dev/null -D - https://ciaranlyons.com/about/
    curl -sS -o /dev/null -D - http://ciaranlyons.com/feed.xml

Expected result: plaintext requests redirect to an `https://` location; extensionless HTTPS normalization never emits an `http://` location; trailing-slash HTTPS and feeds remain successful. Re-read the Cloudflare setting via MCP and record the returned value.

For the separately approved HSTS milestone, first ensure the apex, `www`, and other proxied hostnames complete validated TLS and no HTTPS response redirects to HTTP. Correct the `www` redirect at Cloudflare, then update only the `security_header` zone setting with the policy recorded above. Confirm with an MCP readback and uncached header probes before considering the milestone complete.

Add focused test commands as their harnesses are introduced. At minimum, tests must cover more than 50 notes, mixed note sources, impossible dates, duplicate TIL identity, hostile Markdown/URLs, traversal identifiers, split UTF-8 facets, stalled/oversized responses, CID mismatch, 1Password auth/not-found/prune distinctions, secret-log redaction, and interrupted publication writes.

## Validation and Acceptance

- All HTTP requests for `ciaranlyons.com` redirect to HTTPS, and no tested HTTPS route redirects to HTTP.
- Cloudflare reports zone-wide HTTPS redirection enabled; HSTS remains unchanged unless separately reviewed and approved.
- After the separately approved HSTS milestone, Cloudflare reports HSTS enabled with `max_age=15552000`, `include_subdomains=false`, `preload=false`, and `nosniff=false`; representative HTTPS responses emit that policy and never redirect to HTTP.
- No local hook kills an arbitrary listener or waits without a timeout.
- Secret values never appear in command arguments, logs, errors, reports, or committed files.
- Every sync/publish destination is confined to its declared root and written atomically.
- Every valid note generates a detail route regardless of list/feed limits; source merge/selection is deterministic and tested.
- Invalid dates, identifiers, paths, URLs, duplicate canonical identities, remote records, media, and facet boundaries fail safely with source-specific diagnostics.
- Markdown cannot emit executable HTML or unsafe URL schemes.
- Builds use one validated external-data snapshot and a deterministic fallback; feeds and search are complete and reproducible.
- Credential-bearing external calls require validated identity and HTTPS, have time/size bounds, and reconcile partial failures safely.
- CI runs the new tests with least-privilege credentials and checks the immutable event commit.
- Search has loading, empty, error, and non-JavaScript behavior; its status announcements are concise.
- The accepted accessibility, performance, privacy, feed, metadata, documentation, and deploy improvements are verified in generated output and production.
- Before each PR merge, `git log origin/main..<branch> --oneline` contains only the intended feature commits and `npm run build` passes.

## Idempotence and Recovery

All read-only discovery and validation commands are safe to repeat. Enabling `always_use_https` is an idempotent Cloudflare setting update; recovery is to set the same setting back to its recorded prior value if verification shows an unexpected break. Do not change DNS proxy state, SSL mode, certificates, or unrelated rules as part of the initial mutation. The later HSTS update is also idempotent, but browsers retain a learned policy for its advertised max-age: setting `max_age=0` stops future retention but cannot immediately erase policy already cached by every visitor. Keep HTTPS available throughout the six-month policy window.

Repository changes should use validation-before-write, same-directory temporary files, atomic rename, and deterministic identities so interrupted commands can be rerun. Tests must use temporary directories and fake credentials. Never overwrite `.env.local`; preserve the repository's required targeted edit/append policy. Never reuse a branch after its PR merges.

## Artifacts and Notes

- Source review artifact: `.context/code-review-2026-09-06.md` in the originating Conductor workspace. This file is gitignored, so this ExecPlan independently carries the accepted work inventory.
- Initial review validation: `npm run build` passed with 46 checked files and 31 generated pages; dependency audit reported zero vulnerabilities; generated link/asset, feed XML, and search JSON checks passed.
- Initial production evidence: HTTP returned `200`; extensionless HTTPS paths redirected to HTTP trailing-slash paths; HTTPS trailing-slash paths returned `200`; HSTS was absent.
- 2026-09-07 01:40Z Cloudflare MCP discovery: `GET /zones?name=ciaranlyons.com` returned one active full zone (`4e528e05a3b8472de30310dffedf72dd`); reads of `settings/always_use_https` returned authentication error `10000`, so no before value or mutation was available. A Cloudflare plugin authorization request was surfaced to obtain the required scoped access.
- 2026-09-07 02:50Z P0 local validation: `npm test` passed 7/7 tests covering secret-free argv/private temp cleanup, real env upsert behavior, safe-path traversal rejection, invalid date/rkey rejection, unsafe media CID rejection, complete 60-note source merging, and independent display limits. `npm run check` reported 50 files with zero diagnostics. `npm run build` generated 31 pages successfully. `npm run notes:sync -- --dry-run` reported the one existing post as safely skipped.
- 2026-09-07 02:51Z Cloudflare MCP retry: `GET /zones/4e528e05a3b8472de30310dffedf72dd/settings/always_use_https` again returned authentication error `10000`; production remained unchanged.
- 2026-09-07 03:06Z repository validation: `npm test` passed 25/25 tests before the final three regression cases were added; `npm run check` and `npx tsc --noEmit` completed with zero diagnostics; `npm run build` cleaned `dist`, generated 31 pages, and emitted `sitemap-index.xml`; all four feeds plus the sitemap passed `xmllint`; `search.json` contained six valid items; `npm audit --omit=dev --audit-level=low` reported zero vulnerabilities.
- 2026-09-07 03:08Z operational dry runs: Notes sync safely skipped the existing note (`0 written, 1 skipped, 1 eligible`), and Standard.site publishing reconciled the existing publication and reported one document update without requesting credentials.
- 2026-09-07 03:08Z production smoke: canonical `/about/`, the four feeds sampled, and both `.well-known` identities were available over HTTPS. Plaintext root/feed remained `200`, slashless `/about` still redirected to plaintext, and the not-yet-deployed sitemap returned `404`.
- 2026-09-07 03:09Z Cloudflare MCP retry: the conditional read/update/read request for `always_use_https` again returned authentication error `10000`. A fresh Cloudflare plugin authorization request was presented but not confirmed, so no Cloudflare state changed.
- 2026-09-07 03:10Z proxy verification: authoritative Cloudflare nameservers, Cloudflare anycast apex addresses, and `server: cloudflare`/`cf-ray` response headers confirmed the apex is proxied; the missing permission is therefore the only blocker to changing `always_use_https` through MCP.
- 2026-09-07 03:09Z final CI-equivalent pass: `npm ci --ignore-scripts`, `npm run lint`, `npx tsc --noEmit`, `npm test` (28/28), `npm run build` (31 pages plus sitemap), and `git diff --check` all succeeded.
- 2026-09-07 19:22Z Cloudflare authorization and mutation: the exact active zone exposed `#zone_settings:read` and `#zone_settings:edit`; `GET settings/always_use_https` returned `off`; `PATCH {"value":"on"}` returned HTTP 200; and the confirming read returned `on` with modification time `2026-09-07T19:22:10.955657Z`. No other zone setting was changed and HSTS remains outside this scope.
- 2026-09-07 19:22Z post-change production smoke: plaintext root and feed now return `301` to their HTTPS equivalents; canonical `/about/`, the feed, and both `.well-known` identity records return `200`. The deployed slashless `/about` still returns an origin-generated plaintext location and `sitemap-index.xml` remains `404`; both correspond to completed repository changes awaiting deployment.
- 2026-09-07 19:35Z latest-main reconciliation: fetched `origin/main` at `8afefdb`, ten commits beyond the original base. Conflict resolution retained the new editorial palette/layout, two-state theme toggle, TIL copy and publishing documentation, current note/TIL content, and latest-note URL stripping. It reapplied trailing-slash navigation, metadata/privacy/accessibility/search hardening, and schema-backed content validation. `npm run lint`, `npx tsc --noEmit`, `npm test` (28/28), and `npm run build` (40 pages plus sitemap) passed; all feeds and the sitemap passed `xmllint`; `search.json` contained eight items; both publishing dry runs reconciled current records; and the production dependency audit reported zero vulnerabilities.
- 2026-09-07 22:04Z deployment verification: PR #34 was merged at `c5e0fb4`; the later production deployment for current `main` completed successfully, and `npm run smoke:production` passed all eight checks including HTTPS redirects, the canonical route, feeds, sitemap, and both identity records.
- 2026-09-07 22:14Z HSTS preflight: Cloudflare MCP confirmed the active/full zone, `always_use_https=on`, SSL mode `full`, active certificate status, and HSTS disabled. The apex, `www`, and `email` proxied hosts all passed public certificate verification. The apex returned `200` and `email` returned `404`, but `www` redirected HTTPS to an HTTP apex URL, so HSTS was not yet changed.
- 2026-09-07 22:17Z redirect prerequisite: added enabled dynamic redirect rule `www_to_apex_https` (`fc27ada11cdb44828cce101c02270e5a`) to the existing ruleset without modifying the canonical trailing-slash rule. HTTPS and plaintext `www` probes for root, path, and query-string requests all returned `301` directly to the equivalent HTTPS apex URL.
- 2026-09-07 22:19Z HSTS execution: MCP readback reconfirmed `always_use_https=on`, SSL mode `full`, active certificate status, no validation errors, editable security headers, and an initial HSTS value of disabled/zero. The exact `security_header` update returned HTTP 200 and read back `enabled=true`, `max_age=15552000`, `include_subdomains=false`, `preload=false`, and `nosniff=false` with modification time `2026-09-07T22:19:21.396848Z`. Apex, `www`, and `email` HTTPS responses emitted `Strict-Transport-Security: max-age=15552000`; all tested redirect locations used HTTPS; and `npm run smoke:production` passed 8/8.
- 2026-09-07 22:20Z orphan housekeeping: closed issue #31 as completed after confirming orphan commit `ad9b083` and recovered PR #32 commit `a126104` have the same stable patch ID (`085e02e03d4a77752d743fc8ac092ce166047f79`).

## Interfaces and Dependencies

- Cloudflare zone settings API/MCP: read and update `always_use_https` for the exact `ciaranlyons.com` zone.
- `getNotes` or its replacement must expose a complete route-generation collection independently of any presentation limit and must define local/remote merge identity.
- Content validators must produce typed `WritingEntry`, `TilEntry`, and `NoteEntry` values only after schema validation.
- Safe-path helpers must accept an intended root plus validated path segments and reject any resolved destination outside the root.
- Network helpers must expose timeout, maximum bytes, runtime decoding/validation, and sanitized errors.
- Markdown rendering must return sanitized HTML safe for Astro `set:html`.
- Operational commands must expose dependency-injected or mockable fetch/filesystem/process boundaries for tests.
- New test and validation scripts must be declared in `package.json` and run in `.github/workflows/pr-quality.yml`.

## Change Log

- 2026-09-07: Created the ExecPlan from the accepted 2026-09-06 full-site review and started the Cloudflare HTTPS milestone.
- 2026-09-07: Confirmed the exact Cloudflare zone, recorded the zone-settings authorization blocker, and requested the Cloudflare plugin connection; no external setting changed.
- 2026-09-07: Completed repository-local P0 fixes and added seven regression tests; Cloudflare HTTPS enforcement remains pending authorization.
- 2026-09-07: Completed all repository-controlled P1/P2 milestones, expanded automated coverage, normalized routes, generated a sitemap, hardened CI/deployment and operational tooling, and recorded the final external Cloudflare blocker.
- 2026-09-07: Reauthorized Cloudflare MCP with the minimum required zone-setting scopes, enabled `always_use_https`, confirmed the setting, and verified plaintext production requests redirect to HTTPS. Remaining production smoke failures require deployment of the completed repository changes.
- 2026-09-07: Reconciled ten newer main-branch commits without reverting their design, theme, content, note-routing, or publishing-workflow changes, and repeated the complete validation suite successfully.
- 2026-09-07: Recorded successful merge/deployment verification and began the separately approved HSTS milestone with a conservative six-month policy and an explicit `www` redirect prerequisite.
- 2026-09-07: Completed the HSTS milestone after adding and verifying an HTTPS-only `www` redirect; enabled the six-month policy through Cloudflare MCP and confirmed it through MCP readback plus production headers.
- 2026-09-07: Closed resolved orphan issue #31 after proving the work was recovered byte-for-byte in PR #32.
