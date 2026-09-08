# CLAUDE.md

Context for Claude Code when working in this repository.

## What This Is

CiaranLyons.com is the canonical home for Ciaran Lyons on the web: writing, notes, found quotes, projects, and a Git-backed TIL project.

## Architecture

Static-first Astro site with Markdown content in `content/`.

- Writing lives at `/writing` and is designed to connect to Standard.site records.
- Notes live at `/notes` and are fetched from public ATProto records when `@ciaranlyons.com` resolves, falling back to local Markdown notes.
- Found Quotes live at `/found-quotes` as repository-owned quotations with explicit attribution and provenance. Writing may compose them by slug.
- TIL lives under `/til` as Markdown files grouped by topic.
- Projects and About are site-native Markdown/Git content.
- RSS and search are generated at build time.
- Date-bearing public URLs are folder-addressable: `/writing/YYYY/MM/DD/slug`, `/notes/YYYY/MM/DD/id`, `/found-quotes/YYYY/MM/DD/slug`, and `/til/YYYY/MM/DD/slug`.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Type-check and build the static site
npm run preview   # Preview the built site
npm run check     # Astro type/content check
```

## Git Workflow

Never push directly to main. Always use feature branches and PRs.

**CRITICAL: Every merge to main triggers a deploy to prod.** Before merging any PR, run your build and fix all errors. Never merge a PR with a failing build.

```bash
git checkout -b feature/your-feature-name
git add <files>
git commit -m "Your message"
git push -u origin feature/your-feature-name
gh pr create --title "Title" --body "Description"
# run build — MUST pass before merging
gh pr merge --merge
```

### Branch Hygiene (INVIOLATE)

See `AGENTS.md` → "Branch Hygiene" for the full rules. Branches are auto-deleted after merge.

Required minimum behavior:
- One branch = one feature.
- Never push commits to a branch after its PR is merged.
- Before merge, verify intended branch delta with `git log origin/main..<branch> --oneline`.
- Follow-up work always starts on a new branch from updated `main`.

## Environment Files

Never overwrite `.env.local` wholesale. See `AGENTS.md` → "Environment Files" for the full rule.
