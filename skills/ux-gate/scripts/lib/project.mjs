// Per-project config, templates, and the app the capture runs against.
import { spawn, execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { allowanceError } from './guard.mjs';

export const CONFIG_PATH = '.toolbelt/ux-capture.json';

// Synchronous cleanups, run on any exit so session state, servers, and checkouts never outlive the run.
const cleanups = [];
export function onExit(fn) {
  cleanups.push(fn);
  return () => {
    const i = cleanups.indexOf(fn);
    if (i >= 0) cleanups.splice(i, 1);
  };
}
process.on('exit', () => {
  for (const fn of cleanups.splice(0).reverse()) {
    try {
      fn();
    } catch {
      /* best effort on the way out */
    }
  }
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(130));

// Replaces {{a.b}} with values from vars. An unknown name is an error, never an empty string.
// With `only`, names outside that root (such as setup values in the config) are left for later.
export function expand(value, vars, where, only) {
  if (typeof value === 'string') {
    return value.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (whole, name) => {
      if (only && !name.startsWith(`${only}.`)) return whole;
      const found = name.split('.').reduce((obj, key) => (obj == null ? undefined : obj[key]), vars);
      if (found === undefined || found === null || typeof found === 'object') {
        throw new Error(`${where}: {{${name}}} has no value`);
      }
      return String(found);
    });
  }
  if (Array.isArray(value)) return value.map(v => expand(v, vars, where, only));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, expand(v, vars, where, only)]));
  }
  return value;
}

const isObject = v => v && typeof v === 'object' && !Array.isArray(v);

// Query parameters for the app's dev login, such as a role: names mapped to strings.
export const signInParamsValid = p => p === undefined || isObject(p) && Object.values(p).every(v => typeof v === 'string');

