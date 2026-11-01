#!/usr/bin/env node
// ux-capture — scripted UX capture: stills, crops, mechanical checks.
// Playwright is resolved from the consuming project, never from this plugin.

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DEFAULT_SETUP_BLOCK, guardDecision, setupBlockedBy } from './lib/guard.mjs';
import { checkoutBase, ensureApp, expand, freePort, headSha, loadConfig, onExit, signInParamsValid } from './lib/project.mjs';
import { writeBrief } from './lib/brief.mjs';

const USAGE = `Usage: ux-capture <matrix.json> --out <dir> [options]

  --out <dir>            Directory for images, mechanical.json and brief.md (required)
  --project-root <dir>   Project the run belongs to; where 'playwright', the project
                         config (.toolbelt/ux-capture.json) and relative files
                         resolve from (default: cwd)
  --url <url>            App URL, overriding the matrix baseUrl and app.url
  --base-url <url>       Capture the same shots first against this running base app,
                         into <out>/before/, and pair them in the brief
  --base-ref <ref>       Same, against a temporary checkout of <ref> served with
                         the project config's app.start, removed afterwards
  --shot <path/step>     Retake only this shot into a new --out folder (repeatable)
  --pathway <name>       Capture only this pathway (repeatable)
  --baseline <dir>       Earlier stills to diff against (ignored with --smoke)
  --smoke                First viewport only, no reference screens, no axe,
                         no filmstrips
  --video                Record a local video of each pathway context (not the
                         crop, filmstrip or reduced-motion contexts)
  --check                Validate the matrix and project config, then exit
  --help                 Print this message

Every browser context blocks writes: a GET passes, a matching fixture is answered
locally, a configured allowance passes, and everything else is aborted and listed.
Matrix and config fields: ../matrix.md (relative to this script).
Exit codes: 0 clean, 1 findings at 'should' or above or a shot not reached, 2 cannot run.`;

const PLAYWRIGHT_HELP =
  "ux-capture: cannot resolve 'playwright'. Install it in the project " +
  '(npm i -D playwright) or set PLAYWRIGHT_MODULE=/path/to/node_modules/playwright';

const CONTROL_SELECTOR = 'button, a[href], [role=button], input, select, textarea';
// Anything a person can click, type into, or focus: a stretched link must not cover it.
const INTERACTIVE_SELECTOR = `${CONTROL_SELECTOR}, summary, label, [contenteditable]:not([contenteditable=false]), ` +
  '[tabindex]:not([tabindex^="-"]), [role=link], [role=checkbox], [role=radio], [role=switch], [role=tab], ' +
  '[role=menuitem], [role=option], [role=slider], [role=textbox], [role=combobox]';
const DEFAULT_VIEWPORTS = [
  { name: 'sm', width: 375, height: 812, dpr: 2 },
  { name: 'md', width: 768, height: 1024, dpr: 1 },
  { name: 'lg', width: 1440, height: 900, dpr: 1 },
];
const WAIT_TIMEOUT = 15000;
// A target taller than the viewport is shot in a viewport grown to fit, up to this height.
const MAX_TARGET_HEIGHT = 8000;
// Pause between pointer-path positions, so hover timers see a moving pointer.
const POINTER_PAUSE = 20;
// A pixel counts as changed when a channel differs by more than this.
const DIFF_TOLERANCE = 8;
// Filmstrip frames, in ms after the action returns, plus the reduced-motion frame.
const MOTION_DELAYS = [0, 150, 400];
const DIFF_CROP_PADDING = 24;

function die(message, code) {
  console.error(message);
  process.exit(code);
}

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
  const opts = {
    matrix: null,
    out: null,
    projectRoot: process.cwd(),
    smoke: false,
    pathways: [],
    baseline: null,
    video: false,
    help: false,
    url: null,
    baseUrl: null,
    baseRef: null,
    shots: [],
    check: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) die(`ux-capture: ${arg} needs a value`, 2);
      return argv[i];
    };
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--out') opts.out = next();
    else if (arg === '--project-root') opts.projectRoot = next();
    else if (arg === '--smoke') opts.smoke = true;
    else if (arg === '--pathway') opts.pathways.push(next());
    else if (arg === '--baseline') opts.baseline = next();
    else if (arg === '--video') opts.video = true;
    else if (arg === '--url') opts.url = next();
    else if (arg === '--base-url') opts.baseUrl = next();
    else if (arg === '--base-ref') opts.baseRef = next();
    else if (arg === '--shot') opts.shots.push(next());
    else if (arg === '--check') opts.check = true;
    else if (arg.startsWith('-')) die(`ux-capture: unknown option ${arg}\n\n${USAGE}`, 2);
    else if (opts.matrix === null) opts.matrix = arg;
    else die(`ux-capture: unexpected argument ${arg}\n\n${USAGE}`, 2);
  }
  return opts;
}

// --------------------------------------------------------------- playwright

function moduleEntry(target) {
  let info;
  try {
    info = statSync(target);
  } catch {
    return null;
  }
  if (!info.isDirectory()) return target;
  let entry = 'index.js';
  try {
    const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'));
    const dot = pkg.exports && pkg.exports['.'];
    const fromExports = typeof dot === 'string' ? dot : dot && (dot.import || dot.default);
    entry = fromExports || pkg.main || 'index.js';
  } catch {
    /* fall back to index.js */
  }
  return join(target, entry);
}

async function resolvePlaywright(projectRoot) {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE) {
    const entry = moduleEntry(process.env.PLAYWRIGHT_MODULE);
    if (entry) candidates.push(entry);
  } else {
    try {
      const req = createRequire(join(projectRoot, 'package.json'));
      candidates.push(req.resolve('playwright'));
    } catch {
      /* nothing to add */
    }
  }
  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(candidate).href);
      const chromium = mod.chromium || (mod.default && mod.default.chromium);
      if (chromium) return chromium;
    } catch (err) {
      die(`ux-capture: failed to load playwright from ${candidate}: ${err.message}`, 2);
    }
  }
  return null;
}

// ------------------------------------------------------------------- matrix

const validName = (name) => typeof name === 'string' && /^[A-Za-z0-9_-]+$/.test(name);
const ACTIONS = ['click', 'hover', 'focus', 'scroll', 'fill', 'press', 'pointer'];

// Validates one step; `where` prefixes every message. Sign-in steps use the same shape.
function validateStep(step, where, require_) {
  require_(step && validName(step.name), `${where}: a step needs a valid name`);
  if (step.action !== undefined) {
    require_(ACTIONS.includes(step.action), `${where}: step ${step.name} has an invalid action`);
    require_(['press', 'pointer'].includes(step.action) || typeof step.selector === 'string' && step.selector.length > 0,
      `${where}: step ${step.name}: action without selector`);
    if (step.action === 'press') require_(typeof step.key === 'string' && step.key.length > 0, `${where}: step ${step.name} needs key`);
    if (step.action === 'fill') require_(typeof step.value === 'string', `${where}: step ${step.name} needs a string value`);
    if (step.action === 'pointer') {
      require_(Array.isArray(step.path) && step.path.length > 0, `${where}: step ${step.name} needs a pointer path`);
      for (const move of step.path) {
        const kinds = ['move', 'click', 'down', 'up'].filter(k => move && move[k] !== undefined);
        require_(kinds.length === 1, `${where}: step ${step.name}: each pointer path item is one of move, click, down, up`);
        require_(move.move === undefined || typeof move.move === 'string' && move.move.length > 0, `${where}: step ${step.name}: move needs a selector`);
        require_(move.click === undefined || typeof move.click === 'string' && move.click.length > 0, `${where}: step ${step.name}: click needs a selector`);
        require_(move.steps === undefined || Number.isInteger(move.steps) && move.steps > 0, `${where}: step ${step.name}: steps must be a positive integer`);
        require_(move.keepVisible === undefined || typeof move.keepVisible === 'string' && move.keepVisible.length > 0,
          `${where}: step ${step.name}: keepVisible must be a selector`);
      }
    }
  }
  for (const field of ['capture', 'motion', 'fullPage']) {
    require_(step[field] === undefined || typeof step[field] === 'boolean', `${where}: step ${step.name}: ${field} must be boolean`);
  }
  for (const field of ['selector', 'expectFocus', 'waitFor', 'target', 'expectText', 'note']) {
    require_(step[field] === undefined || typeof step[field] === 'string' && step[field].length > 0,
      `${where}: step ${step.name}: ${field} must be a nonempty string`);
  }
  require_(step.crops === undefined || Array.isArray(step.crops) && step.crops.every(s => typeof s === 'string' && s.length > 0),
    `${where}: step ${step.name}: crops must be selectors`);
}

// Fixture files resolve from the project root and must exist.
function validateFixture(fixture, where, projectRoot, require_) {
  require_(fixture && typeof fixture.url === 'string' && fixture.url.length > 0, `${where}: a fixture needs a url pattern`);
  require_(fixture.method === undefined || typeof fixture.method === 'string' && /^[A-Za-z]+$/.test(fixture.method),
    `${where}: fixture ${fixture.url}: method must be a word such as POST`);
  if (fixture.method) fixture.method = fixture.method.toUpperCase();
  require_(fixture.status === undefined || Number.isInteger(fixture.status) && fixture.status >= 100 && fixture.status < 600,
    `${where}: fixture ${fixture.url}: status must be an HTTP status`);
  require_((fixture.json !== undefined) !== (fixture.file !== undefined), `${where}: fixture ${fixture.url} needs exactly one of json or file`);
  if (fixture.file !== undefined) {
    require_(typeof fixture.file === 'string', `${where}: fixture ${fixture.url}: file must be a path`);
    fixture.file = resolve(projectRoot, fixture.file);
    require_(existsSync(fixture.file), `${where}: fixture file not found: ${fixture.file}`);
  }
}

