# Mobile Polish + PWA/Offline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Remaked UI `2026.09.4` with a genuinely usable phone layout, an adapter-backed sticky character summary, collapsible legacy cards, installable PWA metadata, reliable offline boot, and a non-blocking update flow.

**Status:** Shipped in PR #5 (`0e6cd1b`) after exact-head CI, downloaded Pages-artifact inspection, production deployment and live online/offline Chromium verification.

**Architecture:** Keep the Legacy 2.00 engine and serialized state untouched. Add Modern-only mobile decoration through `modern/mobile.js`/`mobile.css`, reading state only through the existing adapter; add PWA install/update UX through `modern/pwa.js`; generate a root-scoped `service-worker.js` from a Modern source template during the deterministic Pages build. Precache the functional calculator core and small interface assets, runtime-cache other same-origin GET assets, and never cache external/GitHub API traffic.

**Tech Stack:** Static HTML/CSS/JavaScript, existing Legacy 2.00 JavaScript engine, Python 3 standard library build tooling, Playwright, GitHub Actions, GitHub Pages, Web App Manifest, Service Worker API.

**Spec:** `docs/superpowers/specs/2026-09-27-pandora-saga-modernization-design.md`

## Global Constraints

- `/` remains the primary Modern Mode; `/legacy/` remains the preservation/reference route.
- Legacy formulas/data remain the calculation source of truth; Phase 4 must not modify `index.html`, `js/**`, `css/**`, or `image/**` in the preservation source tree.
- Mobile is not a shrunken desktop page: no body-level horizontal clipping, no hover dependency for essential actions, and touch targets are approximately modern mobile size.
- The compact mobile summary reads metadata/stat values through `window.PandoraRemaked.adapter`; it never creates a second state model or writes Legacy arrays directly.
- Collapsing/expanding legacy cards is presentational only and does not change serialized build state.
- GitHub Pages remains the only required hosting; no database, Cloudflare, account system, or external PWA service is introduced.
- The service worker caches same-origin GET resources only. It must not cache GitHub API requests or other external web content.
- A new service worker must never force-reload an in-progress build. Updates are surfaced as `New version available — Reload`; reload happens only after the player presses the action.
- Before an update-triggered reload, call `window.PandoraRemaked.builds.flushAutosave()` when available.
- PWA source files are Modern-owned. The built root `service-worker.js` may control `/legacy/`, but `/legacy/index.html` must not load Modern/PWA scripts.
- Release version for this phase is Remaked UI `2026.09.4`.

## Review Focus

1. **390px/phone overflow:** the shell, sticky summary and decorated equipment rows must not increase `document.documentElement.scrollWidth`; internal scroll remains allowed only for data tables where explicitly designed.
2. **Legacy-state safety:** summary refresh, card collapse and equipment-row decoration must leave `adapter.serialize()` byte-for-byte unchanged.
3. **Cold/offline boot:** after service-worker installation and control, turning the browser offline and reloading `/` must still render Modern shell and expose the Legacy `Store()` calculation runtime.
4. **Update safety:** an installed replacement worker may show a notice, but must not call `location.reload()` before the player activates the Reload action; the action flushes autosave before asking the waiting worker to activate.
5. **Cache scope/failure:** failed service-worker registration, unavailable Cache API, or a missing runtime-cached optional item icon must not make the online calculator unusable.

---

### Task 1: Adapter-backed mobile summary, collapsible cards, and equipment-row reflow

**Files:**
- Create: `modern/mobile.js`
- Create: `modern/mobile.css`
- Modify: `scripts/build_pages.py`
- Modify: `tests/test_build_pages.py`
- Create: `tests/ui/mobile-polish.spec.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/feature-ci.yml`

**Interfaces:**
- Consumes: `PandoraRemaked.adapter.readCharacterMetadata()`, `PandoraRemaked.adapter.readCalculatedSummary()`, existing Legacy `#body`, `.sub_win > .head`, and `select[id^="SelEquip_"]` DOM.
- Produces: `PandoraRemaked.mobile = { init(), refreshSummary(), decorateCollapsibles(), decorateEquipmentRows() }`; `[data-remaked-mobile-summary]`; `[data-remaked-collapse-toggle]`; `[data-remaked-equipment-row]` / `[data-remaked-equipment-line]` presentation hooks.

- [ ] **Step 1: Write the failing mobile behavior tests**

