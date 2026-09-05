---
title: Animating a logo in Blender with a coding agent
description: Blender's Python API makes agent-generated 3D scenes surprisingly editable.
date: 2026-09-05
updated: 2026-09-05
tags:
  - blender
  - coding-agents
  - macos
  - animation
---

Via [Simon Willison](https://til.simonwillison.net/llms/blender-coding-agents-macos) and others, I learned that LLMs are now very good at Blender. That makes sense: geometry, materials, and motion are ultimately math and code, and Blender has an extensive [Python API](https://docs.blender.org/api/current/index.html).

I needed an experiment, so I asked GPT-5.6 Sol:

> Use the already installed `/Applications/Blender` to render an extruded version of the Positive Intelligence symbol and logomark from positiveintelligence.com.

Finding and modelling the logo was easy. Sol found the artwork, imported it, removed the white background and registered trademark, extruded the remaining paths, and applied a reflective black material.

![The first extruded version of the Positive Intelligence logo](positive-intelligence-extruded-lockup.png)

Sol also created a normal `.blend` project containing the geometry, materials, camera, lights, and animation timeline. It can be opened and edited directly in Blender, just like a scene built by hand.

![The generated scene open for editing in Blender](blender-scene-editable.png)

## Futzing with light and motion

Lighting and motion were the tricky parts. I asked for a camera arc, a light moving in the opposite direction, and a more dynamic pan across the logo. Several iterations followed to remove a square reflection, make the light cross the whole face, and soften the final highlight.

The biggest visual improvement came from the backdrop. The curved wall used in a photography or film studio is called a [*cyclorama*](https://en.wikipedia.org/wiki/Cyclorama_(theater)). Replacing separate floor and wall planes with one continuous cyclorama removed the horizon line and made the result feel much more like a studio shot.

The final animation uses a restrained camera arc, a circular moving light, a diffuse metallic reflection, and a cyclorama that cycles through four PQ brand colours.

<video src="positive-intelligence-logo-cinematic-v4.mp4" autoplay muted loop playsinline controls poster="cinematic-v4-keyframes.png" aria-label="Eight-second Positive Intelligence logo animation rendered in Blender"></video>

![Keyframes from the final PQ logo animation](cinematic-v4-keyframes.png)

The repo lives at [clyons/gpt-5-6-sol-blender-positive-intelligence-logo](https://github.com/clyons/gpt-5-6-sol-blender-positive-intelligence-logo).

Scripts: [initial render](https://github.com/clyons/gpt-5-6-sol-blender-positive-intelligence-logo/blob/main/work/render_positive_intelligence.py), [first animation](https://github.com/clyons/gpt-5-6-sol-blender-positive-intelligence-logo/blob/main/work/render_positive_intelligence_animation.py), [v2](https://github.com/clyons/gpt-5-6-sol-blender-positive-intelligence-logo/blob/main/work/render_positive_intelligence_cinematic_v2.py), [v3](https://github.com/clyons/gpt-5-6-sol-blender-positive-intelligence-logo/blob/main/work/render_positive_intelligence_cinematic_v3.py), and [v4](https://github.com/clyons/gpt-5-6-sol-blender-positive-intelligence-logo/blob/main/work/render_positive_intelligence_cinematic_v4.py).

Files: [MP4](https://github.com/clyons/gpt-5-6-sol-blender-positive-intelligence-logo/blob/main/outputs/positive-intelligence-logo-cinematic-v4.mp4) and [Blender project](https://github.com/clyons/gpt-5-6-sol-blender-positive-intelligence-logo/blob/main/outputs/positive-intelligence-logo-cinematic-v4.blend).
