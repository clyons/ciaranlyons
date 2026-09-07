---
title: Two-state dark mode toggles
description: A persistent theme toggle should switch away from “yuck,” not make people choose a system setting.
date: 2026-09-07
updated: 2026-09-07
tags:
  - ux
  - usability
  - dark-mode
  - frontend
---

I keep returning to [Lea Verou’s argument](https://lea.verou.me/blog/2026/dark-mode-toggles/) that a persistent theme control needs only two visible states.

I’m not against tri-state controls on principle, but I agree with Lea: only developers think about `System`. Most people will never encounter a problem, and [Don’t Make Me Think](https://sensible.com/dont-make-me-think/) principles say to abstract confusing states away for the vast majority.

The two-state toggle implementation still has three values: system, light, and dark. But the toggle never actively selects “light” or “dark.” It simply switches away from “yuck”: whatever theme you’re looking at now.

I made a minimal reference implementation: [live demo](https://clyons.github.io/dark-mode-toggle-til/) and [source](https://github.com/clyons/dark-mode-toggle-til).
