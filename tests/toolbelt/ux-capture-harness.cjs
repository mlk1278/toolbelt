// Integration tests for the capture tool's harness features: request guard, fixtures,
// targets, sign-in, setup, brief, base pairing, retakes, app reuse, pointer paths.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

const script = process.argv[2];
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-harness-'));
const head = '<!doctype html><html lang="en"><head><title>Harness</title><link rel="icon" href="data:,">' +
  '<style>body{margin:0;font-family:Arial;color:#111;background:#fff}</style></head><body>';

// Every request that reached a server, so tests can prove the guard held.
const received = [];
const label = 'Current label';
let nextEstimate = 1;
const estimates = new Map();

function page(body) {
  return head + body + '</body></html>';
}

function makeServer(remotePort, labelOverride) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    received.push(`${req.method} ${url.pathname}`);
    const cookie = req.headers.cookie || '';
    const send = (status, body, type = 'text/html') => {
      res.writeHead(status, { 'Content-Type': type });
      res.end(body);
    };
    if (url.pathname === '/inbox') {
      return send(200, page('<main><h1 id="title">Inbox</h1><ul id="list"></ul></main><script>' +
        'fetch("/api/messages/1/read",{method:"POST"}).catch(()=>{});' +
        'navigator.sendBeacon("/api/beacon","x");' +
        'fetch("/api/items").then(r=>r.json()).then(items=>{list.innerHTML=items.map(i=>"<li>"+i+"</li>").join("")});' +
        '</script>'));
    }
    if (url.pathname === '/api/items') return send(200, JSON.stringify(['real item']), 'application/json');
    if (url.pathname === '/flags') {
      return send(200, page('<main><p id="banner">loading</p><p id="remote">remote loading</p></main><script>' +
        'fetch("/api/flags").then(r=>r.ok?r.json():Promise.reject(r.status))' +
        '.then(f=>{banner.textContent=f.enabled?"Feature on":"Feature off"},s=>{banner.textContent="Error "+s});' +
        `fetch("http://127.0.0.1:${remotePort}/api/remote",{credentials:"include"}).then(r=>r.json())` +
        '.then(d=>{remote.textContent=d.text}).catch(()=>{remote.textContent="remote failed"});' +
        '</script>'));
    }
    if (url.pathname === '/api/flags') return send(200, JSON.stringify({ enabled: false }), 'application/json');
    if (url.pathname === '/api/remote') return send(200, JSON.stringify({ text: 'real remote' }), 'application/json');
    if (url.pathname === '/scroll') {
      // The scroll pane comes last so its scrolled-away content overlaps nothing.
      return send(200, page('<header class="sticky" style="position:sticky;top:0;height:60px;background:#ccc">Header</header>' +
        '<article id="tall" style="height:1500px;background:linear-gradient(#fff,#999)">Tall</article>' +
        '<p id="ghost" style="width:0;height:0;overflow:hidden">Ghost</p>' +
        '<p id="probe">probe</p><script>setInterval(()=>{const s=getComputedStyle(document.querySelector(".sticky")).position;' +
        'probe.textContent="header "+s},50)</script>' +
        '<div id="pane" style="height:300px;overflow:auto;border:1px solid #000">' +
        '<div style="padding:1200px 0 600px"><section id="deep" style="height:120px;background:#9cf">Deep panel</section></div></div>'));
    }
    if (url.pathname === '/label') return send(200, page(`<main><button id="label" style="width:120px;height:40px">${labelOverride || label}</button></main>`));
    if (url.pathname === '/login') {
      // The form resets an early fill once "hydration" finishes, like the FSMCRM sign-in form.
      return send(200, page('<form id="f"><input id="email"><input id="password" type="password"><button id="go" type="button">Sign in</button></form>' +
        '<script>setTimeout(()=>{email.value="";password.value=""},400);' +
        'go.onclick=()=>fetch("/auth/login",{method:"POST",body:email.value+":"+password.value})' +
        '.then(r=>{if(r.ok)location.href="/home";else document.body.append("rejected")});</script>'));
    }
    if (url.pathname === '/auth/login' && req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        if (body !== 'ada@example.com:secret') return send(401, 'no');
        res.writeHead(200, { 'Set-Cookie': 'sid=ok; Path=/' });
        res.end('ok');
      });
      return undefined;
    }
    if (url.pathname === '/dev-login') {
      // A dev auto-login: the role comes from the query string, no form involved.
      res.writeHead(302, { 'Set-Cookie': `role=${url.searchParams.get('as')}${url.searchParams.get('grant') ? `+${url.searchParams.get('grant')}` : ''}; Path=/`, Location: '/whoami' });
      return res.end();
    }
    if (url.pathname === '/whoami') {
      const role = (cookie.match(/role=([^;]+)/) || [])[1] || 'nobody';
      return send(200, page(`<main><p id="whoami">signed in as ${role}</p></main>`));
    }
    if (url.pathname === '/home') {
      if (!cookie.includes('sid=ok')) {
        res.writeHead(302, { Location: '/login' });
        return res.end();
      }
      return send(200, page('<main><h1 id="welcome">Welcome back</h1></main>'));
    }
    if (url.pathname === '/api/estimates' && req.method === 'POST') {
      if (!cookie.includes('sid=ok')) return send(401, '{}', 'application/json');
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        const id = nextEstimate++;
        estimates.set(String(id), JSON.parse(body));
        send(201, JSON.stringify({ id }), 'application/json');
      });
      return undefined;
    }
    const estimate = url.pathname.match(/^\/estimates\/(\d+)$/);
    if (estimate) {
      const data = estimates.get(estimate[1]);
      return send(data ? 200 : 404, page(`<main><section id="lines">${data ? data.lines.map(l => `<p>${l.label} ${l.amount}</p>`).join('') : 'missing'}</section></main>`));
    }
    if (url.pathname === '/hover-bug' || url.pathname === '/hover-ok') {
      // The toolbar sits 30px right of the row. The fixed page bridges the gap; the buggy one hides at once.
      const bridge = url.pathname === '/hover-ok';
      return send(200, page('<div id="row" style="position:absolute;left:20px;top:20px;width:200px;height:40px;background:#eee">Row</div>' +
        '<div id="tools" hidden style="position:absolute;left:250px;top:20px;width:80px;height:40px;background:#9c9">' +
        '<button id="edit" style="width:80px;height:40px">Edit</button></div><p id="out" style="position:absolute;top:120px">idle</p>' +
        (bridge ? '<div id="bridge" style="position:absolute;left:220px;top:20px;width:30px;height:40px"></div>' : '') +
        '<script>const tools=document.getElementById("tools");const show=()=>{tools.hidden=false};const hide=e=>{const to=e.relatedTarget;' +
        'if(to&&(tools.contains(to)||to.id==="bridge"||to.id==="row"))return;tools.hidden=true};' +
        'row.onmouseenter=show;row.onmouseleave=hide;tools.onmouseleave=hide;' +
        (bridge ? 'bridge.onmouseenter=show;bridge.onmouseleave=hide;' : '') +
        'edit.onclick=()=>{out.textContent="edited"};</script>'));
    }
    if (url.pathname === '/api/hop') {
      res.writeHead(307, { Location: '/api/charge' });
      return res.end();
    }
    if (url.pathname === '/api/charge') return send(200, '{"charged":true}', 'application/json');
    if (url.pathname === '/hop') {
      return send(200, page('<main><p id="hop">waiting</p></main><script>fetch("/api/hop",{method:"POST"})' +
        '.then(r=>{hop.textContent="answered "+r.status},()=>{hop.textContent="hop blocked"})</script>'));
    }
    if (url.pathname === '/api/start') {
      res.writeHead(307, { Location: '/api/create' });
      return res.end();
    }
    if (url.pathname === '/api/rel') {
      res.writeHead(307, { Location: '/other/hop' });
      return res.end();
    }
    if (url.pathname === '/other/hop') {
      res.writeHead(303, { Location: 'done' });
      return res.end();
    }
    if (url.pathname === '/other/done') return send(200, '{"where":"other"}', 'application/json');
    if (url.pathname === '/api/done') return send(200, '{"where":"api"}', 'application/json');
    if (url.pathname === '/api/xhop') {
      res.writeHead(307, { Location: `http://127.0.0.1:${remotePort}/api/charge` });
      return res.end();
    }
    if (url.pathname === '/xhop') {
      return send(200, page('<main><p id="out">waiting</p></main><script>fetch("/api/xhop",{method:"POST",' +
        'headers:{Authorization:"Bearer secret"}}).then(r=>{out.textContent="answered"},()=>{out.textContent="xhop blocked"})</script>'));
    }
    if (url.pathname === '/pseudo-cover') {
      return send(200, page('<style>#veil::before{content:"";position:absolute;inset:0;background:#000}</style>' +
        '<main><section id="card" style="height:100px;width:300px">Card</section></main>' +
        '<div id="veil" style="position:fixed;inset:0"></div>'));
    }
    if (url.pathname === '/rel-form') {
      return send(200, page('<form id="f" method="post" action="/api/rel"></form><script>f.submit()</script>'));
    }
    if (url.pathname === '/start' || url.pathname === '/rel') {
      const api = url.pathname === '/start' ? '/api/start' : '/api/rel';
      return send(200, page(`<main><p id="out">waiting</p></main><script>fetch("${api}",{method:"POST"}).then(r=>r.json())` +
        '.then(d=>{out.textContent="got "+(d.id||d.where)},e=>{out.textContent="failed "+e})</script>'));
    }
    if (url.pathname === '/ghost-cover' || url.pathname === '/toast-layer') {
      const layer = url.pathname === '/ghost-cover'
        ? '<div id="ghost" style="position:fixed;inset:0;pointer-events:none;background:#000"></div>'
        : '<div id="toasts" style="position:fixed;inset:0;pointer-events:none"><p style="position:absolute;right:0;bottom:0;background:#333;color:#fff">Saved</p></div>';
      return send(200, page('<main><section id="card" style="height:100px;width:300px">Card</section></main>' + layer));
    }
    if (url.pathname === '/covered') {
      return send(200, page('<main><section id="card" style="height:100px;width:300px">Card</section></main>' +
        '<div id="overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.9)">Overlay</div>'));
    }
    return send(404, page('<main>not found</main>'));
  });
}

