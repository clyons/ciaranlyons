---
title: Teaching a printed dragon to fly
description: A 3D print becomes a Three.js flight playground, with Box3D joints and a little help from GPT-6 Astra.
date: 2026-09-13
updated: 2026-09-14
tags:
  - threejs
  - box3d
  - coding-agents
  - animation
---

**Update — 14 September 2026:** I’ve since swapped the original model for [Biocraftlab’s Elder Fire Dragon](https://www.printables.com/model/1385888-elder-fire-dragon-flexi-toy-figure), licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). That lets me host the adapted model and share a playable demo: [take the dragon for a spin](https://clyons.github.io/dragon-flight-til/play/).

I wanted to experiment with Three.js after seeing [flo-bit’s six tiny worlds](https://bsky.app/profile/flo-bit.dev/post/3mus62njkbs2w), [vibe-coded’s marble maze with Box3D physics](https://bsky.app/profile/vibe-coded.com/post/3mvghewqio22z), and countless other things people have been making in the browser.

I know almost nothing about 3D modelling, so I thought a model designed for 3D printing might be a simple place to start. An articulated print seemed especially promising: someone had already figured out the shape and how the pieces fit together.

I originally chose an [articulated dragon by jars_2003 on MakerWorld](https://makerworld.com/en/models/2735519-articulated-dragon#profileId-3032774). Its STL file describes the surface as triangles. We split it into seven movable sections, keeping all the original detail, then adjusted the scale, orientation, and shading for Three.js.

The articulation needed another step. The printed connections don’t arrive as a digital rig: we connected the sections with six joints in Box3D and set how far each could bend and twist. Three.js draws the dragon; Box3D handles its physical movement.

Working with GPT-6 Astra, I turned it into a flight playground. The head leads the swoops, the body follows, and the tail trails behind. Arrow keys take over from autopilot. You can also grab a section, shake the dragon, and let go with enough momentum to throw it.

<video src="https://clyons.github.io/dragon-flight-til/outputs/dragon-feature-tour.mp4?v=elder-short" controls playsinline preload="metadata" width="540" height="675" poster="https://clyons.github.io/dragon-flight-til/outputs/dragon-poster.jpg?v=elder-fire" aria-label="Portrait demo of Dragon: Flight Playground showing flight, steering, grabbing, throwing, and material changes"><a href="https://clyons.github.io/dragon-flight-til/">Watch the portrait demo.</a></video>

Astra chose jade, copper, and obsidian as the starting finishes. I just asked for a little more shine here, a little less there. Those properties live in [the material presets](https://github.com/clyons/dragon-flight-til/blob/ba3630bc73c4c1b7c40b13a5d73c968a54955163/src/main.js#L104-L145). Colour, roughness, metalness, and transmission are Three.js settings, separate from the STL geometry.

The original MakerWorld model isn’t included in the repository; the playable demo now uses the CC-licensed replacement linked above.

One unexpected rabbit hole: looking at the flight-path code, I spotted [CatmullRomCurve3](https://github.com/clyons/dragon-flight-til/blob/ba3630bc73c4c1b7c40b13a5d73c968a54955163/src/flight-path.js#L1-L20), the Three.js curve guiding the dragon’s head. Catmull as in [Ed Catmull, Pixar’s co-founder](https://www.pixar.com/our-story). The other half of the name is Raphael Rom: their 1974 paper, [*A Class of Local Interpolating Splines*](https://doi.org/10.1016/B978-0-12-079050-0.50020-5), describes the mathematics behind these smooth curves through a series of points.

Project: [clyons/dragon-flight-til](https://github.com/clyons/dragon-flight-til).

Demo: [portrait](https://clyons.github.io/dragon-flight-til/) · [widescreen](https://clyons.github.io/dragon-flight-til/widescreen.html).
