---
title: Removing an orphaned Wacom driver after Time Machine
description: Old launch agents can survive migration and keep loading removed tablet software.
date: 2026-08-22
updated: 2026-08-22
tags:
  - macos
  - cleanup
---

After a Time Machine migration, check both LaunchAgents and LaunchDaemons when old hardware software appears to still be running.

Useful places to inspect:

```bash
/Library/LaunchAgents
/Library/LaunchDaemons
~/Library/LaunchAgents
```

Remove only files you have identified clearly, then reboot or unload the matching job.