const remote = makeServer(0);
let server;

function listen(srv) {
  return new Promise(resolve => srv.listen(0, '127.0.0.1', () => resolve(srv.address().port)));
}

let runNumber = 0;
async function run(matrix, args = [], { project = path.join(root, 'project'), out } = {}) {
  const dir = out || path.join(root, `run-${++runNumber}`);
  const matrixFile = path.join(root, `matrix-${runNumber}-${Math.random().toString(36).slice(2)}.json`);
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(matrixFile, JSON.stringify(matrix));
  const child = spawn(process.execPath, [script, matrixFile, '--out', dir, '--project-root', project, ...args]);
  let stderr = '';
  let stdout = '';
  child.stderr.on('data', d => { stderr += d; });
  child.stdout.on('data', d => { stdout += d; });
  const timer = setTimeout(() => child.kill('SIGKILL'), 120000);
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  }).finally(() => clearTimeout(timer));
  const report = path.join(dir, 'mechanical.json');
  const mech = fs.existsSync(report) ? JSON.parse(fs.readFileSync(report, 'utf8')) : { captures: [] };
  const briefFile = path.join(dir, 'brief.md');
  const brief = fs.existsSync(briefFile) ? fs.readFileSync(briefFile, 'utf8') : '';
  return { code, stderr, stdout, out: dir, mech, entries: mech.captures, checks: mech.captures.flatMap(e => e.checks), brief };
}

