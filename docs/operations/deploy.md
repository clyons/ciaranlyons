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
