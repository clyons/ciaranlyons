import assert from 'node:assert/strict'
import test from 'node:test'
import { directSourceCandidate, exactFeedCandidates, feedburnerId, feedproxyEntryId, parseArgs, parseHtmlAnchors, parseRssItems, recordableHttpUrl, recoveryPlan, rewriteTargetUrl, semanticMatch, titleSlug } from './recover-feedproxy-links.mjs'

test('Feedproxy identification accepts FeedBurner paths with intermediate source segments', () => {
  assert.equal(feedburnerId('http://feedproxy.google.com/~r/blogspot/Egta/~3/id/article.html'), 'Egta')
  assert.equal(feedburnerId('http://feedproxy.google.com/~r/timoni/~3/id/post'), 'timoni')
  assert.equal(feedburnerId('https://example.com/~r/timoni/~3/id/post'), undefined)
  assert.equal(feedburnerId('https://feedproxy.google.com/not-a-feed'), undefined)
  assert.equal(feedproxyEntryId('http://feedproxy.google.com/~r/example/~3/token/'), undefined)
  assert.equal(feedproxyEntryId('http://feedproxy.google.com/~r/example/~3/token/article.html'), 'article.html')
})

test('recorded redirect URLs omit credential-bearing query parameters', () => {
  assert.equal(
    recordableHttpUrl('https://example.com/article?access_token=secret&keep=1'),
    'https://example.com/article?keep=1',
  )
  assert.equal(recordableHttpUrl('https://user:secret@example.com/article'), undefined)
})

test('Timoni Feedproxy post IDs map to their stable Tumblr permalinks', () => {
  const link = { targetUrl: 'http://feedproxy.google.com/~r/timoni/~3/token/125858784448' }
  assert.deepEqual(directSourceCandidate(link, 'timoni'), { targetUrl: 'https://blog.timoni.org/post/125858784448', evidence: 'timoni-tumblr-post-id' })
  assert.equal(directSourceCandidate(link, 'another-feed'), undefined)
  assert.equal(directSourceCandidate({ targetUrl: 'http://feedproxy.google.com/~r/timoni/~3/token/not-an-id' }, 'timoni'), undefined)
})

test('Seth blog Feedproxy paths map by published date and original slug', () => {
  const link = { targetUrl: 'http://feedproxy.google.com/~r/typepad/sethsmainblog/~3/token/sethsblog~Choosing-to-be-formidable.html', publishedAt: '2013-08-09T09:05:00.000Z' }
  assert.deepEqual(directSourceCandidate(link, 'sethsmainblog'), { targetUrl: 'https://seths.blog/2013/08/Choosing-to-be-formidable.html', evidence: 'seths-blog-date-and-slug' })
})

test('publisher-native identifiers map Wondermark, Signal v. Noise, and Google Analytics links', () => {
  assert.equal(directSourceCandidate({ title: '#1125; In which a Bean is juiced', targetUrl: 'http://feedproxy.google.com/~r/wondermark/~3/token/' }, 'wondermark').targetUrl, 'https://wondermark.com/c/1125/')
  assert.equal(directSourceCandidate({ title: '37signals.com homepage evolution', targetUrl: 'http://feedproxy.google.com/~r/37signals/beMH/~3/token/3007-37signalscom-homepage-evolution' }, 'beMH').targetUrl, 'https://signalvnoise.com/posts/3007-37signalscom-homepage-evolution')
  assert.equal(directSourceCandidate({ title: 'Reports', publishedAt: '2014-02-27T22:55:00.001Z', targetUrl: 'http://feedproxy.google.com/~r/blogspot/tRaA/~3/token/8-custom-reports.html' }, 'tRaA').targetUrl, 'https://analytics.googleblog.com/2014/02/8-custom-reports.html')
})

