import process from 'node:process'

const origin = new URL(process.env.SITE_URL || 'https://ciaranlyons.com')
if (origin.protocol !== 'https:') throw new Error('SITE_URL must use HTTPS')

async function request(path, protocol = 'https:') {
  const url = new URL(path, origin)
  url.protocol = protocol
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) })
  return { url, response }
}

const checks = [
  ['plaintext root', await request('/', 'http:'), 'redirect'],
  ['plaintext feed', await request('/feed.xml', 'http:'), 'redirect'],
  ['slashless route', await request('/about'), 'redirect-or-success'],
  ['canonical route', await request('/about/'), 'success'],
  ['feed', await request('/feed.xml'), 'success'],
  ['sitemap', await request('/sitemap-index.xml'), 'success'],
  ['ATProto identity', await request('/.well-known/atproto-did'), 'success'],
  ['Standard.site identity', await request('/.well-known/site.standard.publication'), 'success'],
]

let failed = false
for (const [label, { url, response }, expectation] of checks) {
  const location = response.headers.get('location')
  const redirectsToHttps = response.status >= 300 && response.status < 400 && location && new URL(location, url).protocol === 'https:'
  const succeeds = response.status >= 200 && response.status < 300
  const passes = expectation === 'redirect'
    ? redirectsToHttps
    : expectation === 'success'
      ? succeeds
      : succeeds || redirectsToHttps
  console.log(`${passes ? 'pass' : 'FAIL'} ${label}: ${response.status}${location ? ` -> ${location}` : ''}`)
  failed ||= !passes
}

if (failed) process.exitCode = 1