function loadMatrix(path, projectRoot) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    die(`ux-capture: cannot read matrix ${path}: ${err.message}`, 2);
  }
  let matrix;
  try {
    matrix = JSON.parse(raw);
  } catch (err) {
    die(`ux-capture: matrix ${path} is not valid JSON: ${err.message}`, 2);
  }
  const require_ = (condition, message) => {
    if (!condition) die(`ux-capture: invalid matrix: ${message}`, 2);
  };
  require_(matrix && typeof matrix === 'object' && !Array.isArray(matrix), 'expected an object');
  if (!Array.isArray(matrix.pathways) || matrix.pathways.length === 0) {
    die(`ux-capture: matrix ${path} has no pathways`, 2);
  }
  matrix.themes = matrix.themes || ['light', 'dark'];
  matrix.viewports = matrix.viewports || DEFAULT_VIEWPORTS;
  matrix.theme = matrix.theme || { mode: 'media', target: 'html', key: 'theme', values: {} };
  matrix.fonts = matrix.fonts || [];
  matrix.allowOverflow = matrix.allowOverflow || [];
  matrix.allowOverlap = matrix.allowOverlap || [];
  matrix.allowLight = matrix.allowLight || [];
  matrix.referenceScreens = matrix.referenceScreens || [];
  matrix.criteria = matrix.criteria || [];
  matrix.fixtures = matrix.fixtures || [];
  matrix.setup = matrix.setup || [];
  for (const field of ['themes', 'viewports']) {
    require_(Array.isArray(matrix[field]) && matrix[field].length > 0, `${field} must not be empty`);
  }
  for (const field of ['fonts', 'allowOverflow', 'allowOverlap', 'allowLight', 'referenceScreens', 'criteria']) {
    require_(Array.isArray(matrix[field]) && matrix[field].every(s => typeof s === 'string' && s.length > 0),
      `${field} must be an array of nonempty strings`);
  }
  require_(matrix.baseUrl === undefined || typeof matrix.baseUrl === 'string' && /^https?:\/\//.test(matrix.baseUrl), 'baseUrl must be an http(s) URL');
  require_(matrix.designReference === undefined || typeof matrix.designReference === 'string', 'designReference must be a path');
  require_(matrix.themes.every(validName), 'invalid theme name');
  for (const viewport of matrix.viewports) {
    require_(viewport && Number.isInteger(viewport.width) && viewport.width > 0 &&
      Number.isInteger(viewport.height) && viewport.height > 0 &&
      (viewport.dpr === undefined || Number.isFinite(viewport.dpr) && viewport.dpr > 0),
    'viewports need positive integer width/height and a positive dpr');
  }
  require_(Array.isArray(matrix.fixtures), 'fixtures must be a list');
  for (const fixture of matrix.fixtures) validateFixture(fixture, 'matrix', projectRoot, require_);
  require_(Array.isArray(matrix.setup), 'setup must be a list');
  const setupNames = new Set();
  for (const call of matrix.setup) {
    require_(call && validName(call.name) && !setupNames.has(call.name), 'setup calls need valid, unique names');
    setupNames.add(call.name);
    require_(typeof call.method === 'string' && /^[A-Z]+$/.test(call.method), `setup ${call.name} needs an upper-case method`);
    require_(typeof call.url === 'string' && call.url.startsWith('/'), `setup ${call.name}: url must be a path; it resolves against apiBase or the app URL`);
    require_(call.headers === undefined || call.headers && typeof call.headers === 'object' && !Array.isArray(call.headers),
      `setup ${call.name}: headers must be an object`);
  }
  const names = new Set();
  const tags = new Set();
  for (const pathway of matrix.pathways) {
    require_(pathway && validName(pathway.name) && !names.has(pathway.name), 'pathway names must be valid and unique');
    names.add(pathway.name);
    require_(typeof pathway.path === 'string' && pathway.path.startsWith('/'), `pathway ${pathway.name} needs a route path`);
    require_(Array.isArray(pathway.steps) && pathway.steps.length > 0, `pathway ${pathway.name} needs nonempty steps`);
    require_(pathway.signIn === false || signInParamsValid(pathway.signIn),
      `pathway ${pathway.name}: signIn must be false or map dev-login parameters to strings`);
    pathway.fixtures = pathway.fixtures || [];
    require_(Array.isArray(pathway.fixtures), `pathway ${pathway.name}: fixtures must be a list`);
    for (const fixture of pathway.fixtures) validateFixture(fixture, `pathway ${pathway.name}`, projectRoot, require_);
    const stepNames = new Set();
    for (const step of pathway.steps) {
      validateStep(step, `pathway ${pathway.name}`, require_);
      require_(!stepNames.has(step.name), `duplicate step ${step.name} in ${pathway.name}`);
      stepNames.add(step.name);
      require_(step.capture === false || typeof step.target === 'string',
        `step ${step.name} in ${pathway.name} needs a target: a selector for the component the shot shows`);
      step.state = step.state || 'default';
      require_(validName(step.state), `step ${step.name} has an invalid state label`);
      for (const viewport of matrix.viewports) {
        for (const theme of matrix.themes) {
          const tag = `${pathway.name}-${step.name}-${step.state}-${viewport.width}-${theme}`;
          require_(!tags.has(tag), `duplicate output tag ${tag}`);
          tags.add(tag);
        }
      }
    }
  }
  return matrix;
}

// -------------------------------------------------- init scripts (in-page)

const themeInit = (cfg) => {
  if (cfg.mode === 'localStorage') {
    try {
      window.localStorage.setItem(cfg.key || 'theme', cfg.value);
    } catch {
      /* storage may be blocked */
    }
    return;
  }
  if (cfg.mode !== 'class' && cfg.mode !== 'attribute') return;
  const apply = () => {
    const target =
      cfg.target === 'html' || cfg.target === ':root' || !cfg.target
        ? document.documentElement
        : document.querySelector(cfg.target);
    if (!target) return false;
    if (cfg.mode === 'class') {
      if (cfg.value) target.classList.add(cfg.value);
    } else {
      target.setAttribute('data-theme', cfg.value);
    }
    return true;
  };
  if (apply()) return;
  const observer = new MutationObserver(() => {
    if (apply()) observer.disconnect();
  });
  observer.observe(document, { childList: true, subtree: true });
};

const clsInit = () => {
  // A per-document token. The init script re-runs on every document, so a changed
  // token means window.__uxCls restarted; a same-document navigation keeps both.
  window.__uxDocId = String(Math.random());
  window.__uxCls = 0;
  window.__uxClsSources = [];
  const selectorOf = (el) => {
    if (!el || el.nodeType !== 1) return null;
    let out = el.tagName;
    if (el.id) out += '#' + el.id;
    const classes = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);
    for (const cls of classes) out += '.' + cls;
    return out;
  };
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        window.__uxCls += entry.value;
        for (const source of entry.sources || []) {
          const selector = selectorOf(source.node);
          if (selector) window.__uxClsSources.push(selector);
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    /* layout-shift unsupported */
  }
};

// ------------------------------------------------- mechanical checks (page)