// Reads and validates the project config; returns {} when the project has none.
export function loadConfig(projectRoot) {
  const file = join(projectRoot, CONFIG_PATH);
  if (!existsSync(file)) return {};
  let config;
  try {
    config = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${CONFIG_PATH} is not valid JSON: ${err.message}`);
  }
  config = expand(config, { env: process.env }, CONFIG_PATH, 'env');
  const fail = message => {
    throw new Error(`${CONFIG_PATH}: ${message}`);
  };
  if (!isObject(config)) fail('expected an object');
  const known = ['app', 'signIn', 'captureCss', 'guard', 'apiBase', 'setupBlock', 'setupHeaders'];
  for (const key of Object.keys(config)) if (!known.includes(key)) fail(`unknown field ${key}`);
  if (config.app !== undefined) {
    if (!isObject(config.app)) fail('app must be an object');
    for (const key of ['url', 'start', 'install', 'readyPath']) {
      if (config.app[key] !== undefined && typeof config.app[key] !== 'string') fail(`app.${key} must be a string`);
    }
  }
  if (config.signIn !== undefined) {
    const s = config.signIn;
    if (!isObject(s) || typeof s.path !== 'string' || !s.path.startsWith('/')) fail('signIn needs a route path');
    if (s.steps !== undefined && !Array.isArray(s.steps)) fail('signIn.steps must be a list');
    if (typeof s.waitFor !== 'string' || !s.waitFor) fail('signIn needs waitFor, a selector shown only once signed in');
    if (!signInParamsValid(s.params)) fail('signIn.params must map names to strings');
    s.steps = s.steps || [];
    s.params = s.params || {};
    s.allow = s.allow || [];
    s.stateFile = s.stateFile || '.toolbelt/ux/session.json';
    const state = resolve(projectRoot, s.stateFile);
    const rel = relative(projectRoot, state);
    if (rel.startsWith('..') || isAbsolute(rel)) fail('signIn.stateFile must be inside the project');
    s.stateFile = state;
  }
  if (config.captureCss !== undefined && typeof config.captureCss !== 'string') fail('captureCss must be a string');
  const allow = [...((config.guard && config.guard.allow) || []), ...((config.signIn && config.signIn.allow) || [])];
  for (const a of allow) {
    const error = allowanceError(a);
    if (error) fail(error);
  }
  if (config.setupBlock !== undefined) {
    if (!Array.isArray(config.setupBlock) || config.setupBlock.length === 0) fail('setupBlock must be a nonempty list');
    for (const p of config.setupBlock) {
      try {
        new RegExp(p, 'i');
      } catch {
        fail(`setupBlock pattern ${p} is not a valid regex`);
      }
    }
  }
  if (config.setupHeaders !== undefined && !isObject(config.setupHeaders)) fail('setupHeaders must be an object');
  if (config.apiBase !== undefined && !/^https?:\/\//.test(config.apiBase)) fail('apiBase must be an http(s) URL');
  return config;
}

async function answers(url) {
  try {
    await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

export async function freePort() {
  const srv = createServer();
  await new Promise(done => srv.listen(0, '127.0.0.1', done));
  const { port } = srv.address();
  await new Promise(done => srv.close(done));
  return port;
}

// Reuses an app already answering at url; otherwise runs app.start with PORT set
// to the URL's port and stops it afterwards. Returns {status, stop}.
export async function ensureApp({ url, app = {}, cwd, logFile, env = {} }) {
  const ready = new URL(app.readyPath || '/', url).href;
  if (await answers(ready)) return { status: 'reused', stop: async () => {} };
  if (!app.start) {
    throw new Error(`nothing answers at ${ready}; start the app, or set app.start in ${CONFIG_PATH}`);
  }
  const parsed = new URL(url);
  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  const log = openSync(logFile, 'a');
  const child = spawn('sh', ['-c', app.start], {
    cwd,
    detached: true,
    stdio: ['ignore', log, log],
    env: { ...process.env, PORT: port, ...env },
  });
  // The start command may background its server and exit, so the process group,
  // not the shell, is what counts as the app.
  const groupAlive = () => {
    try {
      process.kill(-child.pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  const kill = signal => {
    try {
      process.kill(-child.pid, signal);
    } catch {
      /* already gone */
    }
  };
  const forget = onExit(() => kill('SIGKILL'));
  const stop = async () => {
    kill('SIGTERM');
    for (let i = 0; i < 50 && groupAlive(); i += 1) await new Promise(done => setTimeout(done, 100));
    kill('SIGKILL');
    forget();
  };
  const deadline = Date.now() + 1000 * Number(app.startTimeoutSec || 120);
  while (Date.now() < deadline) {
    if (await answers(ready)) return { status: 'started', stop };
    if (!groupAlive()) break;
    await new Promise(done => setTimeout(done, 500));
  }
  const died = !groupAlive();
  await stop();
  const tail = readFileSync(logFile, 'utf8').split('\n').slice(-15).join('\n');
  throw new Error(`app.start did not answer at ${ready} (${died ? 'it exited' : 'timed out'}); log ${logFile}:\n${tail}`);
}

// A temporary detached checkout of ref, removed on exit. Runs app.install there when set.
export function checkoutBase({ projectRoot, ref, app = {}, logFile }) {
  const dir = mkdtempSync(join(tmpdir(), 'ux-capture-base-'));
  const remove = () => {
    try {
      execFileSync('git', ['-C', projectRoot, 'worktree', 'remove', '--force', dir], { stdio: 'ignore' });
    } catch {
      /* not registered */
    }
    rmSync(dir, { recursive: true, force: true });
  };
  const forget = onExit(remove);
  try {
    execFileSync('git', ['-C', projectRoot, 'worktree', 'add', '--detach', dir, ref], { stdio: 'pipe' });
  } catch (err) {
    forget();
    remove();
    throw new Error(`cannot check out ${ref}: ${String(err.stderr || err.message).trim()}`);
  }
  const sha = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD']).toString().trim();
  if (app.install) {
    const log = openSync(logFile, 'a');
    execSync(app.install, {
      cwd: dir,
      stdio: ['ignore', log, log],
      timeout: 15 * 60 * 1000,
      env: { ...process.env, UX_CAPTURE_SOURCE_ROOT: projectRoot },
    });
  }
  return { dir, sha, remove: () => { forget(); remove(); } };
}

export function headSha(projectRoot) {
  try {
    return execFileSync('git', ['-C', projectRoot, 'rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return null;
  }
}
