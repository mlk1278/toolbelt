# Capture matrix

Read this when writing a matrix or shot list for `scripts/ux-capture`. Run the script from the consuming project using its absolute path. Command-line paths resolve from the current working directory; fixture files and relative `storageState` paths resolve from `--project-root`. Validate a matrix without launching a browser using `--check`.

```json
{
  "baseUrl": "http://localhost:3000",
  "themes": ["light", "dark"],
  "viewports": [{"width": 1440, "height": 900, "dpr": 1}],
  "criteria": ["The totals card shows the $1,234.50 line and the tax row."],
  "setup": [{"name": "estimate", "method": "POST", "url": "/api/estimates", "json": {"lines": [{"amount": 1234.5}]}}],
  "pathways": [{
    "name": "estimate-totals",
    "path": "/estimates/{{estimate.id}}",
    "fixtures": [{"url": "/api/settings/branding", "status": 503, "json": {}}],
    "steps": [
      {"name": "open", "target": "[data-testid=estimate-totals]", "expectText": "$1,234.50", "note": "totals without branding"},
      {"name": "edit-focus", "action": "press", "key": "Tab", "expectFocus": "button[name=edit]", "capture": false}
    ]
  }]
}
```

`pathways` must be nonempty. Each pathway needs a unique `name`, a route `path`, and nonempty `steps`. The app URL comes from `--url`, the matrix `baseUrl`, or the project config's `app.url`, checked in that order. Names and state labels use letters, digits, underscores, or hyphens, and output tags must be unique.

By default, captures run across light and dark themes at three viewports: 375×812 at DPR 2, 768×1024 at DPR 1, and 1440×900 at DPR 1. Override these with the project's supported set. Passing an explicit empty theme or viewport list is an error.

## Shots and targets

A step that captures is a shot, named `<pathway>/<step>`. Every shot names a `target`, which is a selector for the whole component a reviewer needs to judge the claimed state. Pick the totals card rather than the logo tile inside it; for a small change, list the smaller piece under `crops` as well.

The tool waits up to 15 seconds for the first visible, sized match containing `expectText`, scrolls it into view including inside nested scroll containers, and writes two images: `<tag>-target.png` cropped to the target, and `<tag>.png` showing the viewport around it. If a target is taller than the viewport, the tool grows the viewport to fit. It records the target's bounding box, match count, and whether a scroll container clips it.

When no match is found, no match has a size, none contains `expectText`, or any painted element covers the target, even one that ignores the pointer, the shot is marked **not reached**. The tool writes no image, records the reason, and exits with code 1. A failed action stops its pathway and marks every later shot in that pathway as not reached.

Capture a screen the changed surface has to match as its own pathway rather than a `referenceScreens` entry, because reaching its state can take steps. Use the `match-` prefix only when the diff changes none of the components, styles, tokens, or shared code, such as a formatter, data hook, or fixture, that decide what it renders. Its stills are then treated as references, and the gate runner ignores their mechanical results. Otherwise name it like any changed pathway.

| Step field | Meaning |
|---|---|
| `name` | Unique step label within its pathway. |
| `target` | Required on every shot: selector of the component the shot shows. |
| `expectText` | Text the target must contain, so a shot cannot show the wrong section. |
| `note` | What the shot proves, printed beside its image in the brief. |
| `state` | Output label, default `default`. It creates no UI state. |
| `action` | `click`, `hover`, `focus`, `scroll`, `fill`, `press`, or `pointer`; omit for capture or assertions only. |
| `selector` | Playwright selector for the action. Required except for page-level `press` and `pointer`. |
| `value` / `key` | String for `fill` (re-filled when the page resets it) / key combination for `press`, such as `Tab` or `Escape`. |
| `path` | `pointer` moves, in order: `{"move": sel, "steps": 10, "keepVisible": sel}`, `{"click": sel}`, `{"down": true}`, `{"up": true}`. |
| `expectFocus` | CSS selector that must match the active element after the action. |
| `waitFor` | Playwright selector that must become visible before capture. |
| `capture` | Default true. False keeps actions and checks but takes no images and needs no target. |
| `fullPage` | True makes `<tag>.png` the full page. |
| `crops` | Extra component selectors captured at DPR 2. |
| `motion` | True adds normal/reduced-motion frames to a filmstrip on full runs. |

A `pointer` path moves in small steps with pauses so hover timers see a real pointer crossing the page. `keepVisible` fails the step at the first position where that element becomes hidden, and `click` fails unless its element is under the pointer. Use `pointer` to prove hover, drag, tap areas, and anything else that depends on what sits under the pointer, because a jsdom test cannot see hit areas.

Crops and reduced-motion frames replay earlier actions in fresh browser contexts, so seed resettable data for mutating pathways.

## Requests

