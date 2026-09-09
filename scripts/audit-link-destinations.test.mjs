import assert from 'node:assert/strict'
import test from 'node:test'
import { auditCategory } from './audit-link-destinations.mjs'

test('link audit distinguishes semantic failures from HTTP and access failures', () => {
  assert.equal(auditCategory({ status: 200, semantic: { matched: true } }), 'verified')
  assert.equal(auditCategory({ status: 200, semantic: { matched: false } }), 'semantic-mismatch')
  assert.equal(auditCategory({ status: 404 }), 'broken')
  assert.equal(auditCategory({ status: 'network-error', error: 'ERR_SSL_SSL/TLS_ALERT_HANDSHAKE_FAILURE' }), 'broken')
  assert.equal(auditCategory({ status: 403 }), 'access-restricted')
  assert.equal(auditCategory({ status: 'network-error' }), 'unavailable')
})