const inPageChecks = (opts) => {
  const checks = [];
  const suppressed = [];
  const controlSelector = opts.controlSelector;

  const selectorOf = (el) => {
    if (!el || el.nodeType !== 1) return null;
    let out = el.tagName;
    if (el.id) out += '#' + el.id;
    const classes = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);
    for (const cls of classes) out += '.' + cls;
    return out;
  };
  const textOf = (el) => ((el && el.textContent) || '').trim().slice(0, 40);
  const add = (check, severity, el, extra) => {
    checks.push(
      Object.assign(
        {
          check,
          severity,
          selector: el ? selectorOf(el) : null,
          text: el ? textOf(el) : null,
        },
        extra || {},
      ),
    );
  };
  const matchesList = (el, list) => {
    if (!list || !list.length) return false;
    for (const selector of list) {
      try {
        if (el.closest(selector)) return true;
      } catch {
        /* invalid selector in the matrix */
      }
    }
    return false;
  };
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) return false;
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  };
  const isLeaf = (el) => el.children.length === 0;
  // Visually hidden for screen readers at this width, judged by computed style only.
  const screenReaderOnly = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 1 || rect.height > 1) return false;
    const style = getComputedStyle(el);
    return style.overflow === 'hidden' && (style.clip !== 'auto' || style.clipPath !== 'none');
  };

  const skipTags = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'NOSCRIPT', 'HEAD', 'BR']);
  const all = [document.documentElement, document.body].concat(
    Array.from(document.body.querySelectorAll('*')),
  );
  const elements = all.filter((el) => el && !skipTags.has(el.tagName));
  const visibleEls = elements.filter(visible);
  const leaves = visibleEls.filter((el) => isLeaf(el) && !screenReaderOnly(el));

  const docEl = document.documentElement;

  // page-overflow (blocker)
  if (docEl.scrollWidth > docEl.clientWidth + 1) {
    add('page-overflow', 'blocker', null, {
      by: Math.round(docEl.scrollWidth - docEl.clientWidth),
    });
  }

  // element-overflow (should)
  // Per axis, the nearest ancestor that does not overflow visibly decides: a
  // scroll container (auto/scroll) can bring the element into view, so it is not
  // a defect; only hidden/clip cuts content off.
  const overflowAncestor = (el, axis) => {
    let parent = el.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      const value = axis === 'x' ? style.overflowX : style.overflowY;
      if (value !== 'visible') return { el: parent, value };
      parent = parent.parentElement;
    }
    return null;
  };
  const clips = (found) => found.value === 'hidden' || found.value === 'clip';
  for (const el of leaves) {
    if (matchesList(el, opts.allowOverflow)) continue;
    const rect = el.getBoundingClientRect();
    let by = 0;
    const x = overflowAncestor(el, 'x');
    if (!x) {
      if (rect.right - docEl.clientWidth > 1) by = Math.max(by, rect.right - docEl.clientWidth);
    } else if (clips(x)) {
      const limit = x.el.getBoundingClientRect().right;
      if (rect.right - limit > 1) by = Math.max(by, rect.right - limit);
    }
    // With no clipping ancestor the bottom is never compared: normal pages scroll.
    const y = overflowAncestor(el, 'y');
    if (y && clips(y)) {
      const limit = y.el.getBoundingClientRect().bottom;
      if (rect.bottom - limit > 1) by = Math.max(by, rect.bottom - limit);
    }
    if (by > 1) add('element-overflow', 'should', el, { by: Math.round(by) });
  }

  // clipped-text (should)
  for (const el of leaves) {
    if (!textOf(el)) continue;
    const style = getComputedStyle(el);
    if (style.overflowX === 'visible') continue;
    if (style.textOverflow === 'ellipsis') continue;
    if (el.scrollWidth > el.clientWidth + 1) {
      add('clipped-text', 'should', el, { by: Math.round(el.scrollWidth - el.clientWidth) });
    }
  }

  // overlap (should)
  // Different overlay layers can cover each other intentionally. Within a layer,
  // ordinary siblings must still be checked, including inside fixed app shells.
  const positionedLayer = (el) => {
    let node = el;
    while (node && node.nodeType === 1) {
      const position = getComputedStyle(node).position;
      if (position === 'absolute' || position === 'fixed' || position === 'sticky') return node;
      node = node.parentElement;
    }
    return null;
  };
  const overlapEligible = leaves.filter((el) => {
    if (getComputedStyle(el).display === 'inline') return false;
    return !matchesList(el, opts.allowOverlap);
  });
  const overlapTruncated = overlapEligible.length > 1500;
  // Rects are read once: a getBoundingClientRect() inside the pair loop is O(n²) layout.
  const overlapCandidates = overlapEligible
    .slice(0, 1500)
    .map((el) => ({ el, rect: el.getBoundingClientRect(), layer: positionedLayer(el) }));
  // A link or button stretched over a non-interactive element is a deliberate
  // click target, not a collision.
  const stretchedOver = (cover, covered) => {
    const link = cover.el.closest('a[href], button');
    if (!link || covered.el.closest(opts.interactiveSelector)) return false;
    const box = link.getBoundingClientRect();
    return box.left <= covered.rect.left && box.top <= covered.rect.top &&
      box.right >= covered.rect.right && box.bottom >= covered.rect.bottom;
  };
  for (let i = 0; i < overlapCandidates.length; i += 1) {
    for (let j = i + 1; j < overlapCandidates.length; j += 1) {
      const a = overlapCandidates[i];
      const b = overlapCandidates[j];
      if (a.layer !== b.layer) continue;
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const dx = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
      const dy = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
      if (dx > 4 && dy > 4) {
        if (stretchedOver(a, b) || stretchedOver(b, a)) {
          suppressed.push({
            check: 'overlap',
            selector: selectorOf(a.el),
            with: selectorOf(b.el),
            reason: 'covered by a stretched link or button',
          });
          continue;
        }
        add('overlap', 'should', a.el, {
          with: selectorOf(b.el),
          by: [Math.round(dx), Math.round(dy)],
        });
      }
    }
  }

  // unclickable (blocker) and tap-target (nit)
  const controls = Array.from(document.querySelectorAll(controlSelector)).filter(visible);
  // A modal owns the page while it is open: a backdrop over everything else is
  // the design, not a defect. Only a rendered modal counts — a closed
  // <dialog aria-modal="true"> matches the selector but owns nothing.
  const modal = Array.from(document.querySelectorAll('[aria-modal="true"], dialog[open]')).find(visible) || null;
  const unreachableByDesign = (el) => {
    if (el.closest('[aria-hidden="true"], [inert]')) return true;
    const style = getComputedStyle(el);
    if (style.pointerEvents === 'none' || parseFloat(style.opacity) === 0) return true;
    const rect = el.getBoundingClientRect();
    // A visually-hidden input keeps a 1×1 rect so it stays focusable.
    if (rect.width <= 1 && rect.height <= 1) return true;
    return Boolean(modal) && !modal.contains(el);
  };
  for (const el of controls) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const inViewport = cx >= 0 && cy >= 0 && cx < docEl.clientWidth && cy < docEl.clientHeight;
    if (inViewport && !unreachableByDesign(el)) {
      const hit = document.elementFromPoint(cx, cy);
      const reachable = hit && (hit === el || el.contains(hit) || hit.contains(el));
      if (!reachable) add('unclickable', 'blocker', el, { blockedBy: selectorOf(hit) });
    }
    if (opts.viewportWidth < 500 && (rect.width < 44 || rect.height < 44)) {
      add('tap-target', 'nit', el, { size: [Math.round(rect.width), Math.round(rect.height)] });
    }
  }

  // broken-image (should)
  for (const img of Array.from(document.images)) {
    if (img.complete && img.naturalWidth === 0) add('broken-image', 'should', img, { src: img.src });
  }

  // theme-leak (should)
  const luminance = (r, g, b) => {
    const channel = (v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  if (opts.theme === 'dark') {
    for (const el of visibleEls) {
      const rect = el.getBoundingClientRect();
      if (rect.width * rect.height <= 2000) continue;
      const match = getComputedStyle(el).backgroundColor.match(
        /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?/,
      );
      if (!match) continue;
      const alpha = match[4] === undefined ? 1 : parseFloat(match[4]);
      if (alpha < 0.99) continue;
      if (luminance(+match[1], +match[2], +match[3]) <= 0.9) continue;
      if (matchesList(el, opts.allowLight)) continue;
      add('theme-leak', 'should', el, { background: getComputedStyle(el).backgroundColor });
    }
  }

  // font-fallback (should)
  const fontsStatus = document.fonts ? document.fonts.status : 'loaded';
  const fontProblem = fontsStatus !== 'loaded';
  const normalizedFamily = (family) => family.trim().replace(/^(['"])(.*)\1$/, '$2').toLowerCase();
  const loadedFamilies = new Set(Array.from(document.fonts || [])
    .filter(face => face.status === 'loaded')
    .map(face => normalizedFamily(face.family)));
  const missingFamilies = [];
  for (const family of opts.fonts || []) {
    try {
      if (!loadedFamilies.has(normalizedFamily(family)) ||
          !document.fonts.check('16px "' + family + '"')) missingFamilies.push(family);
    } catch {
      missingFamilies.push(family);
    }
  }
  if (fontProblem || missingFamilies.length) {
    add('font-fallback', 'should', null, {
      message: 'document.fonts.status=' + fontsStatus,
      missingFamilies,
    });
  }

  return {
    checks,
    suppressed,
    overlapTruncated,
    docId: window.__uxDocId || null,
    cls: window.__uxCls || 0,
    clsSources: (window.__uxClsSources || []).slice(),
    fonts: fontsStatus,
  };
};

// ------------------------------------------------- pixel diff (in the browser)

// Both images arrive as data: URLs; file:// is blocked from a blank page.
const inPageDiff = async (opts) => {
  const load = (src) =>
    new Promise((done, failed) => {
      const img = new Image();
      img.onload = () => done(img);
      img.onerror = () => failed(new Error('image failed to decode'));
      img.src = src;
    });
  const head = await load(opts.headUrl);
  const base = await load(opts.baseUrl);
  const w = Math.max(head.naturalWidth, base.naturalWidth);
  const h = Math.max(head.naturalHeight, base.naturalHeight);
  const pixels = (img) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, w, h).data;
  };
  const a = pixels(head);
  const b = pixels(base);
  const tolerance = opts.tolerance;
  const over = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) {
    const p = i * 4;
    if (
      Math.abs(a[p] - b[p]) > tolerance ||
      Math.abs(a[p + 1] - b[p + 1]) > tolerance ||
      Math.abs(a[p + 2] - b[p + 2]) > tolerance ||
      Math.abs(a[p + 3] - b[p + 3]) > tolerance
    ) {
      over[i] = 1;
    }
  }
  let count = 0;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      if (!over[i]) continue;
      // Antialias guard: a lone over-tolerance pixel is edge noise.
      const neighbour =
        (x > 0 && over[i - 1]) ||
        (x < w - 1 && over[i + 1]) ||
        (y > 0 && over[i - w]) ||
        (y < h - 1 && over[i + w]);
      if (!neighbour) continue;
      count += 1;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  return {
    ratio: count / (w * h),
    box: x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1],
    sameSize: head.naturalWidth === base.naturalWidth && head.naturalHeight === base.naturalHeight,
    headWidth: head.naturalWidth,
    headHeight: head.naturalHeight,
  };
};

// Frames onto one canvas at half scale, each labelled underneath.
const inPageStitch = async (opts) => {
  const load = (src) =>
    new Promise((done, failed) => {
      const img = new Image();
      img.onload = () => done(img);
      img.onerror = () => failed(new Error('frame failed to decode'));
      img.src = src;
    });
  const images = [];
  for (const src of opts.frames) images.push(await load(src));
  const gap = 8;
  const pad = 8;
  const labelHeight = 20;
  const widths = images.map((img) => Math.round(img.naturalWidth / 2));
  const heights = images.map((img) => Math.round(img.naturalHeight / 2));
  const canvas = document.getElementById('strip');
  canvas.width = pad * 2 + widths.reduce((sum, n) => sum + n, 0) + gap * (images.length - 1);
  canvas.height = pad * 2 + Math.max(...heights) + labelHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let x = pad;
  for (let i = 0; i < images.length; i += 1) {
    ctx.drawImage(images[i], x, pad, widths[i], heights[i]);
    ctx.fillStyle = '#111111';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(opts.labels[i], x, pad + Math.max(...heights) + 4);
    x += widths[i] + gap;
  }
  return { width: canvas.width, height: canvas.height };
};

// ------------------------------------------------------------------ helpers

function themeConfig(matrix, theme) {
  const cfg = matrix.theme || {};
  const values = cfg.values || {};
  return {
    mode: cfg.mode || 'media',
    target: cfg.target || 'html',
    key: cfg.key || 'theme',
    value: values[theme] === undefined ? theme : values[theme],
  };
}

function severityRank(severity) {
  if (severity === 'blocker') return 2;
  if (severity === 'should') return 1;
  return 0;
}