test('publisher-native identifiers map ParisLemon and Dullneon links', () => {
  assert.equal(directSourceCandidate({ targetUrl: 'http://feedproxy.google.com/~r/parislemon/~3/token/46294690303' }, 'parislemon').targetUrl, 'https://parislemon.com/post/46294690303')
  assert.equal(directSourceCandidate({ publishedAt: '2013-05-09T10:23:48.000Z', targetUrl: 'http://feedproxy.google.com/~r/random_dullneon/~3/token/adobe-edge-reflow.html' }, 'random_dullneon').targetUrl, 'https://dullneon.com/randomnotes/2013/05/adobe-edge-reflow.html')
})

test('publisher-native paths map migrated and date-based publications', () => {
  const dated = { slug: 'saved-title-0123456789', title: 'Saved title', publishedAt: '2013-09-12T16:15:00.000Z', targetUrl: 'http://feedproxy.google.com/~r/blogspot/amDG/~3/token/better-backlink-data.html' }
  assert.equal(directSourceCandidate(dated, 'amDG').targetUrl, 'https://developers.google.com/search/blog/2013/09/better-backlink-data?hl=en')
  assert.equal(directSourceCandidate({ ...dated, targetUrl: 'http://feedproxy.google.com/~r/subtraction/~3/token/' }, 'subtraction').targetUrl, 'https://www.subtraction.com/2013/09/12/saved-title/')
  assert.equal(directSourceCandidate({ targetUrl: 'http://feedproxy.google.com/~r/alistapart/main/~3/token/better-public-speaking' }, 'main').targetUrl, 'https://alistapart.com/blog/post/better-public-speaking/')
  assert.equal(directSourceCandidate({ targetUrl: 'http://feedproxy.google.com/~r/bufferapp/~3/token/content-promotion' }, 'bufferapp').targetUrl, 'https://buffer.com/resources/content-promotion/')
  assert.equal(directSourceCandidate({ ...dated, targetUrl: 'http://feedproxy.google.com/~r/tommacwright/odWX/~3/token/twitter-zero.html' }, 'odWX').targetUrl, 'https://macwright.com/2013/09/12/twitter-zero')
  assert.equal(directSourceCandidate(dated, 'wondermark').targetUrl, 'https://wondermark.com/saved-title/')
  assert.equal(directSourceCandidate(dated, 'Quicksprout').targetUrl, 'https://www.quicksprout.com/2013/09/12/saved-title/')
  assert.equal(directSourceCandidate(dated, 'white_african').targetUrl, 'http://whiteafrican.com/2013/09/12/saved-title/')
  assert.equal(directSourceCandidate(dated, 'InsideFacebook').targetUrl, 'http://www.insidefacebook.com/2013/09/12/saved-title/')
  assert.equal(directSourceCandidate(dated, 'lessdoing').targetUrl, 'http://www.lessdoing.com/2013/09/12/saved-title/')
  assert.equal(directSourceCandidate(dated, 'aDYs').targetUrl, 'https://adcontrarian.blogspot.com/2013/09/better-backlink-data.html')
  assert.equal(directSourceCandidate(dated, 'Asymco').targetUrl, 'https://asymco.com/2013/09/12/saved-title/')
  assert.equal(directSourceCandidate(dated, 'DavidSimon').targetUrl, 'https://davidsimon.com/saved-title/')
})

test('titleSlug preserves complete publisher slugs and removes apostrophes', () => {
  assert.equal(titleSlug('11 Essential Elements of a Perfect Blog Design (a Data Driven Answer)'), '11-essential-elements-of-a-perfect-blog-design-a-data-driven-answer')
  assert.equal(titleSlug('You Can’t Ignore This'), 'you-cant-ignore-this')
})

test('RSS parsing and candidate selection require one exact title and a safe HTTP destination', () => {
  const items = parseRssItems('<rss><channel><item><title><![CDATA[An &amp; exact title]]></title><link>https://example.com/article</link></item><item><title>Nearby title</title><link>https://example.com/nearby</link></item></channel></rss>')
  assert.deepEqual(exactFeedCandidates({ title: 'An & exact title' }, items), [{ targetUrl: 'https://example.com/article', evidence: 'feedburner-exact-title' }])
  assert.deepEqual(exactFeedCandidates({ title: 'Missing' }, items), [])
  assert.deepEqual(exactFeedCandidates({ title: 'Nearby title' }, [{ title: 'Nearby title', targetUrl: 'javascript:bad' }]), [])
})

