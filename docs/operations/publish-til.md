# Publish a TIL

Use this as one short publishing workflow. It treats CiaranLyons.com as the canonical TIL, while a companion demo (if useful) remains its own GitHub project and Pages site.

1. **Write the TIL.** Add `content/til/<topic>/<slug>.md` with `title`, `description`, `date`, `updated`, and `tags`. Keep it short; link primary sources and the project/demo where relevant. The topic organizes the source file; the canonical public URL is `/til/YYYY/MM/DD/<slug>`. Update the entry count in `content/projects/til.md`.

2. **Optionally publish a companion demo.** Use a separate public repository named for the experiment. Its GitHub Pages URL should be `https://clyons.github.io/<repo>/`. Keep it standalone and privacy-reviewed. Cross-link all three places: demo footer -> GitHub source + TIL; README -> demo + TIL; TIL -> demo + source. Do not put the demo in `clyons/clyons.github.io`: that is not the CiaranLyons.com deployment source.

3. **Optionally publish a Bluesky companion note.** Write the final, short post with the canonical TIL URL and any intended mentions/links. Bluesky does not render Markdown code formatting; use plain text rather than backticks for styling. Publish it as a top-level post, then run `npm run notes:sync -- --limit 10` so the post becomes durable local content under `content/notes/`. This lets the TIL and its Note publish together on the owned site.

4. **Validate and review the social previews.** Run `npm run build`, `npm run lint`, and `npx tsc --noEmit`; check the generated TIL, feeds, search, and, when present, Note route. The build's social-preview gate must pass. Open `dist/og/til/YYYY/MM/DD/<slug>.png` and, when a companion Note exists, `dist/og/notes/YYYY/MM/DD/<id>.png`. Confirm that each card represents the final content and has no unintended truncation or overlap. Inspect the built pages to confirm their Open Graph and Twitter metadata points to those exact files. Follow the full [content social preview contract](./deploy.md#content-social-previews).

5. **Merge one source PR.** Include the build result and inspected preview path or paths in the PR validation evidence. Use a fresh feature branch from `origin/main`. After the PR is merged, never push to that branch again. Follow the [repository TIL instructions](../../AGENTS.md#til-publishing) as well.

6. **Deploy the merged site.** Merge the verified source PR into `main`; the repository's production workflow builds, uploads, and smoke-tests the site automatically. Ensure `STANDARD_SITE_PUBLICATION_AT_URI` is current in the GitHub `production` environment. See [Deployment](./deploy.md) for the canonical mechanics.

7. **Verify the public loop.** Confirm the production workflow and its smoke test succeed, then open the TIL URL, its social preview URL, demo URL (if any), and Note URL (if any). Check every promised cross-link in the rendered pages. The source PR, demo repository, and Bluesky post are the durable record of the learning.
