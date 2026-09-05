---
title: Using a custom domain as an ATProto handle
description: ATProto allows a domain you control to become your public handle.
date: 2026-09-05
updated: 2026-09-05
tags:
  - atproto
  - dns
---

ATProto can verify a domain as a handle by resolving a DID through the domain.

For a website-hosted domain, the boring path is to serve:

```text
/.well-known/atproto-did
```

with the account DID as plain text.

## Gotcha

Do not hard-code an unverified DID into production. Configure it from the deployment environment once the real account and recovery setup are ready.
