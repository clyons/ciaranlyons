---
title: Control Astro stylesheet order with URL imports
description: A Vite URL import lets an Astro layout place a stylesheet link exactly where it is needed.
date: 2026-09-09
updated: 2026-09-09
tags:
  - astro
  - vite
  - css
  - performance
---

While reviewing my document head against [Vale’s HTML boilerplate](https://vale.rocks/posts/html-boilerplate/), I found that Astro had put the global stylesheet link at the end of the generated `<head>`. Its location in the `.astro` file was not meaningful because this was a side-effect import:

```astro
---
import '../styles/global.css'
---
```

Adding Vite’s [`?url` suffix](https://vite.dev/guide/assets.html#importing-asset-as-url) changes the import into a URL value. That lets the layout write the link in an exact position:

```astro
---
import globalStylesUrl from '../styles/global.css?url'
---

<head>
  <link rel="stylesheet" href={globalStylesUrl} />
</head>
```

The production build still emits a content-hashed asset URL, but this is an escape hatch with a tradeoff: [Astro warns](https://docs.astro.build/en/guides/styling/#url-css-imports) that the file is no longer optimized with the rest of the page’s CSS. Small files may also become base64 data URLs unless Vite’s `build.assetsInlineLimit` is disabled.

Inspect the generated HTML, not just the component source, and visually regression-test any change to stylesheet loading or cascade order.
