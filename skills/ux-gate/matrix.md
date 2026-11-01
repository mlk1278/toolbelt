# Capture matrix

Read this when writing a matrix or shot list for `scripts/ux-capture`. Run it from the consuming project with the absolute script path. Paths on the command line resolve from the working directory; fixture files and a relative `storageState` resolve from `--project-root`. Check a matrix without a browser with `--check`.

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
    "fixtures": [{"url": "/api/settings/branding", "json": {"logoUrl": null}}],
    "steps": [
      {"name": "open", "target": "[data-testid=estimate-totals]", "expectText": "$1,234.50", "note": "totals with no logo"},
      {"name": "edit-focus", "action": "press", "key": "Tab", "expectFocus": "button[name=edit]", "capture": false}
    ]
  }]
}
```

`pathways` must be nonempty, and each pathway needs a unique `name`, a route `path`, and nonempty `steps`. The app URL comes from `--url`, the matrix `baseUrl`, or the project config's `app.url`, in that order. Names and state labels use letters, digits, underscores, or hyphens, and output tags are unique. Defaults are light and dark themes, and viewports 375×812 at DPR 2, 768×1024 at DPR 1, and 1440×900 at DPR 1; override them with the project's supported set. An explicitly empty theme or viewport list is an error.

## Shots and targets

A step that captures is a shot, named `<pathway>/<step>`. Every shot names a `target`: a selector for the whole component a reviewer needs to judge the claimed state. Pick the totals card, not the logo tile inside it; for a small change, also list that piece under `crops`. The tool waits up to 15 seconds for the first visible, sized match containing `expectText`, scrolls it into view (nested scroll containers included), and writes `<tag>-target.png` cropped to it, plus `<tag>.png`, the viewport around it. A target taller than the viewport is shot in a viewport grown to fit. Its box, match count, and whether a scroll container clips it are recorded.

When no match is found, no match has a size, none contains `expectText`, or a painted element covers it, even one that ignores the pointer, the shot is **not reached**: no image is written, the reason is recorded, and the run exits 1. A failed action stops its pathway, and every later shot in that pathway is not reached.

Capture a screen the changed surface has to match as its own pathway, not a `referenceScreens` entry, since reaching its state can take steps. Name it with the `match-` prefix only when the diff changes none of the components, styles, tokens, or shared code, such as a formatter, data hook, or fixture, that decide what it renders. Its stills are then references, and the gate runner ignores its mechanical results. Otherwise name it like any changed pathway.

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

A `pointer` path moves in small steps with pauses, so hover timers see a real pointer crossing the page. `keepVisible` fails the step at the first position where that element is hidden; `click` fails unless its element is under the pointer. Use it to prove hover, drag, tap areas, and anything that depends on what is under the pointer; a jsdom test cannot see hit areas.

Crops and reduced-motion frames replay earlier actions in fresh browser contexts, so seed resettable data for mutating pathways.

## Requests

Every browser context the tool creates guards requests, and nothing turns the guard off. A GET passes. A request matching a fixture is answered locally and never reaches the server. A request matching a project allowance passes; a redirect that keeps it a write must stay on the same origin and meet the same rules, and one that turns it into a GET is followed by the browser, without fixtures. Everything else, WebSockets included, is aborted. Every answered, allowed, or aborted request is listed in `mechanical.json` and the brief.

A fixture is `{"method": "GET", "url": "/api/flags", "status": 200, "json": {...}}`, or `"file"` in place of `json`. `method` defaults to GET and `status` to 200. Put fixtures at the matrix level or on a pathway, which wins. A `/path` pattern matches the URL path, `**/path` or a full URL also matches the origin, `*` stays within one path segment, `**` crosses segments, and the query counts only when the pattern contains `?`. Cross-origin fixtures get CORS headers. A fixture nothing requested is a `should` finding: read the real request URL in the request log.

`setup` runs a short list of API calls once per run, before capture, through the signed-in session: `{"name", "method", "url", "json", "headers"}`. `url` is a path on the project's `apiBase`, or on the app URL. Each response body is saved under the call's name; `{{name.field}}` inserts a value into later setup calls, pathway paths, selectors, and fixtures. Setup calls whose path matches the block list never run, and one blocked call stops the run before any setup call is sent. A setup call that redirects stops the run without following it. The default list blocks paths containing send, email, sms, text-message, notif, pay, charge, refund, stripe, sync, quickbooks, qbo, xero, webhook, or invit. Setup creates real data; the brief lists it.

## Project config

`.toolbelt/ux-capture.json` in the project root holds what every capture in that project shares. Every field is optional; `{{env.NAME}}` reads an environment variable.

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

- `app`: when nothing answers at the app URL, `start` runs with `PORT` set to the URL's port and is stopped at the end. An app already answering is reused and left running.
- `signIn`: signs in through the app's own dev login. The tool opens `path` with `params` as query parameters, such as `/?devAs=ADMIN`, waits for `waitFor`, and saves the session to `stateFile` (default `.toolbelt/ux/session.json`). A pathway's `"signIn": {"devAs": "MANAGER"}` overrides those parameters, and `"signIn": false` runs it signed out. Each identity signs in once; session files are deleted when the run ends. `allow` passes any write the dev login makes. Only for an app with no dev login, `steps` fill its login form, re-filling fields the form resets.
- `captureCss`: applied to every page the tool opens.
- `guard.allow`: allowances for every context. Each names one method and a URL with a literal path segment.
- `apiBase` and `setupHeaders`: where setup paths resolve, and headers sent on every setup call. A header whose template has no value yet is left out, so a first `GET /auth/csrf` call named `csrf` can supply the token for the rest.
- `setupBlock`: replaces the default block list, as case-insensitive regexes.

## Base, retakes, and output

`--base-url <url>` captures the same shots first against a running base app; `--base-ref <ref>` checks out `ref` in a temporary directory, runs `app.install` there with `UX_CAPTURE_SOURCE_ROOT` set, serves it with `app.start` on a free port, and removes it afterwards. Either way the base images land in `<out>/before/`, and the brief pairs each before image with its after image. Base shots not reached and base requests are listed as `before` and never change the exit code, because a new screen has no base. `--baseline <dir>` diffs against an earlier run's stills instead; a missing baseline still is `new`.

`--shot <pathway/step>` is repeatable and retakes only those shots into a new `--out` folder, replaying earlier steps without images. `--pathway <name>` limits a run to whole pathways. `--video` records local video, best effort, never changing the exit code.

`brief.md` is the reviewer handoff: numbered images with absolute paths (before/after pairs in base mode; pixel-identical shots listed apart), the criteria, the not-reached list, findings, target measurements, the request log, and setup calls. `mechanical.json` records the same per capture. Exit 0 means no findings at `should` or above, 1 means findings or a shot not reached, and 2 means the capture cannot run. A missing optional axe module is `unavailable`; a failed installed scan or requested capture artifact is a blocker.