test('HTML archive parsing resolves relative publisher links', () => {
  assert.deepEqual(parseHtmlAnchors('<li><a href="/ff/entry.asp?1667">Collecting &amp; Paying</a></li>', 'https://www.lukew.com/ff/archive.asp'), [{ title: 'Collecting & Paying', targetUrl: 'https://www.lukew.com/ff/entry.asp?1667', evidence: 'publisher-native-archive-exact-title' }])
})

test('recovery plan validates an exact candidate before proposing a change', async () => {
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(String(url))
    if (String(url).startsWith('https://feeds.feedburner.com/')) {
      const response = new Response('<rss><item><title>Saved title</title><link>https://publisher.example/article</link></item></rss>', { status: 200 })
      Object.defineProperty(response, 'url', { value: String(url) })
      return response
    }
    const response = new Response('<title>Saved title</title><main>Matching article body.</main>', { status: 200, headers: { 'content-type': 'text/html' } })
    Object.defineProperty(response, 'url', { value: String(url) })
    return response
  }
  const actions = await recoveryPlan([{ slug: 'saved', title: 'Saved title', targetUrl: 'http://feedproxy.google.com/~r/example/~3/token/article' }], { fetchImpl })
  assert.equal(actions[0].action, 'recover')
  assert.equal(actions[0].targetUrl, 'https://publisher.example/article')
  assert.equal(calls.length, 2)
})

test('semantic validation requires title or combined title and description evidence', () => {
  assert.equal(semanticMatch({ title: 'A distinctive saved article', description: '' }, '<title>A distinctive saved article</title>').matched, true)
  assert.equal(semanticMatch({ title: 'A distinctive saved article', description: 'Original discussion of careful validation and source evidence.' }, '<title>Unrelated page</title><p>Nothing in common.</p>').matched, false)
})

test('recovery plan leaves unavailable and ambiguous candidates unchanged', async () => {
  const unavailable = async (url) => String(url).startsWith('https://feeds.feedburner.com/')
    ? new Response('<rss><item><title>Saved title</title><link>https://publisher.example/article</link></item></rss>', { status: 200 })
    : new Response('gone', { status: 404 })
  const actions = await recoveryPlan([{ slug: 'saved', title: 'Saved title', targetUrl: 'http://feedproxy.google.com/~r/example/~3/token/article' }], { fetchImpl: unavailable })
  assert.equal(actions[0].action, 'unresolved')
  assert.equal(actions[0].reason, 'candidate-unusable')

  const ambiguous = async () => new Response('<rss><item><title>Saved title</title><link>https://publisher.example/one</link></item><item><title>Saved title</title><link>https://publisher.example/two</link></item></rss>', { status: 200 })
  const ambiguousActions = await recoveryPlan([{ slug: 'saved', title: 'Saved title', targetUrl: 'http://feedproxy.google.com/~r/example/~3/token/article' }], { fetchImpl: ambiguous })
  assert.equal(ambiguousActions[0].action, 'unresolved')
  assert.equal(ambiguousActions[0].reason, 'ambiguous-exact-title')
})

test('frontmatter rewriting changes only the planned target URL and CLI defaults to dry-run', () => {
  const markdown = '---\ntitle: "Saved"\ntargetUrl: "http://feedproxy.google.com/~r/example/~3/token"\nfeedlyId: "id"\n---\nCommentary\n'
  const rewritten = rewriteTargetUrl(markdown, 'http://feedproxy.google.com/~r/example/~3/token', 'https://publisher.example/article')
  assert.match(rewritten, /^targetUrl: "https:\/\/publisher\.example\/article"$/m)
  assert.match(rewritten, /Commentary/)
  assert.throws(() => rewriteTargetUrl(markdown, 'https://changed.example', 'https://publisher.example/article'), /changed since recovery/)
  assert.equal(parseArgs([]).dryRun, true)
  assert.equal(parseArgs(['--apply']).dryRun, false)
})
