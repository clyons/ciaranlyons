---
title: Static search can wait a long time before becoming a service
description: A generated JSON index is enough for a small personal site.
date: 2026-09-01
updated: 2026-09-01
tags:
  - coding
  - astro
  - search
---

For a personal site, search does not need a server until the corpus is large enough to justify one.

Generate `search.json` at build time and filter it in the browser. It keeps hosting simple and the content portable.
