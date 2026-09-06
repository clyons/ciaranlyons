# Deployment

The editable source for CiaranLyons.com lives in this repository.

Production currently serves through the GitHub Pages repository:

```text
clyons/resume
```

Deploy flow:

1. Build this repository with `npm run build`.
2. Copy the generated `dist/` contents to the root of the `gh-pages` branch in `clyons/resume`.
3. Commit and push `gh-pages`.

`public/CNAME` and `public/.nojekyll` are included in the Astro build so GitHub Pages keeps the custom domain and serves `_astro` assets.

The build script writes `.well-known/atproto-did` and `.well-known/site.standard.publication` only when `ATPROTO_DID` and `STANDARD_SITE_PUBLICATION_AT_URI` are present in the build environment.

## Standard.site publishing

Writing entries remain Markdown-authored in this repository. Publish their interoperable Standard.site records explicitly, not as a side effect of a site build:

```bash
ATPROTO_APP_PASSWORD='…' npm run standard:publish
```

The command creates or updates the publication record and each Writing document record, saving the document URI as `standardUri` in the Markdown front matter. It accepts either `ATPROTO_HANDLE`/`ATPROTO_APP_PASSWORD` or the existing `BSKY_HANDLE`/`BSKY_APP_PASSWORD` names. Never commit the app password. After the first publish, set the printed `STANDARD_SITE_PUBLICATION_AT_URI` and the account `ATPROTO_DID` in the deployment environment, then deploy. Confirm production with:

```bash
curl -fsSL https://ciaranlyons.com/.well-known/site.standard.publication
curl -fsSL https://ciaranlyons.com/writing/2026/08/08/on-ownership | rg 'site.standard.(publication|document)'
```
