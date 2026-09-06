# Site Quality Assurance

Prototype: https://ciaranlyons.com

Source of truth: `pasted_text_2026-09-06_00-16-44.txt` (Next Rev brief)

## Final verdict

READY — two concrete defects were fixed. No publishing architecture, routes, content, or global navigation were restructured.

## Requirements and behavior

- ✓ Primary navigation remains About, Writing, Notes, and Projects. TIL was not added.
- ✓ The global footer only presents RSS and the primary `@ciaranlyons.com` identity.
- ✓ About → Elsewhere contains the existing Bluesky, LinkedIn, Instagram, Facebook, and GitHub profiles.
- ✓ All 31 generated HTML pages contain a canonical link; all canonical routes returned a successful live response.
- ✓ All four RSS feeds, both ATProto/Standard.site well-known endpoints, and the expected 404 response were verified live.
- ✓ All generated local `href`/`src` targets resolve in `dist/`.

## Defects fixed

1. Legacy topic-path TIL redirects emitted relative canonical URLs with trailing-slash variants. Their canonical links now use the existing absolute date-based canonical URLs without changing redirect destinations or public permalink structure.
2. On viewports at or below 320px wide, article prose had a fixed `20rem` width inside a narrower container. It now uses `width: 100%` with the same `20rem` maximum, preventing clipped horizontal overflow.

## Accessibility and presentation sanity

- ✓ All generated `<img>` elements include `alt` attributes.
- ✓ Global keyboard focus styles and reduced-motion handling are present.
- ✓ Code-block styles retain horizontal scrolling. The current TIL corpus has no fenced Markdown code blocks to render-test.
- ✓ Light mode is intentional (`color-scheme: light`); no dark-mode behavior is advertised.
- Manual follow-up: browser automation was unavailable in this session, so screen-reader behavior and device rendering should receive a normal manual spot check before a major visual change.

## Metadata and performance

- ✓ Content pages expose canonical and Open Graph metadata. The eight legacy redirect documents intentionally omit Open Graph metadata because they immediately redirect.
- ✓ Production samples: homepage TTFB 93ms / total 93ms; Writing 148ms / 148ms; TIL 162ms / 162ms.
- ✓ Standard.site publication and Writing-document metadata remain live.

## External links

Most external links returned HTTP 200. LinkedIn returned 999 and General Assembly/Positive Intelligence returned 403 to automated requests; those services commonly block automated clients, so this is not treated as a broken visitor-facing link.
