// The request guard's decisions, kept free of Playwright so they can be tested alone.

// Setup calls whose path matches any of these (case-insensitive regexes) never run.
// A project's `setupBlock` replaces this list.
export const DEFAULT_SETUP_BLOCK = [
  'send', 'e-?mail', 'sms', 'text-?message', 'notif', 'pay', 'charge', 'refund', 'stripe',
  'sync', 'quickbooks', 'qbo', 'xero', 'webhook', 'invit',
];

function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {
      out += '.*';
      i += 1;
    } else if (ch === '*') out += '[^/]*';
    else out += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${out}$`);
}

// `/path` patterns match the URL's path; `**/path` and `scheme://` patterns match
// origin and path. The query counts only when the pattern contains `?`.
export function urlMatches(pattern, url) {
  const parsed = new URL(url, 'http://relative.invalid');
  const query = pattern.includes('?') ? parsed.search : '';
  const subject = pattern.startsWith('/') ? parsed.pathname + query : parsed.origin + parsed.pathname + query;
  return globToRegExp(pattern).test(subject);
}

const matches = (rule, request) =>
  (rule.method || 'GET').toUpperCase() === request.method.toUpperCase() && urlMatches(rule.url, request.url);

// One of: fixture (answer locally), pass (a GET), allowed (an allowance), aborted.
export function guardDecision(request, { fixtures = [], allow = [] }) {
  const fixture = fixtures.find(f => matches(f, request));
  if (fixture) return { kind: 'fixture', fixture };
  if (request.method.toUpperCase() === 'GET') return { kind: 'pass' };
  if (allow.some(a => matches(a, request))) return { kind: 'allowed' };
  return { kind: 'aborted' };
}

// An allowance names one method and a URL with at least one literal path segment,
// so no allowance can let every write through.
export function allowanceError(allowance) {
  if (!allowance || typeof allowance.method !== 'string' || !/^[A-Z]+$/.test(allowance.method)) {
    return 'an allowance needs one upper-case method, such as POST';
  }
  if (typeof allowance.url !== 'string') return 'an allowance needs a url pattern';
  const path = allowance.url.replace(/^[a-z]+:\/\/[^/]*/, '');
  if (!/[^*/]/.test(path)) return `allowance url ${allowance.url} matches every path`;
  return null;
}

// The first block pattern matching a setup call's path and query, or null.
export function setupBlockedBy(method, url, patterns) {
  const parsed = new URL(url, 'http://relative.invalid');
  const subject = parsed.pathname + parsed.search;
  return patterns.find(p => new RegExp(p, 'i').test(subject)) || null;
}