In `tests/ui/mobile-polish.spec.mjs`, add contracts that at `390×844`:
- `[data-remaked-mobile-summary]` is visible and displays race/job/level plus LP/HP, Physical ATK and DEF values obtained from adapter projections;
- changing a Legacy control updates the sticky summary without changing the serialized payload beyond that intentional control change;
- a decorated `.sub_win > .head` gets a focusable `[data-remaked-collapse-toggle]` with correct `aria-expanded`; collapsing and expanding leaves `adapter.serialize()` unchanged;
- an equipment row containing `SelEquip_0_0` is decorated into a mobile grid, the primary item and Soul fields span the row, and selects remain reachable;
- Modern nav/language/discovery/collapse controls have a rendered height of at least `40px` on the phone viewport;
- `document.documentElement.scrollWidth <= clientWidth + 1`.

- [ ] **Step 2: Run the targeted suite and verify RED**

Run: `npx playwright test tests/ui/mobile-polish.spec.mjs`

Expected: FAIL because `modern/mobile.js`, the sticky summary and mobile decoration hooks do not exist.

- [ ] **Step 3: Implement `modern/mobile.js`**

Implement:
- `refreshSummary()` by calling adapter metadata/summary readers and rendering only the fields `lp`, `physicalAttack`, and `defense` plus race/job/level;
- a debounced `MutationObserver` on `#body` that only triggers adapter reads and summary re-rendering;
- `decorateCollapsibles()` only for `.sub_win` nodes with a direct `.head`; keep every section expanded by default and append a disclosure button without replacing legacy headings;
- `decorateEquipmentRows()` by locating `select[id^="SelEquip_"]`, annotating the inner field `<ul>` and containing line `<ul>`, and classifying field `0` as the main item, `4..6` as Soul fields, and other sub-fields as modifiers;
- idempotent `init()` so rerunning it never duplicates controls.

Do not write `Status`, `Flag`, `EquipOpt`, `Skill`, or other Legacy state arrays.

- [ ] **Step 4: Implement `modern/mobile.css`**

At phone widths (`max-width: 620px`):
- make `[data-remaked-mobile-summary]` sticky and compact, with `position: sticky`, a small top offset and a z-index below dialogs;
- render decorated equipment lines as a label + fluid content grid; make the inner equipment fields a two-column grid; main item and Soul fields span both columns; override legacy inline widths only inside annotated rows;
- raise essential Modern control heights to at least `40px`;
- hide collapsed card content while preserving its `.head` and disclosure control;
- never set body or shell widths larger than the viewport.

Above the phone breakpoint, hide the compact summary and collapse controls and leave legacy card/equipment presentation unchanged.

- [ ] **Step 5: Wire mobile assets through the deterministic builder**

In `scripts/build_pages.py`:
- require/copy `modern/mobile.js` and `modern/mobile.css`;
- inject `mobile.css` after the existing Modern component styles;
- load `mobile.js` after `builds.js`/`compare.js` and before `pwa.js` once Task 3 exists;
- keep `/legacy/index.html` free of all Modern mobile references.

Update `tests/test_build_pages.py` to assert one Modern reference, deterministic order, copied assets, and zero Legacy references.

- [ ] **Step 6: Add the mobile suite to normal CI and verify GREEN**

Add `test:ui:mobile` and include `tests/ui/mobile-polish.spec.mjs` in `test:ui:ci`; add `node --check modern/mobile.js` to Feature CI.

Run: `python -m unittest discover -s tests -v && npx playwright test tests/ui/mobile-polish.spec.mjs tests/ui/modern-foundation.spec.mjs`

Expected: all tests PASS; existing foundation/mobile-overflow contracts remain green.

- [ ] **Step 7: Commit Task 1**

Commit message: `feat: add adapter-backed mobile polish`

---

### Task 2: Web App Manifest, install icons, and deterministic root service worker

**Files:**
- Create: `modern/manifest.webmanifest`
- Create: `modern/icon-192.svg`
- Create: `modern/icon-512.svg`
- Create: `modern/service-worker.js`
- Modify: `scripts/build_pages.py`
- Modify: `tests/test_build_pages.py`
- Create: `tests/test_pwa_build.py`

**Interfaces:**
- Consumes: `PandoraRemakedVersion.ui` from `modern/version.js`; generated `_site` tree; existing root `css/**`, `js/**`, `image/interface/**`; matching `legacy/css/**`, `legacy/js/**`, `legacy/image/interface/**`.
- Produces: published `./modern/manifest.webmanifest`, scalable 192/512 install icons, and root-scoped `_site/service-worker.js` whose cache version matches Remaked UI.