// The last pointer position per page; Playwright does not expose it.
const pointerAt = new WeakMap();

async function centerOf(page, selector) {
  const all = page.locator(selector);
  const count = await all.count();
  for (let i = 0; i < count; i += 1) {
    const box = await all.nth(i).boundingBox();
    if (box && box.width > 0 && box.height > 0) return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  throw new Error(`pointer: ${selector} has no visible box`);
}

// Moves like a hand: small steps with pauses, checking keepVisible at every position.
async function pointerPath(page, step) {
  for (const item of step.path) {
    if (item.move) {
      const to = await centerOf(page, item.move);
      const from = pointerAt.get(page);
      const count = from ? item.steps || 10 : 1;
      for (let i = 1; i <= count; i += 1) {
        const at = from
          ? { x: from.x + (to.x - from.x) * i / count, y: from.y + (to.y - from.y) * i / count }
          : to;
        await page.mouse.move(at.x, at.y);
        pointerAt.set(page, at);
        await page.waitForTimeout(POINTER_PAUSE);
        if (item.keepVisible && !(await page.locator(item.keepVisible).first().isVisible())) {
          throw new Error(`pointer: ${item.keepVisible} disappeared at position ${i} of ${count} on the way to ${item.move}`);
        }
      }
    } else if (item.click) {
      const at = pointerAt.get(page);
      if (!at) throw new Error('pointer: click before any move');
      const under = await page.locator(item.click).first().evaluate((el, p) => {
        const hit = document.elementFromPoint(p.x, p.y);
        if (hit && (el === hit || el.contains(hit))) return null;
        return hit ? hit.tagName + (hit.id ? `#${hit.id}` : '') : 'nothing';
      }, at);
      if (under) throw new Error(`pointer: ${item.click} is not under the pointer; ${under} is`);
      await page.mouse.down();
      await page.mouse.up();
    } else if (item.down) await page.mouse.down();
    else if (item.up) await page.mouse.up();
  }
}

// A fill a hydrating form resets is filled again, up to five times.
async function stableFill(locator, step) {
  for (let attempt = 1; ; attempt += 1) {
    await locator.fill(step.value, { timeout: WAIT_TIMEOUT });
    await locator.page().waitForTimeout(250);
    if (await locator.inputValue() === step.value) return;
    if (attempt === 5) throw new Error(`step ${step.name}: the page kept resetting ${step.selector}`);
  }
}

async function performAction(page, step) {
  const locator = step.selector ? page.locator(step.selector).first() : null;
  if (step.action === 'click') await locator.click({ timeout: WAIT_TIMEOUT });
  else if (step.action === 'hover') await locator.hover({ timeout: WAIT_TIMEOUT });
  else if (step.action === 'focus') await locator.focus({ timeout: WAIT_TIMEOUT });
  else if (step.action === 'fill') await stableFill(locator, step);
  else if (step.action === 'pointer') await pointerPath(page, step);
  else if (step.action === 'press') {
    if (locator) await locator.press(step.key, { timeout: WAIT_TIMEOUT });
    else await page.keyboard.press(step.key);
  } else if (step.action === 'scroll') {
    await locator.scrollIntoViewIfNeeded({ timeout: WAIT_TIMEOUT });
    await locator.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  }
  if (step.expectFocus) {
    const focused = await page.evaluate(selector => document.activeElement?.matches(selector), step.expectFocus);
    if (!focused) throw new Error(`step ${step.name}: expected focus on ${step.expectFocus}`);
  }
}

// Buffers the per-step console and network findings for one page. Requests the
// guard aborted or a fixture answered are expected, so they are not findings;
// aborted writes are kept to explain a shot that is not reached.
function attachListeners(page, handledUrls) {
  const state = { consoleErrors: [], failedRequests: [], aborted: [] };
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (message.text().startsWith('Failed to load resource') && handledUrls.has(message.location().url)) return;
    state.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => {
    state.consoleErrors.push(`Uncaught ${error.stack || error.message}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !handledUrls.has(response.url())) {
      state.failedRequests.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (handledUrls.has(request.url())) state.aborted.push(`${request.method()} ${new URL(request.url()).pathname}`);
    else state.failedRequests.push(`failed ${request.url()}`);
  });
  return state;
}

// ------------------------------------------------------------ guard and targets

// Capture-only CSS, kept attached if the app re-renders the document head.
const cssInit = (css) => {
  const style = document.createElement('style');
  style.setAttribute('data-ux-capture', '');
  style.textContent = css;
  const attach = () => {
    if (!style.isConnected && document.documentElement) document.documentElement.appendChild(style);
  };
  attach();
  new MutationObserver(attach).observe(document, { childList: true, subtree: true });
};

// Sends an allowed write and follows its redirects that stay writes, because the
// browser follows a redirect without routing it again. Such a hop must stay on the
// same origin and be allowed or answered by a fixture. A hop that becomes a GET goes
// back to the browser with an absolute location: the browser follows GETs itself,
// stripping credentials as it should, and every later hop is a GET too.
// Returns {response, location} or {fixture}; throws when a hop is aborted.
async function guardedRedirects(route, first, guard) {
  let { method, url } = first;
  let response = await route.fetch({ maxRedirects: 0 });
  for (let hop = 0; hop < 10; hop += 1) {
    const status = response.status();
    const location = response.headers().location;
    if (status < 300 || status >= 400 || !location) return { response };
    const from = url;
    url = new URL(location, from).href;
    if (status === 303 || ([301, 302].includes(status) && method === 'POST')) method = 'GET';
    if (method === 'GET') return { response, location: url };
    const next = new URL(url).origin === new URL(from).origin ? guardDecision({ method, url }, guard) : { kind: 'aborted' };
    guard.log(next, { method, url });
    if (next.kind === 'fixture') return { fixture: next.fixture };
    if (next.kind !== 'allowed') {
      guard.log({ kind: 'aborted-redirect' }, first);
      throw new Error(`redirect to ${method} ${url} blocked`);
    }
    response = await route.fetch({ url, method, maxRedirects: 0 });
  }
  throw new Error(`too many redirects from ${first.method} ${first.url}`);
}

async function fulfillFixture(route, fixture) {
  const origin = await route.request().headerValue('origin');
  const headers = origin ? { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' } : {};
  const status = fixture.status || 200;
  if (fixture.file) return route.fulfill({ status, path: fixture.file, headers });
  return route.fulfill({ status, json: fixture.json, headers });
}

// The only place a browser context is created, so none runs without the guard.
// guard: {fixtures, allow, css, log(decision, {method, url})}.
async function guardedContext(browser, options, guard) {
  const context = await browser.newContext({ ...options, serviceWorkers: 'block' });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const seen = { method: request.method(), url: request.url() };
    const decision = guardDecision(seen, guard);
    if (decision.kind === 'pass') return route.continue();
    guard.log(decision, seen);
    if (decision.kind === 'allowed') {
      let result;
      try {
        result = await guardedRedirects(route, seen, guard);
      } catch {
        return route.abort('blockedbyclient');
      }
      if (result.fixture) return fulfillFixture(route, result.fixture);
      const headers = result.location ? { ...result.response.headers(), location: result.location } : undefined;
      return route.fulfill({ response: result.response, headers });
    }
    if (decision.kind === 'aborted') return route.abort('blockedbyclient');
    return fulfillFixture(route, decision.fixture);
  });
  await context.routeWebSocket(/.*/, (ws) => {
    const seen = { method: 'WEBSOCKET', url: ws.url() };
    const decision = guardDecision(seen, guard);
    guard.log(decision, seen);
    if (decision.kind === 'allowed') ws.connectToServer();
    else ws.close({ code: 1008, reason: 'blocked by ux-capture' });
  });
  if (guard.css) await context.addInitScript(cssInit, guard.css);
  return context;
}

// The target's box and the part of it not clipped by scroll containers or the viewport.
const targetGeometry = (el) => {
  const r = el.getBoundingClientRect();
  const v = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  for (let p = el.parentElement; p; p = p.parentElement) {
    const style = getComputedStyle(p);
    const pr = p.getBoundingClientRect();
    if (style.overflowX !== 'visible') {
      v.left = Math.max(v.left, pr.left);
      v.right = Math.min(v.right, pr.right);
    }
    if (style.overflowY !== 'visible') {
      v.top = Math.max(v.top, pr.top);
      v.bottom = Math.min(v.bottom, pr.bottom);
    }
  }
  v.left = Math.max(v.left, 0);
  v.top = Math.max(v.top, 0);
  v.right = Math.min(v.right, window.innerWidth);
  v.bottom = Math.min(v.bottom, window.innerHeight);
  return {
    box: { x: r.left, y: r.top, width: r.width, height: r.height },
    visible: { x: v.left, y: v.top, width: Math.max(0, v.right - v.left), height: Math.max(0, v.bottom - v.top) },
    viewportHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
};

// What visibly covers the target at every one of nine sample points, or null. Hit
// testing briefly includes pointer-events: none layers, which still paint; a layer
// that paints nothing at a point, such as an empty toast container, does not cover it.
const coveringElement = (el, rect) => {
  const paints = (node) => {
    for (let n = node; n && n.nodeType === 1; n = n.parentElement) {
      if (parseFloat(getComputedStyle(n).opacity) < 0.05) return false;
    }
    const style = getComputedStyle(node);
    if (style.visibility !== 'visible') return false;
    if (['IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'svg'].includes(node.tagName)) return true;
    // A ::before or ::after hit-tests as its host, so a painted one counts for the host.
    return [style, getComputedStyle(node, '::before'), getComputedStyle(node, '::after')].some((s, i) => {
      if (i > 0 && (s.content === 'none' || s.content === 'normal')) return false;
      const channels = s.backgroundColor.match(/[\d.]+/g);
      const alpha = channels ? (channels.length > 3 ? parseFloat(channels[3]) : 1) : 0;
      return alpha > 0.05 || s.backgroundImage !== 'none';
    });
  };
  const force = document.createElement('style');
  force.textContent = '*{pointer-events:auto !important}';
  document.documentElement.appendChild(force);
  try {
    let cover = null;
    for (const fx of [0.1, 0.5, 0.9]) {
      for (const fy of [0.1, 0.5, 0.9]) {
        const above = [];
        for (const hit of document.elementsFromPoint(rect.x + rect.width * fx, rect.y + rect.height * fy)) {
          if (el.contains(hit) || hit.contains(el)) break;
          above.push(hit);
        }
        const top = above.find(paints);
        if (!top) return null;
        cover = top.tagName + (top.id ? `#${top.id}` : '');
      }
    }
    return cover;
  } finally {
    force.remove();
  }
};

