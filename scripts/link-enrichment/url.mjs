// Conservative URL canonicalisation for recording canonical URLs and spotting duplicates.
// It never rewrites a Link's `targetUrl`; destination changes stay with the reviewed
// recovery tools. Only parameters that exist purely for tracking are removed.
import { normalizeTargetUrl } from '../sync-feedly-links.mjs'

const trackingParameters = new Set([
  'access_token', 'fbclid', 'gclid', 'dclid', 'msclkid', 'yclid', 'twclid', 'igshid', 'mc_cid', 'mc_eid',
  'mkt_tok', '_hsenc', '_hsmi', 'hsctatracking', 'oly_anon_id', 'oly_enc_id', 'vero_id', 'vero_conv',
  'wickedid', 'ck_subscriber_id', 'ref_src', 'ref_url', 'cmpid', 'cmp', 's_cid', 'ncid', 'sr_share',
  'trk', 'trkcampaign', 'spm', 'scid', 'utm',
])

export function canonicalizeUrl(value) {
  let normalized
  try {
    normalized = new URL(normalizeTargetUrl(value))
  } catch {
    return undefined
  }
  for (const key of [...normalized.searchParams.keys()]) {
    if (trackingParameters.has(key.toLowerCase()) || /^(?:utm_|pk_|mtm_|hsa_)/i.test(key)) normalized.searchParams.delete(key)
  }
  return normalized.href
}

// Looser key used only to compare two URLs for "probably the same resource".
export function comparableUrl(value) {
  const canonical = canonicalizeUrl(value)
  if (!canonical) return undefined
  const url = new URL(canonical)
  url.protocol = 'https:'
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '')
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '')
  url.searchParams.sort()
  return url.href
}