- [ ] **Step 1: Write failing manifest/service-worker build tests**

Add Python tests asserting:
- Modern `index.html` links `./modern/manifest.webmanifest` and contains theme color `#669b36` plus background color `#f4f6ed` metadata;
- manifest name is `Pandora Saga Simulator — Remaked`, short name is `Pandora Simulator`, `display` is `standalone`, `start_url`/`scope` resolve to the repository Pages root, and both 192/512 icons are declared;
- build emits `_site/service-worker.js` at the Pages root, not only under `/modern/`;
- generated cache name contains `2026.09.4`;
- precache includes `/index.html`, root Legacy engine `css/**` + `js/**`, `image/interface/**`, required Modern assets, `/legacy/index.html`, and matching Legacy core `css/**` + `js/**` + `image/interface/**`;
- the initial precache deliberately excludes bulk `image/icon/**` item icons;
- generated service-worker source contains no external `https://`/GitHub API cache targets.

- [ ] **Step 2: Run Python tests and verify RED**

Run: `python -m unittest tests.test_pwa_build tests.test_build_pages -v`

Expected: FAIL because manifest/icons/service-worker output are absent.

- [ ] **Step 3: Add manifest and install icons**

Create a GitHub-Pages-subpath-safe manifest served at `./modern/manifest.webmanifest` with `start_url: "../"`, `scope: "../"`, `display: "standalone"`, theme `#669b36`, background `#f4f6ed`, and SVG icons declared at exact `192x192` and `512x512` sizes with `purpose: "any maskable"`.

Use simple project-owned green/cream/gold geometric marks derived from the existing Remaked palette; do not reuse or claim official Pandora Saga artwork.

- [ ] **Step 4: Implement root service-worker template**

`modern/service-worker.js` is a source template with build placeholders for cache version and precache URLs. Runtime behavior:
- install: open the current versioned cache and `addAll(PRECACHE_URLS)`; do **not** call `skipWaiting()` automatically;
- activate: remove older `pandora-remaked-*` caches and `clients.claim()`;
- fetch: ignore non-GET and cross-origin requests; for navigations use network-first with cached-page fallback; for same-origin static assets use cache-first and add successful responses to the current cache;
- message `{ type: 'SKIP_WAITING' }`: call `self.skipWaiting()`.

- [ ] **Step 5: Generate `service-worker.js` deterministically in `build_pages.py`**

Add helpers that:
- read UI version from `modern/version.js` and fail clearly if it is missing;
- collect a sorted precache set from root/Legacy core JS+CSS, `image/interface/**`, Modern required runtime/PWA assets, root/Legacy index pages, favicon/hero/manifest/icons;
- normalize URLs as relative scope URLs beginning `./`;
- replace template placeholders and write `_site/service-worker.js`;
- remove the copied Modern service-worker template from `_site/modern/` so only the root-scoped runtime worker is published.

- [ ] **Step 6: Run build tests and verify GREEN**

Run: `python -m unittest tests.test_pwa_build tests.test_build_pages -v && python3 scripts/build_pages.py --output _site`

Expected: PASS; `_site/service-worker.js` exists and manifest/icon references resolve locally.

- [ ] **Step 7: Commit Task 2**

Commit message: `feat: build root-scoped offline PWA assets`

---

### Task 3: Install App and non-blocking update UX

**Files:**
- Create: `modern/pwa.js`
- Create: `modern/pwa.css`
- Modify: `modern/app-shell.js`
- Modify: `scripts/build_pages.py`
- Modify: `tests/test_build_pages.py`
- Create: `tests/ui/pwa-ui.spec.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/feature-ci.yml`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: `navigator.serviceWorker`, `beforeinstallprompt`, `appinstalled`, `PandoraRemaked.builds.flushAutosave()`, app-shell `[data-remaked-pwa-actions]` mount.
- Produces: `PandoraRemaked.pwa = { init(), register(), captureInstallPrompt(event), showUpdateNotice(waitingWorker) }`; `[data-remaked-install]`; `[data-remaked-update-notice]`; `[data-remaked-update-reload]`.

- [ ] **Step 1: Write failing install/update UI tests**

