# Local note media fixtures

Run `node tests/fixtures/note-media/generate-assets.mjs` (requires ffmpeg) to generate small, original PNG illustrations and a four-second H.264 test-pattern video. The generator also packages that video as HLS and adds an original WebVTT subtitle. Everything is written to the gitignored `.context/note-media-fixtures/` directory; no test content is added to the live site.

Run `npm run mockups:notes` to inspect `/home/portrait/`, `/home/gallery/`, `/home/video/`, `/home/hls/`, and `/notes/`. The pages use the production components, layout, and CSS. Other cases are listed in `src/fixtures.ts`.

The gallery parser follows the record/view shapes in Bluesky's merged PR [#4827](https://github.com/bluesky-social/atproto/pull/4827), commit `74f37c87939a65d223895a18f9c49bf962ed5db6`. Gallery view images have `$type: app.bsky.embed.gallery#viewImage`, `fullsize`, and `thumbnail`; record images use `$type: app.bsky.embed.gallery#image` and a blob reference.

No downloaded third-party assets are needed for deterministic tests. The current real Bluesky feed is used only for supplemental local screenshots of the ordinary homepage and archive.

Supplemental review pages `/home/book/`, `/home/dragon/`, and `/examples/notes/` show real previously published content. The book case references its public Bluesky CDN image and requires network access only when opened. The dragon example copies the repository's existing September 14 video and extracts a local poster. Automated tests use the generated cases, rather than the network image.