Every browser context the tool creates guards network requests, and nothing turns the guard off. GET requests pass. Any request matching a fixture is answered locally and never reaches the server. Any request matching a project allowance passes. A redirect that stays a write must remain on the same origin and satisfy the same rules, while a redirect that turns into a GET is followed by the browser without fixtures. Everything else, including WebSockets, is aborted. `mechanical.json` and the brief list every answered, allowed, or aborted request.

A fixture has the shape `{"method": "GET", "url": "/api/flags", "status": 200, "json": {...}}`, or uses `"file"` instead of `"json"`. `method` defaults to GET and `status` defaults to 200. You can place fixtures at the matrix level or on a pathway. Pathway fixtures override matrix-level ones. A `/path` pattern matches the URL path, while `**/path` or a full URL also matches the origin. `*` stays within one path segment, `**` crosses segments, and the query string counts only when the pattern contains `?`. Cross-origin fixtures receive CORS headers. A fixture that nothing requested produces a `should` finding; check the real request URL in the request log.

`setup` runs a short list of API calls once per run, before capture, through the signed-in session, using the shape `{"name", "method", "url", "json", "headers"}`. `url` resolves against the project's `apiBase` or the app URL. Each response body is saved under its call name, and `{{name.field}}` inserts values into later setup calls, pathway paths, selectors, and fixtures. Setup calls whose path matches the block list never run, and a single blocked call stops the run before any setup call fires. A setup call that redirects stops the run without following the redirect. The default block list matches paths containing send, email, sms, text-message, notif, pay, charge, refund, stripe, sync, quickbooks, qbo, xero, webhook, or invit. Setup creates real data, which the brief lists.

## Project config

`.toolbelt/ux-capture.json` in the project root holds settings shared by every capture in that project. Every field is optional, and `{{env.NAME}}` reads an environment variable.

```json
{
  "app": {"url": "http://localhost:3000", "start": "PORT=$PORT pnpm dev", "install": "pnpm install --frozen-lockfile", "readyPath": "/login"},
  "signIn": {"path": "/", "params": {"devAs": "ADMIN"}, "waitFor": "[data-testid=app-shell]"},
  "captureCss": "[class*=sticky], header { position: static !important }",
  "guard": {"allow": [{"method": "POST", "url": "/api/auth/refresh"}]},
  "apiBase": "http://localhost:4000",
  "setupHeaders": {"X-CSRF-Token": "{{csrf.csrfToken}}"}
}
```

- `app`: when nothing answers at the app URL, `start` runs with `PORT` set to the URL's port and stops when capture finishes. An app already answering is reused and left running.
- `signIn`: signs in through the app's own dev login. The tool opens `path` with `params` as query parameters, such as `/?devAs=ADMIN`, waits for `waitFor`, and saves the session to `stateFile`, which defaults to `.toolbelt/ux/session.json`. A pathway's `"signIn": {"devAs": "MANAGER"}` overrides those parameters, and `"signIn": false` runs it signed out. Each identity signs in once, and session files are deleted when the run ends. `allow` lets through any write the dev login makes. Only for an app with no dev login, `steps` fills its login form, re-filling fields the form resets.
- `captureCss`: applied to every page the tool opens.
- `guard.allow`: request allowances applied to every context. Each names one HTTP method and a URL with a literal path segment.
- `apiBase` and `setupHeaders`: where setup paths resolve, and headers sent on every setup call. Any header whose template has no value yet is omitted, so an initial `GET /auth/csrf` call named `csrf` can supply the token for later calls.
- `setupBlock`: replaces the default block list with case-insensitive regexes.

## Base, retakes, and output

`--base-url <url>` captures the same shots first against a running base app. `--base-ref <ref>` checks out `ref` in a temporary directory, runs `app.install` there with `UX_CAPTURE_SOURCE_ROOT` set, serves it with `app.start` on a free port, and cleans up afterwards. Either way, base images land in `<out>/before/` and the brief pairs each before image with its after image. Base shots not reached and base requests are listed as `before` and never change the exit code, because a new screen has no base. `--baseline <dir>` diffs against an earlier run's stills instead, marking any missing baseline still as `new`.

`--shot <pathway/step>` is repeatable and retakes only those shots into a new `--out` folder, replaying earlier steps without saving their images. `--pathway <name>` limits a run to whole pathways. `--video` records local video on a best-effort basis and never changes the exit code.

`brief.md` is the reviewer handoff. It contains numbered images with absolute paths. In base mode it pairs before and after images and lists pixel-identical shots separately. It also holds the criteria, not-reached list, findings, target measurements, request log, and setup calls. `mechanical.json` records the same data per capture. Exit code 0 means no findings at `should` or above, 1 means findings or a shot not reached, and 2 means capture could not run. A missing optional axe module reports `unavailable`; a failed installed scan or a missing requested capture artifact is a blocker.