In `tests/ui/pwa-ui.spec.mjs`, assert:
- app shell contains a PWA action mount but Install App is hidden before an install prompt is captured;
- `captureInstallPrompt(fakeEvent)` calls `preventDefault`, exposes Install App, and clicking it invokes the captured one-shot `prompt()` without changing `adapter.serialize()`;
- `showUpdateNotice(fakeWaitingWorker)` renders exactly `New version available — Reload` without navigating/reloading immediately;
- clicking Reload calls `builds.flushAutosave()` before `fakeWaitingWorker.postMessage({type:'SKIP_WAITING'})`;
- notice is keyboard reachable and `aria-live="polite"`;
- a registration failure is handled without removing or disabling the calculator shell.

- [ ] **Step 2: Run PWA UI tests and verify RED**

Run: `npx playwright test tests/ui/pwa-ui.spec.mjs`

Expected: FAIL because `PandoraRemaked.pwa` and PWA controls are absent.

- [ ] **Step 3: Add an app-shell PWA mount**

In `modern/app-shell.js`, append an empty `[data-remaked-pwa-actions]` container to the existing utility controls. Do not register a service worker from app-shell and do not add PWA behavior to Legacy Mode.

- [ ] **Step 4: Implement `modern/pwa.js`**

Implement:
- guarded registration of `./service-worker.js` only when `serviceWorker` exists; errors remain non-blocking;
- `beforeinstallprompt` capture and one-shot Install App button;
- `appinstalled` cleanup;
- `registration.updatefound` / installing `statechange` detection: if a controller already exists and the new worker becomes installed, call `showUpdateNotice(registration.waiting || installing)`;
- `showUpdateNotice(waitingWorker)` creates a compact non-modal notice and never reloads automatically;
- Reload action first calls `PandoraRemaked.builds.flushAutosave()` when available, then listens once for `controllerchange`, posts `SKIP_WAITING`, and reloads only after control changes.

- [ ] **Step 5: Implement `modern/pwa.css` and build wiring**

Style Install App as an existing Modern utility control and the update notice as a small fixed/sticky non-blocking banner that stays within 390px viewport width and does not cover modal/dialog close controls.

Require/inject `pwa.css`; load `pwa.js` last in Modern Mode, after `builds.js`, `compare.js`, `mobile.js`; assert `/legacy/` contains none of these references.

Add `node --check modern/pwa.js` to feature and production workflows.

- [ ] **Step 6: Verify PWA UI contracts GREEN**

Run: `python -m unittest discover -s tests -v && npx playwright test tests/ui/pwa-ui.spec.mjs tests/ui/mobile-polish.spec.mjs`

Expected: PASS with no serialized-state change from install/update UI rendering.

- [ ] **Step 7: Commit Task 3**

Commit message: `feat: add install and safe update UX`

---

### Task 4: Real offline boot and cache regression coverage

**Files:**
- Create: `tests/ui/pwa-offline.spec.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/feature-ci.yml`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: built root `service-worker.js`, Playwright browser context offline mode, existing `Store()` and Modern shell.
- Produces: release-gating proof that installed Modern Mode boots offline and online behavior remains unchanged.

- [ ] **Step 1: Write the offline browser contract**

In `tests/ui/pwa-offline.spec.mjs`:
1. load `/` online;
2. wait for `navigator.serviceWorker.ready`;
3. reload once and assert `navigator.serviceWorker.controller` exists;
4. record `window.Store()`;
5. set the Playwright context offline and reload `/`;
6. assert `[data-remaked-shell]` is visible, `typeof window.Store === 'function'`, `typeof window.CalcSet === 'function'`, and the serialized build equals the recorded payload;
7. verify an offline navigation to `/legacy/` at least renders `#body` and the core Legacy runtime after the precached worker is controlling the client;
8. return the context online in `finally` so later tests are not poisoned.

- [ ] **Step 2: Run the offline test and verify behavior**

Run: `npx playwright test tests/ui/pwa-offline.spec.mjs`

Expected before any fix discovered by the test: FAIL at the exact missing cache/control behavior; after Task 2/3 implementation, make the minimal service-worker/build correction until this contract passes.

- [ ] **Step 3: Add cache-safety contracts**

Extend the same suite or Python build tests to assert:
- cross-origin fetches are not inserted into the Remaked cache;
- a missing optional item icon while offline does not prevent shell/Legacy runtime boot;
- repeated registration/init calls do not create duplicate Install/Update controls.

- [ ] **Step 4: Gate the complete PWA suite in CI**

Add `test:ui:pwa` and include `pwa-ui.spec.mjs` + `pwa-offline.spec.mjs` in `test:ui:ci`. Production Pages build must run the same suite before `upload-pages-artifact`.

Run: `npm run test:ui:ci`

Expected: all existing Phase 0–3 contracts plus mobile/PWA/offline contracts PASS.

