import assert from 'node:assert/strict'
import test from 'node:test'
import { extractHtml, structuredDataSummary } from './extract.mjs'

const article = `<!doctype html>
<html lang="en-GB"><head>
<title>Fallback title | Example</title>
<meta property="og:title" content="Agents and software discovery">
<meta name="description" content="How autonomous agents choose software.">
<meta property="og:site_name" content="Example Journal">
<meta property="article:published_time" content="2025-03-04T10:00:00Z">
<link rel="canonical" href="/2025/agents?ref=home">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"Example"},{"@type":"NewsArticle","headline":"Agents and software discovery","author":[{"@type":"Person","name":"Ada Example"}],"publisher":{"@type":"Organization","name":"Example Journal"}}]}</script>
<script>var tracking = "do not include";</script>
<style>.x{color:red}</style>
</head><body>
<header class="site-header"><nav><a href="/">Home</a><a href="/about">About us</a></nav></header>
<div class="ad-slot">Buy our sponsored product now</div>
<main>
<article>
<h1>Agents and software discovery</h1>
<p>Autonomous agents increasingly evaluate software on behalf of people, comparing documentation, pricing pages, and integration guides before a human sees any of them.</p>
<p>That shift changes distribution: vendors compete for machine readers, and the signals that once persuaded people now have to be legible to models as well.</p>
<div class="share-buttons">Share on social</div>
<p>The essay argues that &ldquo;agent-readable&rdquo; documentation will become a competitive advantage, and walks through three examples of companies adapting early.</p>
<p>It closes with practical recommendations for structured product data, stable URLs, and clear licensing terms that agents can parse reliably.</p>
</article>
<aside class="related">Related: ten other posts</aside>
</main>
<footer>Copyright Example</footer>
<div class="cookie-consent" hidden>We use cookies</div>
</body></html>`

test('extraction keeps the article and drops navigation, scripts, ads, and furniture', () => {
  const extracted = extractHtml(article, 'https://example.com/2025/agents')
  assert.match(extracted.text, /Autonomous agents increasingly evaluate software/)
  assert.match(extracted.text, /“agent-readable” documentation/)
  for (const unwanted of ['About us', 'sponsored product', 'do not include', 'color:red', 'Share on social', 'ten other posts', 'Copyright', 'cookies']) {
    assert.doesNotMatch(extracted.text, new RegExp(unwanted), unwanted)
  }
  assert.ok(extracted.wordCount > 60)
  assert.match(extracted.contentHash, /^sha256:[0-9a-f]{16}$/)
})

test('extraction reads Open Graph, canonical, language, and structured data metadata', () => {
  const { metadata } = extractHtml(article, 'https://example.com/2025/agents')
  assert.equal(metadata.title, 'Agents and software discovery')
  assert.equal(metadata.description, 'How autonomous agents choose software.')
  assert.equal(metadata.publisher, 'Example Journal')
  assert.equal(metadata.author, 'Ada Example')
  assert.equal(metadata.publishedAt, '2025-03-04T10:00:00Z')
  assert.equal(metadata.canonicalUrl, 'https://example.com/2025/agents?ref=home')
  assert.equal(metadata.schemaType, 'NewsArticle')
  assert.equal(metadata.language, 'en-GB')
})

test('extraction falls back to the whole page when there is no article element', () => {
  const extracted = extractHtml('<html><body><div id="content"><p>Plain page text that has no article wrapper at all.</p></div><nav>Menu</nav></body></html>', 'https://example.com/')
  assert.equal(extracted.text, 'Plain page text that has no article wrapper at all.')
  assert.equal(extracted.metadata.title, undefined)
})

test('the content hash ignores whitespace-only differences and changes with the text', () => {
  const one = extractHtml('<p>Same   words here</p>', 'https://example.com/')
  const two = extractHtml('<p>Same words\nhere</p>', 'https://example.com/')
  const three = extractHtml('<p>Different words here</p>', 'https://example.com/')
  assert.equal(one.contentHash, two.contentHash)
  assert.notEqual(one.contentHash, three.contentHash)
})

test('placeholder metadata values are treated as missing', () => {
  const { metadata } = extractHtml('<head><meta name="description" content="None"><meta property="og:title" content="undefined"><link rel="canonical" href="undefined"><title>Real title</title></head>', 'https://example.com/')
  assert.equal(metadata.description, undefined)
  assert.equal(metadata.canonicalUrl, undefined)
  assert.equal(metadata.title, 'Real title')
})

test('invalid or irrelevant JSON-LD is ignored', () => {
  assert.deepEqual(structuredDataSummary(['{not json', '{"@type":"Organization","name":"Org"}']), {})
})
