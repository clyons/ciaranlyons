# Deployment

The editable source for CiaranLyons.com lives in this repository.

Production currently serves through the GitHub Pages user-site repository:

```text
clyons/clyons.github.io
```

Deploy flow:

1. Build this repository with `npm run build`.
2. Copy the generated `dist/` contents to the root of `clyons/clyons.github.io`.
3. Commit and push `master` in `clyons/clyons.github.io`.

`public/CNAME` and `public/.nojekyll` are included in the Astro build so GitHub Pages keeps the custom domain and serves `_astro` assets.