- [ ] **Step 5: Commit Task 4**

Commit message: `test: gate offline PWA behavior`

---

### Task 5: Visual QA, `2026.09.4` release docs, and production gate

**Files:**
- Modify: `tests/ui/visual-capture.spec.mjs`
- Modify: `modern/version.js`
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `README.ru.md`
- Modify: `docs/superpowers/plans/2026-09-27-modernization-roadmap.md`
- Modify: `.github/workflows/pages.yml` only if final release verification reveals a missing gate

**Interfaces:**
- Consumes: completed Phase 4 mobile/PWA modules and all prior release tests.
- Produces: Remaked UI `2026.09.4`, release documentation, Phase-4 PR, production Pages artifact and deployment evidence.

- [ ] **Step 1: Extend visual capture for Phase 4**

At `390×844`, capture:
- main Modern view with sticky compact summary visible;
- a representative decorated equipment row;
- one collapsed legacy card with its disclosure control;
- the non-blocking update notice (invoke the safe public test hook with a fake waiting worker; do not force a real update during screenshot capture).

Keep desktop capture to prove Phase-4 controls remain hidden/non-disruptive at 1440px.

- [ ] **Step 2: Run visual QA and inspect screenshots manually**

Run: `npm run test:ui:visual`

Inspect for body-level horizontal overflow, sticky-summary obstruction, unreadable equipment controls, update-notice overlap, and accidental desktop regressions.

- [ ] **Step 3: Set release version and player docs**

Set `modern/version.js` UI to `2026.09.4` and document:
- sticky mobile summary;
- collapsible mobile cards/equipment reflow;
- installability/offline behavior;
- local-only cache/storage model;
- non-blocking update notice and explicit Reload action.

Mark Phase 3 shipped and Phase 4 release-ready in the modernization roadmap.

- [ ] **Step 4: Run fresh full verification on the exact release SHA**

Require Feature CI success for:
- Python builder/validation tests;
- legacy + all Modern JS syntax checks;
- full `test:ui:ci` including offline service-worker tests;
- visual capture artifact.

Do not reuse an earlier green run after version/docs changes.

- [ ] **Step 5: Run the preservation hard gate**

Compare `feature/mobile-pwa` against `bonaqu_projects`. Block release if the diff contains source changes under:
- `index.html`
- `js/**`
- `css/**`
- `image/**`

Expected Phase-4 changes live only in Modern assets, build/test/workflow/docs files.

- [ ] **Step 6: Open the Phase-4 PR with exact evidence**

PR summary must include the exact verified head SHA, Feature CI run, preservation diff result, offline contract result, and manual 1440/390 visual review.

Wait for PR-triggered CI on the same head SHA. Merge with `squash` and `expected_head_sha` only after PR is mergeable and CI is fully green.

- [ ] **Step 7: Verify the production deployment artifact**

After merge, wait for the `Deploy Pandora Saga Simulator` workflow build, deploy and Wiki jobs.

Download the exact `github-pages` artifact and verify:
- `modern/version.js` reports `2026.09.4`;
- `modern/manifest.webmanifest` and install icons exist;
- root `service-worker.js` exists and cache version is `2026.09.4`;
- Modern `index.html` loads Mobile/PWA assets in deterministic order;
- `/legacy/index.html` still contains no Modern/PWA script/style references;
- production workflow browser/offline/visual gates, Pages deploy and Wiki sync all report success.

- [ ] **Step 8: Commit/release bookkeeping if needed**

If production verification exposes no code/doc mismatch, no follow-up commit is required. Record the squash commit, production workflow run and artifact digest in the work log/phase summary.

---

## Self-review result

- **Spec coverage:** mobile single-column usability, sticky summary, collapsible advanced sections, touch sizing, PWA manifest/icons, offline cache, install flow, non-blocking update flow and regression testing all map to explicit tasks.
- **State safety:** every mobile presentation feature is read-only relative to Legacy state; update reload explicitly flushes existing Remaked autosave.
- **Cache safety:** the initial cache is intentionally bounded to functional JS/CSS + small interface assets rather than all 424 item icons; same-origin item assets can enter the runtime cache when actually used.
- **GitHub Pages subpath:** manifest uses `../` scope/start URL and the service worker is materialized at the deployed repository root so its scope covers both Modern and Legacy routes.
- **Release gate:** exact head SHA, preservation diff, real offline Playwright contract, PR CI and downloaded production artifact are all required before Phase 4 can be called shipped.
