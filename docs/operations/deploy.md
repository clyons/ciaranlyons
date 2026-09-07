# Deployment

This repository owns the build, deployment, and verification of CiaranLyons.com. Cloudflare Pages is the hosting target; no generated artifact is copied to another repository.

For the contributor and agent guardrails that enforce this workflow, see [Deployments in the repository guide](../../AGENTS.md#deployments-inviolate). For the complete TIL lifecycle—including optional demo and Bluesky Note publishing—see [Publish a TIL](./publish-til.md).

The checked-in workflows are the executable contract: [production](../../.github/workflows/deploy-production.yml) deploys every `main` push, while [preview](../../.github/workflows/deploy-preview.yml) is manually dispatched for a requested non-`main` branch.

## One-time setup

Complete these steps before the first production merge. They are account configuration, so keep token values out of the repository and out of local shell history.

1. In Cloudflare, create a **Pages → Direct Upload** project named `ciaranlyons`. Do not connect the GitHub repository in Cloudflare; GitHub Actions is the single deploy controller.
2. Attach `ciaranlyons.com` to that Pages project and complete Cloudflare's required DNS verification. Configure `www.ciaranlyons.com` only if it is needed, and redirect it to the canonical apex domain with a Cloudflare Redirect Rule.
3. Create a dedicated Cloudflare API token that can upload to the `ciaranlyons` Pages project. Save it as the GitHub repository Actions secret `CLOUDFLARE_API_TOKEN`. Save the Cloudflare account ID as `CLOUDFLARE_ACCOUNT_ID`. Do not use a broad personal API key. These are deployment credentials, not local developer environment values; do not add them to `.env*` files or the 1Password developer-env sync.
4. In GitHub, create the `production` environment. Add these environment secrets there, not as repository-wide secrets:
   - `ATPROTO_DID`
   - `STANDARD_SITE_PUBLICATION_AT_URI`
5. Trigger the production workflow from a verified merge to `main`. Confirm the uploaded deployment is serving `https://ciaranlyons.com` and that the workflow's `Smoke-test production` step passes before retiring the previous host's custom-domain configuration.

The production build deliberately fails unless both identity values are present. This keeps `.well-known/atproto-did` and `.well-known/site.standard.publication` from disappearing during a production release.

## Production deployments

Every push to `main` runs **Deploy production site**. A normal pull-request merge creates such a push, so every merge is deployed automatically. The workflow:

1. installs the locked dependencies;
2. runs lint and the repository test suite;
3. builds a clean `dist/` artifact with production identity records required;
4. uploads that artifact to the production environment of the `ciaranlyons` Cloudflare Pages project; and
5. runs `npm run smoke:production` against `https://ciaranlyons.com`.

Production uploads are serialized rather than cancelled: each completed merge gets its own deploy attempt. Treat a failed smoke test as a failed production release. Fix the issue and merge a new commit; do not manually copy `dist/` anywhere.

The workflow writes an elapsed checkout-to-result duration to every job summary, including failures. The first successful run after the Cloudflare cutover is the production baseline. Record its run URL, commit SHA, and elapsed seconds in the release notes; compare later successful runs against it. Investigate a material regression, but do not remove lint, tests, the clean build, or the production smoke test merely to reduce time. Optimize setup, caching, or the upload path only after preserving those correctness gates.

## Preview deployments on request

Feature pushes do not deploy automatically. To request a preview, open **Actions → Deploy preview site → Run workflow**, select the workflow definition from `main`, and supply one branch ref:

```text
development
origin/development
feature/my-change
```

The workflow rejects `main`, checks out the requested branch, runs lint and tests, builds without the production identity values, and uploads a Cloudflare Pages branch preview. Its job summary lists both the immutable deployment URL and the stable branch alias. Re-run the workflow after more commits when a preview should be refreshed; a newer request for the same ref cancels an older in-progress request.

Each preview summary also records elapsed checkout-to-result time. Use the first successful preview for a branch as that branch's baseline when diagnosing a slow requested preview.

## Recovery and migration completion

If an automated production deployment fails, inspect the failed Actions step, correct the source or account configuration, then either merge the fix or use **Re-run jobs** when the source commit is already correct. To roll back a bad release, revert the bad commit on `main`; the resulting merge deploys the reverted artifact automatically.

After a successful production release and smoke test, remove the old host's custom-domain mapping and archive its artifact-only deployment branch or repository according to its retention policy. Do this last so the existing site remains available while Cloudflare DNS and TLS are being verified.

## Standard.site publishing

Writing entries remain Markdown-authored in this repository. Publish their interoperable Standard.site records explicitly, not as a side effect of a site build:

```bash
ATPROTO_DID='did:plc:…' ATPROTO_APP_PASSWORD='…' npm run standard:publish
```

The command resolves the handle over public HTTPS endpoints and requires the result to match `ATPROTO_DID` before it submits credentials. It creates or updates deterministic publication and Writing document records, then atomically saves each document URI as `standardUri` in Markdown front matter. It accepts either `ATPROTO_HANDLE`/`ATPROTO_APP_PASSWORD` or the existing `BSKY_HANDLE`/`BSKY_APP_PASSWORD` names. Never commit the app password. After the first publish, update `STANDARD_SITE_PUBLICATION_AT_URI` in the GitHub `production` environment before the next merge, then confirm production with:

```bash
curl -fsSL https://ciaranlyons.com/.well-known/site.standard.publication
curl -fsSL https://ciaranlyons.com/writing/2026/08/08/on-ownership | rg 'site.standard.(publication|document)'
```