const wholeInView = (g) => g.visible.width >= g.box.width - 1 && g.visible.height >= g.box.height - 1;

const scrollToTarget = (el) => {
  el.scrollIntoView({ block: el.getBoundingClientRect().height <= window.innerHeight ? 'center' : 'start', inline: 'nearest' });
};

// The first visible, sized match of step.target (containing step.expectText when set),
// waiting up to WAIT_TIMEOUT. Throws the reason the shot was not reached.
async function locateTarget(page, step) {
  const deadline = Date.now() + WAIT_TIMEOUT;
  for (;;) {
    const all = page.locator(step.target);
    const count = await all.count();
    let sized = 0;
    for (let i = 0; i < count; i += 1) {
      const candidate = all.nth(i);
      const box = await candidate.boundingBox().catch(() => null);
      if (!box || box.width < 1 || box.height < 1 || !(await candidate.isVisible().catch(() => false))) continue;
      sized += 1;
      if (step.expectText && !(await candidate.innerText().catch(() => '')).includes(step.expectText)) continue;
      return { locator: candidate, matched: count };
    }
    if (Date.now() >= deadline) {
      if (count === 0) throw new Error(`target ${step.target} matched nothing`);
      if (sized === 0) throw new Error(`target ${step.target} matched ${count} element(s), none visible with a size`);
      throw new Error(`no visible match of ${step.target} contains "${step.expectText}" (${sized} visible)`);
    }
    await page.waitForTimeout(250);
  }
}

// Scrolls the target into view, nested scroll containers included, unless it already is.
async function revealTarget(page, locator) {
  if (wholeInView(await locator.evaluate(targetGeometry))) return;
  await locator.evaluate(scrollToTarget);
  await settle(page);
}

// Crops to the target. One taller than the viewport is shot in a viewport grown to fit.
async function shootTarget(page, locator, file, viewport) {
  let geometry = await locator.evaluate(targetGeometry);
  let grown = false;
  if (!wholeInView(geometry) && geometry.box.height > geometry.viewportHeight - 1) {
    await page.setViewportSize({ width: viewport.width, height: Math.min(Math.ceil(geometry.box.height) + 2, MAX_TARGET_HEIGHT) });
    grown = true;
    await locator.evaluate(scrollToTarget);
    await settle(page);
    geometry = await locator.evaluate(targetGeometry);
  }
  try {
    if (geometry.visible.width < 1 || geometry.visible.height < 1) throw new Error('target is clipped out of view');
    const cover = await locator.evaluate(coveringElement, geometry.visible);
    if (cover) throw new Error(`target is covered by ${cover}`);
    await page.screenshot({ path: file, clip: geometry.visible, animations: 'disabled', caret: 'hide' });
  } finally {
    if (grown) await page.setViewportSize({ width: viewport.width, height: viewport.height });
  }
  return {
    box: geometry.box,
    clipped: !wholeInView(geometry),
    grown,
    measurements: { scrollWidth: geometry.scrollWidth, clientWidth: geometry.clientWidth },
  };
}

function documentCheck(check, severity, message) {
  return { check, severity, selector: null, text: null, message };
}

// One capture entry, in the mechanical.json field order.
function makeEntry(o) {
  const entry = {
    tag: o.tag,
    pathway: o.pathway,
    step: o.step,
    state: o.state,
    width: o.width,
    theme: o.theme,
    dpr: o.dpr,
    files: {
      still: o.still,
      target: o.targetFile || null,
      crops: o.crops || [],
      filmstrip: o.filmstrip || null,
      diffCrop: o.diffCrop || null,
    },
    diff: o.diff || null,
    target: o.target || null,
    targetDiff: o.targetDiff || null,
    measurements: o.measurements || null,
    checks: o.checks,
    cls: Number((o.cls || 0).toFixed(4)),
    clsSources: o.clsSources || [],
    console: o.consoleErrors || [],
    failedRequests: o.failedRequests || [],
    fonts: o.fonts,
    axe: o.axe,
  };
  if (o.error) entry.error = o.error;
  // Only recorded when a finding was deliberately suppressed.
  if (o.suppressed && o.suppressed.length) entry.suppressed = o.suppressed;
  // Only recorded when the overlap candidate cap actually applied.
  if (o.overlapTruncated) entry.overlapTruncated = true;
  return entry;
}

// @axe-core/playwright resolves from the project root or not at all.
function axeBuilderOf(mod) {
  const found = mod && (mod.AxeBuilder || (mod.default && mod.default.AxeBuilder) || mod.default);
  return typeof found === 'function' ? found : null;
}

async function loadAxe(projectRoot) {
  let require_;
  let entry;
  try {
    require_ = createRequire(join(projectRoot, 'package.json'));
    entry = require_.resolve('@axe-core/playwright');
  } catch {
    return null;
  }
  // The package resolves to its CJS build, whose exports object is not itself the
  // constructor under Node's interop; require() it and read AxeBuilder off it.
  try {
    const builder = axeBuilderOf(require_('@axe-core/playwright'));
    if (builder) return builder;
  } catch {
    /* an ESM-only build cannot be require()d */
  }
  const builder = axeBuilderOf(await import(pathToFileURL(entry).href));
  if (!builder) throw new Error(`ux-capture: resolved axe module has no AxeBuilder: ${entry}`);
  return builder;
}

// 'unavailable' is reserved for a module that does not resolve; a failing scan
// is 'error', with the reason on stderr.
async function runAxe(AxeBuilder, page, tag) {
  if (!AxeBuilder) return 'unavailable';
  try {
    const results = await new AxeBuilder({ page }).analyze();
    return results.violations || [];
  } catch (err) {
    console.error(`ux-capture: axe scan for ${tag} failed: ${err.message}`);
    return 'error';
  }
}

// One checks[] entry per violation; the raw array stays in the entry's axe field.
function axeChecks(violations) {
  if (violations === 'error') return [documentCheck('axe-error', 'blocker', 'Installed axe scanner failed; see stderr')];
  if (!Array.isArray(violations)) return [];
  return violations.map((violation) => {
    const nodes = violation.nodes || [];
    const target = (nodes[0] && nodes[0].target) || [];
    const first = Array.isArray(target[0]) ? target[0][0] : target[0];
    return {
      check: `axe:${violation.id}`,
      severity:
        violation.impact === 'critical' || violation.impact === 'serious' ? 'should' : 'nit',
      selector: first === undefined ? null : first,
      text: violation.help || null,
      impact: violation.impact || null,
      nodes: nodes.length,
    };
  });
}

async function settle(page) {
  await page
    .evaluate(
      () =>
        new Promise((done) => {
          requestAnimationFrame(() => requestAnimationFrame(() => done(null)));
        }),
    )
    .catch(() => {});
}

async function waitForFonts(page) {
  await page
    .evaluate(
      () =>
        new Promise((done) => {
          if (!document.fonts) {
            done(null);
            return;
          }
          const timer = setTimeout(() => done(null), 3000);
          document.fonts.ready.then(() => {
            clearTimeout(timer);
            done(null);
          });
        }),
    )
    .catch(() => {});
}

// --------------------------------------------------------------------- main

