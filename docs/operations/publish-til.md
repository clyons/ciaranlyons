# Publish a TIL

Use this as one short publishing workflow. It treats CiaranLyons.com as the canonical TIL, while a companion demo (if useful) remains its own GitHub project and Pages site.

1. **Write the TIL.** Add `content/til/<topic>/<slug>.md` with `title`, `description`, `date`, `updated`, and `tags`. Keep it short; link primary sources and the project/demo where relevant. The public URL is `/til/YYYY/MM/DD/<slug>`. Update the entry count in `content/projects/til.md`.

2. **Optionally publish a companion demo.** Use a separate public repository named for the experiment. Its GitHub Pages URL should be `https://clyons.github.io/<repo>/`. Keep it standalone and privacy-reviewed. Cross-link all three places: demo footer -> GitHub source + TIL; README -> demo + TIL; TIL -> demo + source. Do not put the demo in `clyons/clyons.github.io`: that is not the CiaranLyons.com deployment source.

3. **Optionally publish a Bluesky companion note.** Write the final, short post with the canonical TIL URL and any intended mentions/links. Bluesky does not render Markdown code formatting; use plain text rather than backticks for styling. Publish it as a top-level post, then run `npm run notes:sync -- --limit 10` so the post becomes durable local content under `content/notes/`. This lets the TIL and its Note publish together on the owned site.

4. **Validate and merge one source PR.** Run `npm run build`, `npm run lint`, and `npx tsc --noEmit`; check the generated TIL, feeds, search, and, when present, Note route. Use a fresh feature branch from `origin/main`. After the PR is merged, never push to that branch again.

5. **Deploy the merged site.** Build current `origin/main` with `STANDARD_SITE_PUBLICATION_AT_URI` set, then copy `dist/` additively to the root of `clyons/resume`'s `gh-pages` branch. Preserve `.well-known/atproto-did` and `.well-known/site.standard.publication`; do not deploy to `clyons/clyons.github.io`. See [Deployment](./deploy.md) for the canonical mechanics.

6. **Verify the public loop.** Confirm the Pages job succeeds, then open the TIL URL, demo URL (if any), and Note URL (if any). Check every promised cross-link in the rendered pages. The source PR, demo repository, and Bluesky post are the durable record of the learning; the generated Pages repository is deployment output only.