function matrix(pathways, extra = {}) {
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    themes: ['light'],
    viewports: [{ width: 800, height: 600, dpr: 1 }],
    pathways,
    ...extra,
  };
}

function project(name, config) {
  const dir = path.join(root, name);
  fs.mkdirSync(path.join(dir, '.toolbelt'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.toolbelt/ux-capture.json'), JSON.stringify(config));
  return dir;
}

let failures = 0;
async function check(name, fn) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return;
  try { await fn(); console.log(`ok - ${name}`); } catch (error) { failures += 1; console.error(`not ok - ${name}: ${error.message}`); }
}

async function main() {
  const remotePort = await listen(remote);
  server = makeServer(remotePort);
  await listen(server);
  try {
    await check('every browser context is created in one guarded place', async () => {
      const source = fs.readFileSync(script + '.mjs', 'utf8');
      assert.equal(source.match(/\.newContext\(/g).length, 1);
    });

    await check('writes from the page are aborted, listed, and never reach the server', async () => {
      received.length = 0;
      const r = await run(matrix([{ name: 'inbox', path: '/inbox', steps: [{ name: 'open', target: '#list', expectText: 'real item' }] }]));
      assert.equal(r.code, 0, r.stderr + JSON.stringify(r.checks));
      assert(!received.some(l => l.startsWith('POST')), received.join(', '));
      const aborted = r.mech.requests.filter(q => q.kind === 'aborted').map(q => `${q.method} ${q.url}`);
      assert(aborted.some(a => a.endsWith('/api/messages/1/read') && a.startsWith('POST')), aborted.join(', '));
      assert(aborted.some(a => a.endsWith('/api/beacon')), aborted.join(', '));
      assert.match(r.brief, /aborted.*POST .*\/api\/messages\/1\/read/);
    });

    await check('fixtures answer locally, also cross-origin, and error fixtures are not findings', async () => {
      received.length = 0;
      const r = await run(matrix([
        { name: 'on', path: '/flags', steps: [{ name: 'open', target: '#banner', expectText: 'Feature on' },
          { name: 'remote', target: '#remote', expectText: 'faked remote' }],
        fixtures: [{ url: '/api/flags', json: { enabled: true } }] },
        { name: 'error', path: '/flags', steps: [{ name: 'open', target: '#banner', expectText: 'Error 500' }],
          fixtures: [{ url: '/api/flags', status: 500, json: { error: 'boom' } }] },
      ], { fixtures: [{ url: `http://127.0.0.1:${remotePort}/api/remote`, json: { text: 'faked remote' } }] }));
      assert.equal(r.code, 0, r.stderr + JSON.stringify(r.checks));
      assert(!received.includes('GET /api/flags'), received.join(', '));
      assert(!received.includes('GET /api/remote'), received.join(', '));
      assert(r.mech.requests.some(q => q.kind === 'fixture' && q.url.endsWith('/api/flags') && q.status === 500));
    });

    await check('a fixture nothing requested is a finding', async () => {
      const r = await run(matrix([{ name: 'inbox', path: '/inbox', steps: [{ name: 'open', target: '#title' }],
        fixtures: [{ url: '/api/never-called', json: {} }] }]));
      assert.equal(r.code, 1, r.stderr);
      assert.deepEqual(r.mech.unusedFixtures.map(f => f.url), ['/api/never-called']);
    });

    await check('a missing, sizeless, or wrong-text target is not reached and writes no image', async () => {
      const r = await run(matrix([{ name: 'scroll', path: '/scroll', steps: [
        { name: 'missing', target: '#nope' },
        { name: 'ghost', target: '#ghost' },
        { name: 'wrong', target: '#deep', expectText: 'Totals' },
      ] }]));
      assert.equal(r.code, 1, r.stderr);
      assert.deepEqual(r.mech.notReached.map(n => n.step), ['missing', 'ghost', 'wrong']);
      assert(r.mech.notReached.every(n => n.reason.length > 10), JSON.stringify(r.mech.notReached));
      assert.equal(fs.readdirSync(r.out).filter(f => f.endsWith('.png')).length, 0);
      assert.match(r.brief, /Not reached/);
    });

    await check('targets in nested scroll containers and taller than the viewport are cropped whole', async () => {
      const r = await run(matrix([{ name: 'scroll', path: '/scroll', steps: [
        { name: 'deep', target: '#deep' },
        { name: 'tall', target: '#tall' },
      ] }]));
      assert.equal(r.code, 0, r.stderr + JSON.stringify(r.checks));
      const [deep, tall] = r.entries;
      assert.equal(Math.round(deep.target.box.height), 120);
      assert.equal(deep.target.clipped, false);
      assert.equal(Math.round(tall.target.box.height), 1500);
      for (const entry of [deep, tall]) assert(fs.existsSync(path.join(r.out, entry.files.target)), entry.tag);
      const png = fs.readFileSync(path.join(r.out, tall.files.target));
      assert.equal(png.readUInt32BE(20), 1500, 'tall target image height');
    });

    await check('capture-only CSS from the project config applies to every page', async () => {
      const dir = project('css-project', { captureCss: '.sticky{position:static !important}' });
      const r = await run(matrix([{ name: 'scroll', path: '/scroll', steps: [{ name: 'probe', target: '#probe', expectText: 'header static' }] }]),
        [], { project: dir });
      assert.equal(r.code, 0, r.stderr + JSON.stringify(r.checks));
    });

    await check('sign-in uses the app dev login, once per identity, and each pathway picks its own', async () => {
      const dir = project('dev-login-project', {
        signIn: { path: '/dev-login', params: { as: 'ADMIN' }, waitFor: '#whoami', stateFile: '.toolbelt/ux/session.json' },
      });
      received.length = 0;
      const r = await run(matrix([
        { name: 'admin', path: '/whoami', steps: [{ name: 'open', target: '#whoami', expectText: 'signed in as ADMIN' }] },
        { name: 'manager', path: '/whoami', signIn: { as: 'MANAGER', grant: 'refunds' },
          steps: [{ name: 'open', target: '#whoami', expectText: 'signed in as MANAGER+refunds' }] },
        { name: 'admin-again', path: '/whoami', signIn: { as: 'ADMIN' }, steps: [{ name: 'open', target: '#whoami', expectText: 'ADMIN' }] },
        { name: 'guest', path: '/whoami', signIn: false, steps: [{ name: 'open', target: '#whoami', expectText: 'signed in as nobody' }] },
      ]), [], { project: dir });
      assert.equal(r.code, 0, r.stderr + JSON.stringify(r.checks));
      assert.equal(received.filter(l => l === 'GET /dev-login').length, 2, received.join(', '));
      assert.deepEqual(fs.readdirSync(path.join(dir, '.toolbelt/ux')), [], 'session files left behind');
    });

    await check('without a dev login, form steps sign in, survive a form reset, and their state is deleted', async () => {
      const dir = project('signin-project', {
        signIn: {
          path: '/login',
          steps: [
            { name: 'email', action: 'fill', selector: '#email', value: 'ada@example.com' },
            { name: 'password', action: 'fill', selector: '#password', value: '{{env.UX_TEST_PASSWORD}}' },
            { name: 'submit', action: 'click', selector: '#go' },
          ],
          waitFor: '#welcome',
          allow: [{ method: 'POST', url: '/auth/login' }],
          stateFile: '.toolbelt/ux/session.json',
        },
      });
      process.env.UX_TEST_PASSWORD = 'secret';
      received.length = 0;
      const r = await run(matrix([
        { name: 'home', path: '/home', steps: [{ name: 'open', target: '#welcome' }] },
        { name: 'guest', path: '/login', signIn: false, steps: [{ name: 'open', target: '#f' }] },
      ]), [], { project: dir });
      assert.equal(r.code, 0, r.stderr + JSON.stringify(r.checks));
      assert.equal(received.filter(l => l === 'POST /auth/login').length, 1, received.join(', '));
      assert(!fs.existsSync(path.join(dir, '.toolbelt/ux/session.json')), 'session state left behind');
    });

    await check('setup creates real data once and its ids reach the pathway', async () => {
      const dir = project('setup-project', {
        // No call has produced estimate yet when the first one runs, so the header is left out there.
        setupHeaders: { 'X-Estimate': '{{estimate.id}}' },
        signIn: {
          path: '/login',
          steps: [
            { name: 'email', action: 'fill', selector: '#email', value: 'ada@example.com' },
            { name: 'password', action: 'fill', selector: '#password', value: 'secret' },
            { name: 'submit', action: 'click', selector: '#go' },
          ],
          waitFor: '#welcome',
          allow: [{ method: 'POST', url: '/auth/login' }],
        },
      });
      received.length = 0;
      const r = await run(matrix([{ name: 'estimate', path: '/estimates/{{estimate.id}}',
        steps: [{ name: 'open', target: '#lines', expectText: '$1,234.50' }] }], {
        setup: [{ name: 'estimate', method: 'POST', url: '/api/estimates', json: { lines: [{ label: 'Panel', amount: '$1,234.50' }] } }],
      }), [], { project: dir });
      assert.equal(r.code, 0, r.stderr + JSON.stringify(r.checks));
      assert.equal(received.filter(l => l === 'POST /api/estimates').length, 1, received.join(', '));
      assert.deepEqual(r.mech.setup.map(s => [s.method, s.url, s.status]), [['POST', '/api/estimates', 201]]);
    });

    await check('a blocked setup call stops the run before any setup call is sent', async () => {
      received.length = 0;
      const r = await run(matrix([{ name: 'inbox', path: '/inbox', steps: [{ name: 'open', target: '#title' }] }], {
        setup: [
          { name: 'estimate', method: 'POST', url: '/api/estimates', json: { lines: [] } },
          { name: 'mail', method: 'POST', url: '/api/estimates/{{estimate.id}}/send' },
        ],
      }));
      assert.equal(r.code, 2, r.stderr);
      assert.match(r.stderr, /blocked/);
      assert.deepEqual(received, []);
    });

    await check('the brief numbers images with absolute paths and carries the criteria', async () => {
      const r = await run(matrix([{ name: 'label', path: '/label', steps: [{ name: 'open', target: '#label', note: 'the button label' }] }],
        { criteria: ['The button reads its label in full.'] }));
      assert.equal(r.code, 0, r.stderr);
      const target = path.join(r.out, r.entries[0].files.target);
      assert(r.brief.includes(`Image 1: label-open-default-800-light`), r.brief);
      assert(r.brief.includes(target), r.brief);
      assert(r.brief.includes('The button reads its label in full.'));
      assert(r.brief.includes(path.join(r.out, 'review.md')));
    });

    await check('a running base URL is captured first and paired before/after in the brief', async () => {
      const base = makeServer(remotePort, 'Old label');
      const basePort = await listen(base);
      try {
        const r = await run(matrix([
          { name: 'label', path: '/label', steps: [{ name: 'open', target: '#label' }] },
          { name: 'inbox', path: '/inbox', steps: [{ name: 'open', target: '#title' }] },
        ]), ['--base-url', `http://127.0.0.1:${basePort}`]);
        assert.equal(r.code, 0, r.stderr);
        assert(fs.existsSync(path.join(r.out, 'before', 'label-open-default-800-light-target.png')));
        assert.equal(r.entries[0].targetDiff.status, 'changed');
        assert.match(r.brief, /Image 1: before label-open-default-800-light/);
        assert.match(r.brief, /Image 2: after label-open-default-800-light \(changed\)/);
        assert.equal(r.entries[1].targetDiff.status, 'unchanged');
        assert.match(r.brief, /## Unchanged\n\n- inbox-open-default-800-light/);
      } finally {
        await new Promise(resolve => base.close(resolve));
      }
    });

    await check('retakes write only the named shots, into a new folder only', async () => {
      const m = matrix([{ name: 'scroll', path: '/scroll', steps: [{ name: 'deep', target: '#deep' }, { name: 'tall', target: '#tall' }] }]);
      const r = await run(m, ['--shot', 'scroll/tall']);
      assert.equal(r.code, 0, r.stderr);
      assert.deepEqual(r.entries.map(e => e.step), ['tall']);
      const again = await run(m, ['--shot', 'scroll/tall'], { out: r.out });
      assert.equal(again.code, 2);
      const typo = await run(m, ['--shot', 'scroll/nope']);
      assert.equal(typo.code, 2);
    });

    await check('a running app is reused; a stopped one is started and stopped', async () => {
      const marker = path.join(root, 'started.txt');
      const appScript = path.join(root, 'app.cjs');
      fs.writeFileSync(appScript, 'require("fs").writeFileSync(process.argv[2], "x");' +
        'require("http").createServer((q,s)=>{s.writeHead(200,{"Content-Type":"text/html"});s.end("<main id=m>App</main>")})' +
        '.listen(Number(process.env.PORT),"127.0.0.1")');
      const dir = project('app-project', { app: { start: `node ${appScript} ${marker}` } });
      const reused = await run(matrix([{ name: 'inbox', path: '/inbox', steps: [{ name: 'open', target: '#title' }] }]), [], { project: dir });
      assert.equal(reused.code, 0, reused.stderr);
      assert(!fs.existsSync(marker), 'started an app although one was running');
      assert.equal(reused.mech.app, 'reused');
      const probe = http.createServer();
      await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
      const port = probe.address().port;
      await new Promise(resolve => probe.close(resolve));
      const started = await run({ ...matrix([{ name: 'app', path: '/', steps: [{ name: 'open', target: '#m' }] }]),
        baseUrl: `http://127.0.0.1:${port}` }, [], { project: dir });
      assert.equal(started.code, 0, started.stderr);
      assert(fs.existsSync(marker));
      assert.equal(started.mech.app, 'started');
      await new Promise(resolve => setTimeout(resolve, 300));
      const stillUp = await fetch(`http://127.0.0.1:${port}/`).then(() => true, () => false);
      assert.equal(stillUp, false, 'the started app was left running');
    });

    await check('a base ref is checked out, served, captured, and removed', async () => {
      const repo = path.join(root, 'repo');
      fs.mkdirSync(path.join(repo, '.toolbelt'), { recursive: true });
      const git = (...args) => execFileSync('git', ['-C', repo, ...args], { stdio: 'pipe' }).toString().trim();
      git('init', '-q');
      git('config', 'user.email', 't@example.com');
      git('config', 'user.name', 'T');
      const write = text => fs.writeFileSync(path.join(repo, 'app.cjs'),
        'require("http").createServer((q,s)=>{s.writeHead(200,{"Content-Type":"text/html"});' +
        `s.end("<main><button id=b style='width:140px;height:40px'>${text}</button></main>")})` +
        '.listen(Number(process.env.PORT),"127.0.0.1")');
      fs.writeFileSync(path.join(repo, '.toolbelt/ux-capture.json'), JSON.stringify({ app: { start: 'node app.cjs' } }));
      write('Old label');
      git('add', '.');
      git('commit', '-qm', 'base');
      const baseSha = git('rev-parse', 'HEAD');
      write('New label');
      const probe = http.createServer();
      await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
      const port = probe.address().port;
      await new Promise(resolve => probe.close(resolve));
      const r = await run({ ...matrix([{ name: 'b', path: '/', steps: [{ name: 'open', target: '#b' }] }]), baseUrl: `http://127.0.0.1:${port}` },
        ['--base-ref', baseSha], { project: repo });
      assert.equal(r.code, 0, r.stderr);
      assert.equal(r.entries[0].targetDiff.status, 'changed');
      assert.match(r.brief, /Image 1: before b-open-default-800-light/);
      assert.match(r.brief, /Image 2: after b-open-default-800-light/);
      assert.equal(git('worktree', 'list').split('\n').length, 1, 'temporary checkout left behind');
    });

    await check('a pointer path catches a hover toolbar that vanishes across the gap', async () => {
      const steps = [{ name: 'reach', action: 'pointer', path: [
        { move: '#row' },
        { move: '#edit', steps: 15, keepVisible: '#tools' },
        { click: '#edit' },
      ], target: '#out', expectText: 'edited' }];
      const bug = await run(matrix([{ name: 'hover', path: '/hover-bug', steps }]));
      assert.equal(bug.code, 1, bug.stderr);
      assert.match(bug.mech.notReached[0].reason, /#tools disappeared/);
      const ok = await run(matrix([{ name: 'hover', path: '/hover-ok', steps }]));
      assert.equal(ok.code, 0, ok.stderr + JSON.stringify(ok.checks));
    });

    await check('a redirect from an allowed write is guarded again', async () => {
      const dir = project('hop-project', { guard: { allow: [{ method: 'POST', url: '/api/hop' }] } });
      received.length = 0;
      const r = await run(matrix([{ name: 'hop', path: '/hop', steps: [{ name: 'open', target: '#hop', expectText: 'hop blocked' }] }]),
        [], { project: dir });
      assert.equal(r.code, 0, r.stderr + JSON.stringify(r.checks));
      assert(received.includes('POST /api/hop'), received.join(', '));
      assert(!received.includes('POST /api/charge'), received.join(', '));
      assert(r.mech.requests.some(q => q.kind === 'aborted' && q.url.endsWith('/api/charge')), JSON.stringify(r.mech.requests));
    });

    await check('a setup call that redirects stops the run without following it', async () => {
      received.length = 0;
      const r = await run(matrix([{ name: 'inbox', path: '/inbox', steps: [{ name: 'open', target: '#title' }] }], {
        setup: [{ name: 'hop', method: 'POST', url: '/api/hop' }],
      }));
      assert.equal(r.code, 2, r.stderr);
      assert.match(r.stderr, /redirect/);
      assert(!received.includes('POST /api/charge'), received.join(', '));
    });

    await check('a target covered by another element is not reached', async () => {
      const r = await run(matrix([{ name: 'covered', path: '/covered', steps: [{ name: 'open', target: '#card' }] }]));
      assert.equal(r.code, 1, r.stderr);
      assert.match(r.mech.notReached[0].reason, /covered by DIV#overlay/);
      assert.equal(fs.readdirSync(r.out).filter(f => f.endsWith('.png')).length, 0);
    });

    await check('a redirect hop that matches a fixture is answered locally', async () => {
      const dir = project('start-project', { guard: { allow: [{ method: 'POST', url: '/api/start' }, { method: 'POST', url: '/api/create' }] } });
      received.length = 0;
      const r = await run(matrix([{ name: 'start', path: '/start', steps: [{ name: 'open', target: '#out', expectText: 'got 99' }],
        fixtures: [{ method: 'POST', url: '/api/create', status: 201, json: { id: 99 } }] }]), [], { project: dir });
      assert.equal(r.code, 0, r.stderr + JSON.stringify(r.checks));
      assert(!received.includes('POST /api/create'), received.join(', '));
    });

    await check('a write redirected to another origin is aborted there', async () => {
      const dir = project('xhop-project', { guard: { allow: [{ method: 'POST', url: '/api/xhop' }, { method: 'POST', url: '**/api/charge' }] } });
      received.length = 0;
      const r = await run(matrix([{ name: 'xhop', path: '/xhop', steps: [{ name: 'open', target: '#out', expectText: 'xhop blocked' }] }]),
        [], { project: dir });
      assert.equal(r.code, 0, r.stderr + JSON.stringify(r.checks));
      assert(!received.includes('POST /api/charge'), received.join(', '));
    });

    await check('relative redirects resolve against the hop that sent them', async () => {
      const dir = project('rel-project', { guard: { allow: [{ method: 'POST', url: '/api/rel' }, { method: 'POST', url: '/other/hop' }] } });
      const r = await run(matrix([
        { name: 'rel', path: '/rel', steps: [{ name: 'open', target: '#out', expectText: 'got other' }] },
        { name: 'form', path: '/rel-form', steps: [{ name: 'open', target: 'body', expectText: '"other"' }] },
      ]), [], { project: dir });
      assert.equal(r.code, 0, r.stderr + JSON.stringify(r.checks));
    });

    await check('an opaque overlay that ignores the pointer still covers the target', async () => {
      const ghost = await run(matrix([{ name: 'ghost', path: '/ghost-cover', steps: [{ name: 'open', target: '#card' }] }]));
      assert.equal(ghost.code, 1, ghost.stderr);
      assert.match(ghost.mech.notReached[0].reason, /covered by DIV#ghost/);
      const veil = await run(matrix([{ name: 'veil', path: '/pseudo-cover', steps: [{ name: 'open', target: '#card' }] }]));
      assert.equal(veil.code, 1, veil.stderr);
      assert.match(veil.mech.notReached[0].reason, /covered by DIV#veil/);
      const toasts = await run(matrix([{ name: 'toasts', path: '/toast-layer', steps: [{ name: 'open', target: '#card' }] }]));
      assert.equal(toasts.code, 0, toasts.stderr + JSON.stringify(toasts.checks));
    });

    await check('a shot the base could not reach is listed as before in the brief', async () => {
      const base = makeServer(remotePort);
      const basePort = await listen(base);
      try {
        // Base-only failures are reported but never fail the run: a new screen has no base.
        const missing = await run(matrix([{ name: 'new', path: '/label', steps: [{ name: 'open', target: '#label' }] }]),
          ['--base-url', `http://127.0.0.1:${basePort}/nowhere-prefix`]);
        assert.notEqual(missing.code, 2, missing.stderr);
        assert.match(missing.brief, /## Not reached\n\n- before new-open-default-800-light: /);
      } finally {
        await new Promise(resolve => base.close(resolve));
      }
    });

    await check('an app whose start command backgrounds its server is still stopped', async () => {
      const appScript = path.join(root, 'bg-app.cjs');
      fs.writeFileSync(appScript, 'require("http").createServer((q,s)=>{s.writeHead(200,{"Content-Type":"text/html"});s.end("<main id=m>App</main>")})' +
        '.listen(Number(process.env.PORT),"127.0.0.1")');
      const dir = project('bg-app-project', { app: { start: `node ${appScript} &` } });
      const probe = http.createServer();
      await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
      const port = probe.address().port;
      await new Promise(resolve => probe.close(resolve));
      const r = await run({ ...matrix([{ name: 'app', path: '/', steps: [{ name: 'open', target: '#m' }] }]), baseUrl: `http://127.0.0.1:${port}` },
        [], { project: dir });
      assert.equal(r.code, 0, r.stderr);
      await new Promise(resolve => setTimeout(resolve, 300));
      const stillUp = await fetch(`http://127.0.0.1:${port}/`).then(() => true, () => false);
      assert.equal(stillUp, false, 'the backgrounded server was left running');
    });

    await check('--check validates the matrix and config without a browser', async () => {
      const good = await run(matrix([{ name: 'a', path: '/inbox', steps: [{ name: 'open', target: '#title' }] }]), ['--check']);
      assert.equal(good.code, 0, good.stderr);
      const bad = await run(matrix([{ name: 'a', path: '/inbox', steps: [{ name: 'open' }] }]), ['--check']);
      assert.equal(bad.code, 2);
      assert.match(bad.stderr, /target/);
      const offSwitch = project('off-switch', { guard: { allow: [{ method: 'POST', url: '/**' }] } });
      const loose = await run(matrix([{ name: 'a', path: '/inbox', steps: [{ name: 'open', target: '#title' }] }]), ['--check'],
        { project: offSwitch });
      assert.equal(loose.code, 2);
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await new Promise(resolve => remote.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
  if (failures) process.exitCode = 1;
  else console.log('PASS');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
