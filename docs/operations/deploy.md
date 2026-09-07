# Deployment

The editable source for CiaranLyons.com lives in this repository.

Production currently serves through the GitHub Pages repository:

```text
clyons/resume
```

Deploy flow:

1. Build this repository from a clean artifact directory with the required identity values:

   ```bash
   REQUIRE_WELL_KNOWN=true \
   ATPROTO_DID='did:plc:…' \
   STANDARD_SITE_PUBLICATION_AT_URI='at://did:plc:…/site.standard.publication/…' \
   npm run build
   ```
2. In a separate checkout of the `gh-pages` branch in `clyons/resume`, replace its served files from the clean artifact with `rsync -a --delete dist/ <gh-pages-checkout>/` (preserving only repository metadata).
3. Verify `CNAME`, `.nojekyll`, `sitemap-index.xml`, feeds, assets, and both `.well-known` files in the staged tree.
4. Commit and push `gh-pages`; the Git commit makes the staged replacement atomic from the repository's perspective.
5. Run `npm run smoke:production`. It verifies HTTPS redirects, a canonical route, the feeds, sitemap, and both identity records; treat any `FAIL` as a deployment failure.

`public/CNAME` and `public/.nojekyll` are included in the Astro build so GitHub Pages keeps the custom domain and serves `_astro` assets.

The build deletes `dist/` before generating a fresh artifact. It writes `.well-known/atproto-did` and `.well-known/site.standard.publication` when `ATPROTO_DID` and `STANDARD_SITE_PUBLICATION_AT_URI` are present. Set `REQUIRE_WELL_KNOWN=true` for production so missing or malformed values fail the build instead of silently producing an incomplete deployment.

## Standard.site publishing

Writing entries remain Markdown-authored in this repository. Publish their interoperable Standard.site records explicitly, not as a side effect of a site build:

```bash
ATPROTO_DID='did:plc:…' ATPROTO_APP_PASSWORD='…' npm run standard:publish
```

The command resolves the handle over public HTTPS endpoints and requires the result to match `ATPROTO_DID` before it submits credentials. It creates or updates deterministic publication and Writing document records, then atomically saves each document URI as `standardUri` in Markdown front matter. It accepts either `ATPROTO_HANDLE`/`ATPROTO_APP_PASSWORD` or the existing `BSKY_HANDLE`/`BSKY_APP_PASSWORD` names. Never commit the app password. After the first publish, set the printed `STANDARD_SITE_PUBLICATION_AT_URI` in the deployment environment, then deploy. Confirm production with:

```bash
curl -fsSL https://ciaranlyons.com/.well-known/site.standard.publication
curl -fsSL https://ciaranlyons.com/writing/2026/08/08/on-ownership | rg 'site.standard.(publication|document)'
```
