import assert from 'node:assert/strict'
import test from 'node:test'
import matter from 'gray-matter'
import { rewriteDestinationAudit } from './annotate-link-destinations.mjs'

const markdown = `---
title: "Example"
targetUrl: "https://example.com/article"
tags: []
---
Notes remain intact.
destinationStatus: prose, not metadata
`

test('destination annotation adds invisible audit metadata without changing other content', () => {
  const updated = rewriteDestinationAudit(markdown, 'https://example.com/article', 'broken', '2026-09-09T05:08:28.279Z')
  const parsed = matter(updated)
  assert.equal(parsed.data.destinationStatus, 'broken')
  assert.equal(parsed.data.destinationLastCheckedAt, '2026-09-09T05:08:28.279Z')
  assert.equal(parsed.content, matter(markdown).content)
})

test('destination annotation is idempotent and refuses stale or invalid audit data', () => {
  const once = rewriteDestinationAudit(markdown, 'https://example.com/article', 'verified', '2026-09-09T05:08:28.279Z')
  assert.equal(rewriteDestinationAudit(once, 'https://example.com/article', 'verified', '2026-09-09T05:08:28.279Z'), once)
  assert.throws(() => rewriteDestinationAudit(markdown, 'https://wrong.example/article', 'broken', '2026-09-09T05:08:28.279Z'), /changed since the audit/)
  assert.throws(() => rewriteDestinationAudit(markdown, 'https://example.com/article', 'mystery', '2026-09-09T05:08:28.279Z'), /Unknown destination status/)
})
