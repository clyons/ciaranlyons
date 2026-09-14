# Publish the dragon TIL with a safe video embed

This plan follows `.agent/PLANS.md` and is required because video support extends the Markdown HTML allowlist.

## Purpose / Big Picture

Publish the approved dragon article with an inline portrait demo and working credits. Readers can play the recording directly in the article.

## Progress

- [x] (2026-09-14 02:10Z) Read publishing contracts and prepared approved copy.
- [x] (2026-09-14 02:10Z) Added a restricted video allowlist and security regression coverage.
- [x] (2026-09-14 02:14Z) Lint, TypeScript, all 95 tests, build and social-preview review passed.
- [ ] Merge source PR and verify production deployment.

## Surprises & Discoveries

The existing HTML sanitizer removes video tags, including the older Blender article's embed. TIL counts already derive from content via `metaCount: til`; no manual count edit is needed.

## Decision Log

- Decision: Permit video with only source, poster, playback, dimension, and accessibility attributes. Retain existing URL scheme restrictions and strip event handlers and inline styles.
  Rationale: Support the requested embed without permitting general executable HTML. The new video uses click-to-play.
  Date/Author: 2026-09-13 / Codex
- Decision: Host video on the existing companion Pages site and cap its displayed height using CSS.
  Rationale: Keep media in its established repository and make the portrait player fit the viewport.
  Date/Author: 2026-09-13 / Codex

## Outcomes & Retrospective

Implementation and local validation complete. Source PR and production verification remain.

## Context and Orientation

`content/til/web/teaching-a-printed-dragon-to-fly.md` is the article. `src/lib/markdown.ts` sanitizes rendered content, with tests beside it. `src/styles/global.css` styles prose video.

## Plan of Work

Apply the approved copy refinements, add restricted video rendering, test sanitization, build and inspect the social card, then merge through the existing production workflow. Update the separate demo repository after publication.

## Concrete Steps

Run `npm ci --ignore-scripts`, `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build`. Inspect `dist/til/2026/09/13/teaching-a-printed-dragon-to-fly/index.html` and `dist/og/til/2026/09/13/teaching-a-printed-dragon-to-fly.png`. Submit the checked PR body, wait for quality checks, merge, and verify the production URL.

## Validation and Acceptance

Article includes credits, exact source line links, and a portrait video with controls and accessible label. Unsafe URLs and event attributes remain stripped. Build verifies social images. Production workflow and public article succeed.

## Idempotence and Recovery

Builds and read-only checks can repeat. Never push to the branch after merge. If deployed content fails, correct on a fresh branch; never upload generated artifacts manually.

## Artifacts and Notes

`npm run lint`: 0 errors. `npx tsc --noEmit`: exit 0. `npm test`: 95 passed. `npm run build`: passed; social-preview gate passed. The exact TIL social card was opened and reviewed: title, description, date and WEB label are readable. Generated HTML preserves the accessible video and both social-image tags point to that card.

## Interfaces and Dependencies

No new dependencies, credentials, deployment behavior, or content schema. Existing sanitize-html and video browser elements are used.

## Change Log

- 2026-09-13: Created plan and implemented the draft and restricted video rendering.