// Narrows the matrix to the named shots: earlier steps of their pathways replay
// without images, later steps are dropped.
function selectShots(pathways, shots) {
  return pathways
    .filter(p => shots.some(s => s.startsWith(`${p.name}/`)))
    .map((p) => {
      const named = new Set(shots.filter(s => s.startsWith(`${p.name}/`)).map(s => s.slice(p.name.length + 1)));
      const last = Math.max(...p.steps.map((s, i) => (named.has(s.name) ? i : -1)));
      return { ...p, steps: p.steps.slice(0, last + 1).map(s => (named.has(s.name) ? s : { ...s, replay: true })) };
    });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.matrix) {
    console.log(USAGE);
    process.exit(opts.help ? 0 : 2);
  }
  if (!opts.out && !opts.check) die(`ux-capture: --out <dir> is required\n\n${USAGE}`, 2);

  const projectRoot = resolve(opts.projectRoot);
  let config;
  try {
    config = loadConfig(projectRoot);
  } catch (err) {
    die(`ux-capture: ${err.message}`, 2);
  }
  const matrix = loadMatrix(opts.matrix, projectRoot);
  const appUrl = (opts.url || matrix.baseUrl || (config.app && config.app.url) || '').replace(/\/$/, '');
  if (!appUrl) die('ux-capture: no app URL: set baseUrl in the matrix or app.url in .toolbelt/ux-capture.json, or pass --url', 2);
  if (config.signIn && matrix.storageState) die('ux-capture: the matrix storageState and the project signIn both sign in; use one', 2);
  if (!config.signIn && matrix.pathways.some(p => p.signIn)) die('ux-capture: a pathway picks who to sign in as, but .toolbelt/ux-capture.json has no signIn', 2);

  let fixedState;
  if (matrix.storageState) {
    const statePath = resolve(projectRoot, matrix.storageState);
    if (!existsSync(statePath)) die(`ux-capture: storageState not found at ${statePath}`, 2);
    fixedState = statePath;
  }
  const missingPathways = opts.pathways.filter(name => !matrix.pathways.some(p => p.name === name));
  if (missingPathways.length) die(`ux-capture: unknown pathways: ${missingPathways.join(', ')}`, 2);
  const missingShots = opts.shots.filter((shot) => {
    const [pathName, stepName] = shot.split('/');
    return !matrix.pathways.some(p => p.name === pathName && p.steps.some(s => s.name === stepName && s.capture !== false));
  });
  if (missingShots.length) die(`ux-capture: unknown shots (use pathway/step): ${missingShots.join(', ')}`, 2);
  if (opts.baseUrl && opts.baseRef) die('ux-capture: use --base-url or --base-ref, not both', 2);
  if ((opts.baseUrl || opts.baseRef) && opts.baseline) die('ux-capture: --base-url and --base-ref make their own baseline; drop --baseline', 2);
  if (opts.baseRef && !(config.app && config.app.start)) die('ux-capture: --base-ref needs app.start in .toolbelt/ux-capture.json', 2);
  const blockList = config.setupBlock || DEFAULT_SETUP_BLOCK;
  const blockedCall = (call) => {
    const hit = setupBlockedBy(call.method, call.url, blockList);
    return hit && `ux-capture: setup ${call.name} (${call.method} ${call.url}) is blocked by /${hit}/i; no setup call was sent`;
  };
  for (const call of matrix.setup) {
    const blocked = blockedCall(call);
    if (blocked) die(blocked, 2);
  }
  if (opts.check) {
    console.log(`ux-capture: ${opts.matrix} and the project config are valid`);
    process.exit(0);
  }

  const outDir = resolve(opts.out);
  if (opts.shots.length && existsSync(join(outDir, 'mechanical.json'))) {
    die(`ux-capture: ${outDir} already holds a capture; retakes go into a new --out folder`, 2);
  }
  const AxeBuilder = opts.smoke ? null : await loadAxe(projectRoot);

  const chromium = await resolvePlaywright(projectRoot);
  if (!chromium) die(PLAYWRIGHT_HELP, 2);

  mkdirSync(outDir, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    die(`ux-capture: cannot launch the browser: ${err.message}`, 2);
  }

  const viewports = opts.smoke ? matrix.viewports.slice(0, 1) : matrix.viewports;
  let chosen = opts.pathways.length ? matrix.pathways.filter(p => opts.pathways.includes(p.name)) : matrix.pathways;
  if (opts.shots.length) chosen = selectShots(chosen, opts.shots);
  const fullRun = !opts.smoke && opts.pathways.length === 0 && opts.shots.length === 0;
  const guardAllow = (config.guard && config.guard.allow) || [];

  // Request log, fixture use, and guard-handled URLs for one side of the run.
  const newLog = () => {
    const requests = new Map();
    const handledUrls = new Set();
    const usedFixtures = new Set();
    const record = (label) => (decision, request) => {
      if (decision.kind === 'fixture') usedFixtures.add(decision.fixture);
      if (decision.kind !== 'allowed') handledUrls.add(request.url);
      const url = request.url.split('?')[0];
      const status = decision.kind === 'fixture' ? decision.fixture.status || 200 : null;
      const key = [decision.kind, request.method, url, status].join(' ');
      const item = requests.get(key) || { kind: decision.kind, method: request.method, url, status, count: 0, pathways: [] };
      item.count += 1;
      if (!item.pathways.includes(label)) item.pathways.push(label);
      requests.set(key, item);
    };
    return { requests, handledUrls, usedFixtures, record };
  };

  // Opens the sign-in page with the identity's parameters, so an app's dev login signs
  // in on its own; form steps, for apps without one, run after it. Saves the session.
  const signIn = async (base, log, params, stateFile) => {
    const s = config.signIn;
    const context = await guardedContext(browser, { viewport: { width: 1280, height: 900 } },
      { allow: [...guardAllow, ...s.allow], css: config.captureCss, log: log.record('sign-in') });
    const page = await context.newPage();
    const url = new URL(base + s.path);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    try {
      await page.goto(url.href, { waitUntil: 'networkidle', timeout: 30000 });
      const filled = [];
      for (const step of s.steps) {
        // A form that reset itself after an earlier fill is filled again before it is submitted.
        if (step.action !== 'fill') {
          for (const done of filled) {
            if (await page.locator(done.selector).first().inputValue() !== done.value) await performAction(page, done);
          }
        }
        await performAction(page, step);
        if (step.action === 'fill') filled.push(step);
        if (step.waitFor) await page.waitForSelector(step.waitFor, { timeout: WAIT_TIMEOUT });
      }
      await page.waitForSelector(s.waitFor, { timeout: 30000 });
      mkdirSync(dirname(stateFile), { recursive: true });
      await context.storageState({ path: stateFile });
    } catch (err) {
      throw new Error(`sign-in as ${JSON.stringify(params)} failed: ${err.message}`);
    } finally {
      await context.close();
    }
  };

  // Runs the matrix setup calls once through the signed-in session. Each response
  // body is saved under the call's name for {{name.field}} templates.
  const runSetup = async (base, storageState, log) => {
    const vars = {};
    const calls = [];
    if (!matrix.setup.length) return { vars, calls };
    const context = await guardedContext(browser, { storageState }, { log: log.record('setup') });
    const apiBase = (config.apiBase || base).replace(/\/$/, '');
    try {
      for (const raw of matrix.setup) {
        const call = expand(raw, vars, `setup ${raw.name}`);
        const blocked = blockedCall(call);
        if (blocked) throw new Error(blocked);
        // A shared header whose value no earlier call has produced yet, such as a CSRF token, is left out.
        const shared = Object.entries(config.setupHeaders || {}).flatMap(([key, value]) => {
          try {
            return [[key, expand(value, vars, 'setupHeaders')]];
          } catch {
            return [];
          }
        });
        const headers = { ...Object.fromEntries(shared), ...(call.headers || {}) };
        const response = await context.request.fetch(apiBase + call.url, {
          method: call.method, data: call.json, headers, failOnStatusCode: false, timeout: 30000, maxRedirects: 0,
        });
        calls.push({ name: call.name, method: call.method, url: call.url, status: response.status() });
        if (response.status() >= 300 && response.status() < 400) {
          throw new Error(`setup ${call.name}: ${call.method} ${call.url} redirected to ${response.headers().location}; setup never follows a redirect`);
        }
        if (!response.ok()) {
          throw new Error(`setup ${call.name}: ${call.method} ${call.url} returned ${response.status()}: ${(await response.text()).slice(0, 200)}`);
        }
        vars[call.name] = await response.json().catch(() => ({}));
      }
    } finally {
      await context.close();
    }
    return { vars, calls };
  };

  // Captures the selected pathways against one app. Returns the entries and request log.
  const runCapture = async ({ base, stateFor, outDir, baselineDir, selected, fixtures, log }) => {
    const entries = [];
    const captureFailures = new Map();
    const captureFailed = (tag, kind, error) => {
      const message = `${kind} for ${tag} failed: ${error.message}`;
      console.error(`ux-capture: ${message}`);
      if (!captureFailures.has(tag)) captureFailures.set(tag, []);
      captureFailures.get(tag).push(documentCheck('capture-failed', 'blocker', message));
    };

    const newContext = async (viewport, theme, pathway, extra) => {
      const cfg = themeConfig(matrix, theme);
      const context = await guardedContext(browser, Object.assign(
        {
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: (extra && extra.dpr) || viewport.dpr || 1,
          storageState: stateFor(pathway),
          colorScheme: cfg.mode === 'media' ? theme : undefined,
          reducedMotion: extra && extra.reducedMotion,
        },
        extra && extra.recordVideo ? { recordVideo: { dir: join(outDir, 'video') } } : {},
      ), {
        fixtures: [...(pathway ? pathway.fixtures : []), ...fixtures],
        allow: guardAllow,
        css: config.captureCss,
        log: log.record(pathway ? pathway.name : 'reference'),
      });
      await context.addInitScript(themeInit, cfg);
      await context.addInitScript(clsInit);
      return context;
    };
    const runChecks = async (page, viewport, theme) => {
      await waitForFonts(page);
      return page.evaluate(inPageChecks, {
        theme,
        viewportWidth: viewport.width,
        controlSelector: CONTROL_SELECTOR,
        interactiveSelector: INTERACTIVE_SELECTOR,
        allowOverflow: matrix.allowOverflow,
        allowOverlap: matrix.allowOverlap,
        allowLight: matrix.allowLight,
        fonts: matrix.fonts,
      });
    };

    const captureCrops = async (viewport, theme, pathway, steps, upTo, tag) => {
      const step = steps[upTo];
      if (!step.crops || !step.crops.length) return [];
      const context = await newContext(viewport, theme, pathway, { dpr: 2 });
      const page = await context.newPage();
      const files = [];
      try {
        await page.goto(base + pathway.path, { waitUntil: 'networkidle', timeout: 30000 });
        for (let i = 0; i <= upTo; i += 1) {
          await performAction(page, steps[i]);
          if (steps[i].waitFor) {
            await page.waitForSelector(steps[i].waitFor, { timeout: WAIT_TIMEOUT });
          }
        }
        await settle(page);
        for (let i = 0; i < step.crops.length; i += 1) {
          const file = `${tag}-crop-${i + 1}.png`;
          await page
            .locator(step.crops[i])
            .first()
            .screenshot({ path: join(outDir, file), animations: 'disabled', caret: 'hide' });
          files.push(file);
        }
      } catch (err) {
        captureFailed(tag, 'crops', err);
      } finally {
        await context.close();
      }
      return files;
    };

    // A page with no theme or CLS instrumentation, for canvas work on image data.
    let scratchPage = null;
    const scratch = async () => {
      if (!scratchPage) {
        const context = await guardedContext(browser, {
          viewport: { width: 800, height: 600 },
          deviceScaleFactor: 1,
        }, { log: log.record('scratch') });
        scratchPage = await context.newPage();
        await scratchPage.setContent('<body style="margin:0"><canvas id="strip"></canvas></body>');
      }
      return scratchPage;
    };

    const dataUrl = (file) => `data:image/png;base64,${readFileSync(file).toString('base64')}`;

    // The reduced-motion frame: a second context that replays the pathway.
    const reducedMotionFrame = async (viewport, theme, pathway, steps, upTo, tag) => {
      const context = await newContext(viewport, theme, pathway, { reducedMotion: 'reduce' });
      const page = await context.newPage();
      try {
        await page.goto(base + pathway.path, { waitUntil: 'networkidle', timeout: 30000 });
        for (let i = 0; i < upTo; i += 1) {
          await performAction(page, steps[i]);
          if (steps[i].waitFor) {
            await page.waitForSelector(steps[i].waitFor, { timeout: WAIT_TIMEOUT });
          }
        }
        await performAction(page, steps[upTo]);
        await page.waitForTimeout(MOTION_DELAYS[MOTION_DELAYS.length - 1]);
        return await page.screenshot({ type: 'jpeg', quality: 70 });
      } catch (err) {
        captureFailed(tag, 'reduced-motion frame', err);
        return null;
      } finally {
        await context.close();
      }
    };

    const writeFilmstrip = async (frames, labels, tag) => {
      if (frames.length === 0) return null;
      const file = `${tag}-filmstrip.png`;
      try {
        const page = await scratch();
        const size = await page.evaluate(inPageStitch, {
          frames: frames.map((buffer) => `data:image/jpeg;base64,${buffer.toString('base64')}`),
          labels,
        });
        await page.setViewportSize({
          width: Math.min(size.width, 4000),
          height: Math.min(size.height, 4000),
        });
        await page.locator('#strip').screenshot({ path: join(outDir, file) });
        return file;
      } catch (err) {
        captureFailed(tag, 'filmstrip', err);
        return null;
      }
    };

    const diffCapture = async (stillFile, tag) => {
      const basePath = join(baselineDir, stillFile);
      if (!existsSync(basePath)) return { status: 'new', ratio: 0, box: null };
      let raw;
      try {
        raw = await (await scratch()).evaluate(inPageDiff, {
          headUrl: dataUrl(join(outDir, stillFile)),
          baseUrl: dataUrl(basePath),
          tolerance: DIFF_TOLERANCE,
        });
      } catch (err) {
        captureFailed(tag, 'diff', err);
        return null;
      }
      const ratio = Number(raw.ratio.toFixed(6));
      // Images of different sizes are changed, with the box covering the head still.
      if (!raw.sameSize) {
        return { status: 'changed', ratio, box: [0, 0, raw.headWidth, raw.headHeight] };
      }
      if (!raw.box) return { status: 'unchanged', ratio, box: null };
      return { status: 'changed', ratio, box: raw.box };
    };

    // box is in head-still pixels; the clip and its padding are in CSS px.
    const writeDiffCrop = async (page, tag, box, viewport, dpr, fullPage) => {
      const file = `${tag}-diff-crop.png`;
      let x = box[0] / dpr - DIFF_CROP_PADDING;
      let y = box[1] / dpr - DIFF_CROP_PADDING;
      let width = box[2] / dpr + DIFF_CROP_PADDING * 2;
      let height = box[3] / dpr + DIFF_CROP_PADDING * 2;
      if (x < 0) {
        width += x;
        x = 0;
      }
      if (y < 0) {
        height += y;
        y = 0;
      }
      width = Math.min(width, viewport.width - x);
      // A full-page still can hold a box below the fold, so only a viewport still clamps.
      if (!fullPage) height = Math.min(height, viewport.height - y);
      if (width <= 0 || height <= 0) {
        captureFailed(tag, 'diff crop', new Error('changed region lies outside the capture area'));
        return null;
      }
      try {
        // A viewport clip is viewport-relative, so the page keeps the scroll
        // position the step left it at; a fullPage clip is in document
        // coordinates and needs the top of the document.
        if (fullPage) await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: join(outDir, file),
          clip: { x, y, width, height },
          fullPage,
          animations: 'disabled',
          caret: 'hide',
        });
        return file;
      } catch (err) {
        captureFailed(tag, 'diff crop', err);
        return null;
      }
    };

    // Diff, then the crop: the crop scrolls the page, so checks must be done.
    const diffAndCrop = async (page, stillFile, tag, viewport, dpr, fullPage) => {
      if (!baselineDir || !stillFile) return { diff: null, diffCrop: null };
      const diff = await diffCapture(stillFile, tag);
      if (!diff || diff.status !== 'changed' || !diff.box) return { diff, diffCrop: null };
      return {
        diff,
        diffCrop: await writeDiffCrop(page, tag, diff.box, viewport, dpr, fullPage === true),
      };
    };

    for (const viewport of viewports) {
      for (const theme of matrix.themes) {
        for (const pathway of selected) {
          const context = await newContext(viewport, theme, pathway, { recordVideo: opts.video });
          const page = await context.newPage();
          const video = opts.video ? page.video() : null;

          const listeners = attachListeners(page, log.handledUrls);
          let lastCls = 0;
          let lastSources = 0;
          let lastDocId = null;

          let navigationError = null;
          try {
            await page.goto(base + pathway.path, { waitUntil: 'networkidle', timeout: 30000 });
          } catch (err) {
            navigationError = err.message;
          }

          for (let index = 0; index < pathway.steps.length; index += 1) {
            const step = pathway.steps[index];
            // A retake replays earlier steps without images; a failure there stops the pathway.
            if (step.replay) {
              if (!navigationError) {
                try {
                  await performAction(page, step);
                  if (step.waitFor) await page.waitForSelector(step.waitFor, { timeout: WAIT_TIMEOUT });
                } catch (err) {
                  navigationError = `replayed step ${step.name} failed: ${err.message}`;
                }
              }
              continue;
            }
            const tag = `${pathway.name}-${step.name}-${step.state}-${viewport.width}-${theme}`;
            const still = `${tag}.png`;
            let error = navigationError;
            // A shot whose target is not reached writes no image, but the pathway goes on.
            let missed = null;

            const capture = step.capture !== false;
            const motion = capture && step.motion === true && !opts.smoke;
            const frames = [];
            if (!error) {
              try {
                await performAction(page, step);
                // Filmstrip frames come between the action and waitFor, animations live.
                // Each delay is measured from the clock at the action's return, so a
                // slow screenshot does not push the later labels off their true time.
                const actionReturned = Date.now();
                for (const delay of motion ? MOTION_DELAYS : []) {
                  const remaining = actionReturned + delay - Date.now();
                  if (remaining > 0) await page.waitForTimeout(remaining);
                  frames.push(await page.screenshot({ type: 'jpeg', quality: 70 }));
                }
                if (step.waitFor) await page.waitForSelector(step.waitFor, { timeout: WAIT_TIMEOUT });
              } catch (err) {
                error = err.message;
              }
            }

            await settle(page);
            let stillWritten = null;
            let targetFile = null;
            let target = null;
            let measurements = null;
            if (capture && !error) {
              try {
                const found = await locateTarget(page, step);
                await revealTarget(page, found.locator);
                await page.screenshot({
                  path: join(outDir, still),
                  animations: 'disabled',
                  caret: 'hide',
                  fullPage: step.fullPage === true,
                });
                stillWritten = still;
                const shot = await shootTarget(page, found.locator, join(outDir, `${tag}-target.png`), viewport);
                targetFile = `${tag}-target.png`;
                target = { selector: step.target, matched: found.matched, box: shot.box, clipped: shot.clipped, grownViewport: shot.grown };
                measurements = shot.measurements;
              } catch (err) {
                missed = err.message;
                if (stillWritten) rmSync(join(outDir, stillWritten), { force: true });
                stillWritten = null;
              }
            }
            const notReached = capture ? error || missed : null;

            const crops = notReached || !capture ? [] : await captureCrops(viewport, theme, pathway, pathway.steps, index, tag);

            let result = { checks: [], docId: null, cls: 0, clsSources: [], fonts: 'loaded' };
            try {
              result = await runChecks(page, viewport, theme);
            } catch (err) {
              if (!error) error = `mechanical checks failed: ${err.message}`;
            }

            const axe = opts.smoke ? 'skipped' : await runAxe(AxeBuilder, page, tag);

            let filmstrip = null;
            if (motion && frames.length && !error) {
              const reduced = await reducedMotionFrame(
                viewport, theme, pathway, pathway.steps, index, tag,
              );
              const labels = MOTION_DELAYS.map((ms) => `${ms} ms`);
              if (reduced) {
                frames.push(reduced);
                labels.push('reduced motion');
              }
              filmstrip = await writeFilmstrip(frames, labels, tag);
            }

            const checks = result.checks.slice().concat(axeChecks(axe));
            // A fresh document restarted window.__uxCls, so the step's delta is the
            // whole new sum; a same-document navigation keeps the running one.
            if (result.docId !== lastDocId) {
              lastCls = 0;
              lastSources = 0;
              lastDocId = result.docId;
            }
            const clsDelta = result.cls - lastCls;
            const sources = result.clsSources.slice(lastSources);
            lastCls = result.cls;
            lastSources = result.clsSources.length;
            if (clsDelta > 0.1) {
              checks.push({
                check: 'layout-shift',
                severity: 'should',
                selector: null,
                text: null,
                cls: Number(clsDelta.toFixed(4)),
              });
            }
            for (const message of listeners.consoleErrors) {
              checks.push(documentCheck('console-error', 'should', message));
            }
            for (const message of listeners.failedRequests) {
              checks.push(documentCheck('failed-request', 'should', message));
            }
            if (notReached) {
              const aborted = [...new Set(listeners.aborted)].slice(-3);
              checks.push(documentCheck('not-reached', 'blocker',
                notReached + (aborted.length ? ` (writes the guard aborted on this page: ${aborted.join(', ')})` : '')));
            } else if (error) checks.push(documentCheck('step-failed', 'blocker', error));

            const dpr = viewport.dpr || 1;
            const diffed = await diffAndCrop(page, stillWritten, tag, viewport, dpr, step.fullPage);
            const targetDiff = baselineDir && targetFile ? await diffCapture(targetFile, tag) : null;
            checks.push(...(captureFailures.get(tag) || []));

            entries.push(
              makeEntry({
                tag,
                pathway: pathway.name,
                step: step.name,
                state: step.state,
                width: viewport.width,
                theme,
                dpr,
                still: stillWritten,
                crops,
                filmstrip,
                diffCrop: diffed.diffCrop,
                diff: diffed.diff,
                targetFile,
                target,
                targetDiff,
                measurements,
                checks,
                cls: clsDelta,
                clsSources: sources,
                consoleErrors: listeners.consoleErrors.slice(),
                failedRequests: listeners.failedRequests.slice(),
                fonts: result.fonts,
                axe,
                suppressed: result.suppressed,
                overlapTruncated: result.overlapTruncated,
                error: error || missed,
              }),
            );

            listeners.consoleErrors = [];
            listeners.failedRequests = [];
            if (error) {
              // The pathway stops here, but the steps it never reached are recorded
              // so a reader sees every step of the matrix in mechanical.json.
              for (let rest = index + 1; rest < pathway.steps.length; rest += 1) {
                const skipped = pathway.steps[rest];
                if (skipped.replay) continue;
                entries.push(
                  makeEntry({
                    tag: `${pathway.name}-${skipped.name}-${skipped.state}-${viewport.width}-${theme}`,
                    pathway: pathway.name,
                    step: skipped.name,
                    state: skipped.state,
                    width: viewport.width,
                    theme,
                    dpr: viewport.dpr || 1,
                    still: null,
                    checks: [
                      documentCheck(skipped.capture === false ? 'step-failed' : 'not-reached', 'blocker', `skipped after failure of step ${step.name}`),
                    ],
                    fonts: result.fonts,
                    axe: 'skipped',
                    error: `skipped after failure of step ${step.name}`,
                  }),
                );
              }
              break;
            }
          }

          await context.close();
          // The webm is only finalised once the context is closed.
          if (video) {
            const named = `${pathway.name}-${viewport.width}-${theme}.webm`;
            try {
              await video.saveAs(join(outDir, 'video', named));
              await video.delete();
            } catch (err) {
              console.error(`ux-capture: video for ${named} failed: ${err.message}`);
            }
          }
        }
      }
    }

    // Reference screens: full runs only, first viewport, every theme.
    if (fullRun && matrix.referenceScreens.length) {
      const viewport = matrix.viewports[0];
      const dpr = viewport.dpr || 1;
      for (const theme of matrix.themes) {
        for (let i = 0; i < matrix.referenceScreens.length; i += 1) {
          const n = i + 1;
          const tag = `reference-${n}-${viewport.width}-${theme}`;
          const context = await newContext(viewport, theme, null, {});
          const page = await context.newPage();
          const listeners = attachListeners(page, log.handledUrls);
          let error = null;
          let stillWritten = null;
          let result = { checks: [], docId: null, cls: 0, clsSources: [], fonts: 'loaded' };
          try {
            await page.goto(base + matrix.referenceScreens[i], {
              waitUntil: 'networkidle',
              timeout: 30000,
            });
            await settle(page);
            await page.screenshot({
              path: join(outDir, `${tag}.png`),
              animations: 'disabled',
              caret: 'hide',
            });
            stillWritten = `${tag}.png`;
            result = await runChecks(page, viewport, theme);
          } catch (err) {
            error = err.message;
          }
          const axe = await runAxe(AxeBuilder, page, tag);
          const checks = result.checks.slice().concat(axeChecks(axe));
          for (const message of listeners.consoleErrors) {
            checks.push(documentCheck('console-error', 'should', message));
          }
          for (const message of listeners.failedRequests) {
            checks.push(documentCheck('failed-request', 'should', message));
          }
          if (error) checks.push(documentCheck('step-failed', 'blocker', error));
          const diffed = await diffAndCrop(page, stillWritten, tag, viewport, dpr, false);
          checks.push(...(captureFailures.get(tag) || []));
          entries.push(
            makeEntry({
              tag,
              pathway: 'reference',
              step: String(n),
              state: 'default',
              width: viewport.width,
              theme,
              dpr,
              still: stillWritten,
              crops: [],
              filmstrip: null,
              diffCrop: diffed.diffCrop,
              diff: diffed.diff,
              checks,
              cls: result.cls || 0,
              clsSources: result.clsSources,
              consoleErrors: listeners.consoleErrors,
              failedRequests: listeners.failedRequests,
              fonts: result.fonts,
              axe,
              suppressed: result.suppressed,
              overlapTruncated: result.overlapTruncated,
              error,
            }),
          );
          await context.close();
        }
      }
    }


    return { entries, requests: [...log.requests.values()], usedFixtures: log.usedFixtures };
  };

  // Signs in, runs setup, and captures against one app, starting the app when needed.
  const runSide = async ({ side, url, cwd, outDir, baselineDir, env }) => {
    mkdirSync(outDir, { recursive: true });
    let app;
    try {
      app = await ensureApp({ url, app: side === 'before' && opts.baseUrl ? {} : config.app, cwd, logFile: join(outDir, 'app.log'), env });
    } catch (err) {
      die(`ux-capture: ${side}: ${err.message}`, 2);
    }
    const log = newLog();
    // One session per distinct identity: the config's default parameters, overridden
    // by a pathway's own; a pathway with signIn false runs signed out.
    const sessions = new Map();
    const stateFiles = [];
    const forgetState = onExit(() => stateFiles.forEach(f => rmSync(f, { force: true })));
    const identity = pathway => ({ ...config.signIn.params, ...(pathway && pathway.signIn) });
    const session = async (params) => {
      const key = JSON.stringify(Object.entries(params).sort());
      if (!sessions.has(key)) {
        const file = config.signIn.stateFile.replace(/(\.json)?$/, sessions.size ? `-${sessions.size + 1}.json` : '.json');
        stateFiles.push(file);
        await signIn(url, log, params, file);
        sessions.set(key, file);
      }
      return sessions.get(key);
    };
    try {
      const states = new Map();
      let defaultState = fixedState;
      if (config.signIn) {
        if (matrix.setup.length || matrix.referenceScreens.length) defaultState = await session(identity(null));
        for (const p of chosen) if (p.signIn !== false) states.set(p.name, await session(identity(p)));
      }
      const stateFor = pathway => {
        if (!pathway) return defaultState;
        if (pathway.signIn === false) return undefined;
        return config.signIn ? states.get(pathway.name) : fixedState;
      };
      const { vars, calls } = await runSetup(url, defaultState, log);
      const selected = expand(chosen, vars, 'matrix');
      const fixtures = expand(matrix.fixtures, vars, 'matrix fixtures');
      const result = await runCapture({ base: url, stateFor, outDir, baselineDir, selected, fixtures, log });
      const unusedFixtures = [
        ...selected.flatMap(p => p.fixtures.filter(f => !result.usedFixtures.has(f)).map(f => ({ method: f.method || 'GET', url: f.url, pathway: p.name }))),
        ...(fullRun ? fixtures.filter(f => !result.usedFixtures.has(f)).map(f => ({ method: f.method || 'GET', url: f.url })) : []),
      ];
      const notReached = result.entries
        .filter(e => e.checks.some(c => c.check === 'not-reached'))
        .map(e => ({ tag: e.tag, pathway: e.pathway, step: e.step, reason: e.checks.find(c => c.check === 'not-reached').message }));
      const report = {
        projectRoot, app: app.status, requests: result.requests, setup: calls, notReached, unusedFixtures, captures: result.entries,
      };
      writeFileSync(join(outDir, 'mechanical.json'), `${JSON.stringify(report, null, 2)}\n`);
      return { report, selected };
    } catch (err) {
      die(`ux-capture: ${side}: ${err.message}`, 2);
    } finally {
      stateFiles.forEach(f => rmSync(f, { force: true }));
      forgetState();
      await app.stop();
    }
    return null;
  };

  let before = null;
  let baseLabel = null;
  const beforeDir = opts.baseUrl || opts.baseRef ? join(outDir, 'before') : null;
  if (opts.baseUrl) {
    baseLabel = opts.baseUrl;
    before = await runSide({ side: 'before', url: opts.baseUrl.replace(/\/$/, ''), cwd: projectRoot, outDir: beforeDir, baselineDir: null });
  } else if (opts.baseRef) {
    let checkout;
    try {
      checkout = checkoutBase({ projectRoot, ref: opts.baseRef, app: config.app, logFile: join(outDir, 'base-install.log') });
    } catch (err) {
      die(`ux-capture: before: ${err.message}`, 2);
    }
    baseLabel = `${opts.baseRef} (${checkout.sha.slice(0, 12)})`;
    const url = new URL(appUrl);
    url.port = String(await freePort());
    try {
      before = await runSide({
        side: 'before', url: url.href.replace(/\/$/, ''), cwd: checkout.dir, outDir: beforeDir, baselineDir: null,
        env: { UX_CAPTURE_SOURCE_ROOT: projectRoot },
      });
    } finally {
      checkout.remove();
    }
  }
  // --smoke skips axe, filmstrips and reference screens, and ignores --baseline.
  const baselineDir = beforeDir || (opts.smoke || !opts.baseline ? null : resolve(opts.baseline));
  const after = await runSide({ side: 'after', url: appUrl, cwd: projectRoot, outDir, baselineDir });
  await browser.close();

  writeBrief({
    outDir,
    beforeDir,
    matrix: { ...matrix, pathways: after.selected },
    entries: after.report.captures,
    beforeEntries: before ? before.report.captures : null,
    report: after.report,
    beforeReport: before ? before.report : null,
    run: { head: headSha(projectRoot), base: baseLabel },
  });

  let worst = after.report.unusedFixtures.length ? 1 : 0;
  for (const entry of after.report.captures) {
    for (const check of entry.checks) worst = Math.max(worst, severityRank(check.severity));
  }
  process.exit(worst >= 1 ? 1 : 0);
}

main().catch((err) => {
  die(`ux-capture: ${err && err.stack ? err.stack : err}`, 2);
});
