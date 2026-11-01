// Unit tests for the capture tool's request guard and setup block list.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const lib = process.argv[2];
const { guardDecision, urlMatches, allowanceError, setupBlockedBy, DEFAULT_SETUP_BLOCK } =
  await import(pathToFileURL(`${lib}/guard.mjs`).href);

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`ok - ${name}`); } catch (error) { failures += 1; console.error(`not ok - ${name}: ${error.message}`); }
}

const app = 'http://127.0.0.1:3000';

check('a GET with no fixture passes unlogged', () => {
  assert.deepEqual(guardDecision({ method: 'GET', url: `${app}/jobs` }, {}), { kind: 'pass' });
});

check('every write without a fixture or allowance is aborted', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'WEBSOCKET']) {
    assert.equal(guardDecision({ method, url: `${app}/api/notifications/1/read` }, {}).kind, 'aborted', method);
  }
});

check('a matching fixture answers before the guard, for any method', () => {
  const fixture = { method: 'POST', url: '/api/estimates', status: 201, json: { id: 1 } };
  assert.deepEqual(guardDecision({ method: 'POST', url: `${app}/api/estimates` }, { fixtures: [fixture] }),
    { kind: 'fixture', fixture });
  const get = { url: '/api/settings', json: {} };
  assert.equal(guardDecision({ method: 'GET', url: `${app}/api/settings?x=1` }, { fixtures: [get] }).kind, 'fixture');
});

check('a fixture for another method does not answer', () => {
  const fixture = { method: 'GET', url: '/api/estimates', json: [] };
  assert.equal(guardDecision({ method: 'POST', url: `${app}/api/estimates` }, { fixtures: [fixture] }).kind, 'aborted');
});

check('an allowance lets exactly its method and URL through', () => {
  const allow = [{ method: 'POST', url: '/auth/login' }];
  assert.equal(guardDecision({ method: 'POST', url: `${app}/auth/login` }, { allow }).kind, 'allowed');
  assert.equal(guardDecision({ method: 'PUT', url: `${app}/auth/login` }, { allow }).kind, 'aborted');
  assert.equal(guardDecision({ method: 'POST', url: `${app}/auth/login/other` }, { allow }).kind, 'aborted');
});

check('URL patterns: path globs, query only when written, full URLs', () => {
  assert(urlMatches('/api/jobs/*', `${app}/api/jobs/42?tab=1`));
  assert(!urlMatches('/api/jobs/*', `${app}/api/jobs/42/notes`));
  assert(urlMatches('/api/**', `${app}/api/jobs/42/notes`));
  assert(urlMatches('/api/jobs?status=open', `${app}/api/jobs?status=open`));
  assert(!urlMatches('/api/jobs?status=open', `${app}/api/jobs?status=closed`));
  assert(urlMatches('http://127.0.0.1:4000/auth/*', 'http://127.0.0.1:4000/auth/login'));
  assert(!urlMatches('http://127.0.0.1:4000/auth/*', 'http://127.0.0.1:3000/auth/login'));
  assert(urlMatches('**/auth/login', 'http://127.0.0.1:4000/auth/login'));
});

check('an allowance cannot become an off switch', () => {
  assert.equal(allowanceError({ method: 'POST', url: '/auth/login' }), null);
  for (const bad of [{ method: '*', url: '/auth/login' }, { url: '/auth/login' }, { method: 'POST', url: '**' },
    { method: 'POST', url: '/**' }, { method: 'POST', url: '*' }, { method: 'POST', url: 'http://x/**' }]) {
    assert.notEqual(allowanceError(bad), null, JSON.stringify(bad));
  }
});

check('setup calls that send, charge, or sync are blocked by default', () => {
  for (const url of ['/api/invoices/1/send', '/api/estimates/1/email', '/api/sms', '/api/payments', '/api/refunds/3',
    '/api/integrations/quickbooks/sync', '/api/webhooks/test', '/api/team/invitations', '/api/charges']) {
    assert.notEqual(setupBlockedBy('POST', url, DEFAULT_SETUP_BLOCK), null, url);
  }
  assert.equal(setupBlockedBy('POST', '/api/estimates', DEFAULT_SETUP_BLOCK), null);
  assert.equal(setupBlockedBy('GET', '/auth/csrf', DEFAULT_SETUP_BLOCK), null);
});

check('a project block list replaces the default', () => {
  assert.equal(setupBlockedBy('POST', '/api/estimates/1/send', ['nothing-matches']), null);
  assert.equal(setupBlockedBy('POST', '/api/estimates', ['estimates']), 'estimates');
});

if (failures) process.exitCode = 1;
else console.log('PASS');
