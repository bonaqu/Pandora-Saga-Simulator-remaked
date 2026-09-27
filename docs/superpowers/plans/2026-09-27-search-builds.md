# Equipment/Soul Search and Local Builds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fast Equipment/Soul discovery, resilient autosave, and named local build slots to Modern Mode while continuing to use the legacy simulator as the only calculation and compatibility engine.

**Architecture:** New Modern modules sit behind a narrow `PandoraRemaked.adapter` boundary. Search reads the options that the legacy simulator has already filtered for the current race/job/socket state, and selection writes back through the existing `<select>` controls and their legacy handlers. Build storage uses new versioned `pandora-remaked.*` localStorage keys and `Store()` / `Expand()` payloads; it never reuses or overwrites the legacy `localStorage.file` key.

**Tech Stack:** Existing legacy HTML/JavaScript engine, plain modern JavaScript/CSS, browser `localStorage`, Python 3 standard-library build/tests, Playwright 1.63 browser tests, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-27-pandora-saga-modernization-design.md`

## Global Constraints

- The recovered legacy simulator remains the calculation and compatibility source of truth.
- Do not duplicate equipment, Soul, race, job, socket, or stat formulas in new Modern code.
- Equipment/Soul search must select the exact existing legacy IDs/values and trigger the same existing handlers as manual legacy selection.
- Search results must be rebuilt from current legacy state when opened/refreshed so race/job/equipment changes cannot leave stale compatibility results.
- Modern build storage must not read from, write to, migrate, or delete the legacy `localStorage.file` key.
- Modern storage keys are exactly `pandora-remaked.autosave.v1`, `pandora-remaked.builds.v1`, and existing/future `pandora-remaked.settings.v1` only where needed.
- The calculator must remain usable if localStorage is unavailable, full, denied, malformed, or contains an unsupported build schema/engine version.
- GitHub Pages remains the only required runtime hosting; no Cloudflare/database/account backend is introduced.
- English remains the default language; this phase does not invent Russian game terminology.
- Legacy source `index.html`, `js/**`, `css/**`, and `image/**` stays preservation-fingerprint clean.

## Review Focus

1. **Corrupt or unavailable localStorage:** malformed JSON, SecurityError, quota errors, or storage disabled must show a non-blocking warning and leave the current in-memory calculator usable. Task 3 owns these tests.
2. **Unsupported saved-build version:** records whose `schema !== 1` or `engine !== "legacy-2.00"` must not auto-load or overwrite current state. Task 3 and Task 4 pin this behavior.
3. **Exact legacy ID mapping:** Equipment/Soul search selection must set the existing legacy `<select>` value and dispatch the legacy handler, so `Status`, `Store()`, sockets, and calculations update exactly as manual selection would. Task 1 and Task 2 test this.
4. **Fresh compatibility after character/equipment changes:** changing race/job or socket-bearing equipment must rebuild search targets/options from current DOM/state instead of using stale cached lists. Task 2 tests this.
5. **Autosave write discipline:** Modern autosave must debounce meaningful changes, avoid redundant writes when the serialized payload is unchanged, and never touch `localStorage.file`. Task 4 tests this.

---

### Task 1: Add the Modern-to-Legacy adapter boundary

**Files:**
- Create: `modern/adapter.js`
- Create: `tests/ui/adapter.spec.mjs`
- Modify: `scripts/build_pages.py`
- Modify: `tests/test_build_pages.py`
- Modify: `package.json`
- Modify: `.github/workflows/feature-ci.yml`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Produces namespace: `PandoraRemaked.adapter`.
- Produces `serialize(): string` — returns the exact current `Store()` payload.
- Produces `load(payload: string): void` — validates a non-empty payload, calls `Expand(payload)`, then performs the tested legacy UI/state refresh sequence without invoking the old File storage system.
- Produces `listEquipmentTargets(): Array<{slotIndex:number,label:string,selectId:string}>`.
- Produces `listEquipmentOptions(slotIndex:number): Array<{value:string,name:string,level:number|null}>` from the *currently rendered* `SelEquip_<slot>_0` options.
- Produces `selectEquipment(slotIndex:number, value:string): boolean` — returns false for missing/invalid values; otherwise selects the existing option and dispatches the existing `change` path.
- Produces `listSoulTargets(): Array<{slotIndex:number,socketIndex:number,label:string,selectId:string}>` for currently usable/rendered `SelEquip_<slot>_<4..6>` controls only.
- Produces `listSoulOptions(target): Array<{value:string,name:string}>` from the current target select.
- Produces `selectSoul(target, value:string): boolean` through the existing select/change path.
- Later tasks consume these methods; no later module writes `Status`, `EquipData`, `SoulData`, or legacy selectors directly.

- [ ] **Step 1: Write failing browser tests for serialization and load round-trip**

Create `tests/ui/adapter.spec.mjs` asserting:
- `PandoraRemaked.adapter` exists;
- `adapter.serialize()` equals direct `Store()` byte-for-byte;
- mutate a known legacy control, serialize payload A, mutate again, `adapter.load(A)`, then `Store()` equals A;
- `adapter.load()` does not create/change `localStorage.file` when a sentinel value is pre-populated there.

- [ ] **Step 2: Write failing browser tests for Equipment target/options/select mapping**

Assertions:
- target 0 maps to `SelEquip_0_0` and uses the current rendered equipment label;
- `listEquipmentOptions(0)` values exactly match the current `<option value>` sequence in `SelEquip_0_0`;
- option names match visible option text with the legacy `Lv:NN` prefix normalized out into `level` where present;
- `selectEquipment(0, validValue)` changes the existing select to that exact value, fires the legacy path, and changes `Store()` exactly as a manual `.selectOption(validValue)` does;
- unknown slot/value returns false without changing `Store()`.

- [ ] **Step 3: Write failing browser tests for Soul targets/options/select mapping**

Assertions:
- Soul targets include only socket selects that currently exist and are not `display:none` after `ListCreate('SoulCheck')`;
- target values map to exact `SelEquip_<slot>_<4..6>` IDs;
- Soul options exactly mirror the compatible legacy select options;
- selecting a Soul through the adapter produces the same resulting `Store()` payload as manually selecting the same option.

- [ ] **Step 4: Run adapter tests and verify RED**

Run: `npm run test:ui:adapter`
Expected: FAIL because `modern/adapter.js` and `PandoraRemaked.adapter` do not exist.

- [ ] **Step 5: Implement `modern/adapter.js` with the exact interfaces above**

Implementation decisions:
- parse Equipment level from legacy option text matching `^Lv:\s*(\d+)\s+` and expose the remaining text as `name`;
- derive labels from the current rendered `#TextEquip_<slot>` text, falling back to `Slot <n>` only when absent;
- determine Soul target usability using the existing element plus computed/display state and legacy equipment socket state; do not derive socket compatibility independently;
- selection uses the existing DOM select, sets its value, and dispatches a bubbling `change` event;
- load refresh follows the same state-refresh responsibilities as legacy `File('Load')`/`File('CodeLoad')` but does not call `File()` and therefore cannot write `localStorage.file`.

- [ ] **Step 6: Wire adapter before other Modern modules in generated HTML**

Modify `scripts/build_pages.py` so required/injected script order begins:

```text
modern/version.js
modern/adapter.js
modern/app-shell.js
```

Extend `tests/test_build_pages.py` to assert `adapter.js` is required, copied, injected once, and comes before `app-shell.js`.

- [ ] **Step 7: Add adapter browser command and CI syntax/smoke coverage**

`package.json` adds `test:ui:adapter`. Feature CI and Pages workflow syntax-check `modern/adapter.js`; the feature browser suite includes adapter tests.

- [ ] **Step 8: Run adapter + existing regressions**

Run:
```bash
python -m unittest discover -s tests -v
node --check modern/adapter.js
npm run test:ui:foundation
npm run test:ui:adapter
```
Expected: all PASS and preservation validation still clean.

- [ ] **Step 9: Commit**

```bash
git add modern/adapter.js tests/ui/adapter.spec.mjs scripts/build_pages.py tests/test_build_pages.py package.json package-lock.json .github/workflows/feature-ci.yml .github/workflows/pages.yml
git commit -m "feat: add safe Modern adapter for legacy simulator state"
```

---

### Task 2: Add Equipment and Soul discovery/search UI

**Files:**
- Create: `modern/search.js`
- Create: `tests/ui/search-builds.spec.mjs`
- Modify: `modern/app-shell.js`
- Modify: `modern/modern.css`
- Modify: `scripts/build_pages.py`
- Modify: `tests/test_build_pages.py`
- Modify: `package.json`

**Interfaces:**
- Consumes only `PandoraRemaked.adapter` for game-state/options selection.
- Produces namespace: `PandoraRemaked.search`.
- Produces `normalizeQuery(value:string): string` using Unicode NFKC + locale-insensitive lowercase/trim.
- Produces `filterEquipment(options, {query, minLevel, maxLevel}): Array<Option>`.
- Produces `openEquipmentSearch(slotIndex?:number): void`.
- Produces `openSoulSearch(target?:{slotIndex:number,socketIndex:number}): void`.
- Produces DOM markers `[data-remaked-search-panel]`, `[data-remaked-equipment-search]`, `[data-remaked-soul-search]`.

- [ ] **Step 1: Write failing pure/browser search tests**

`tests/ui/search-builds.spec.mjs` asserts:
- Equipment Search opens from a Modern toolbar action;
- target selector reflects current `adapter.listEquipmentTargets()` labels;
- typing a case-insensitive substring narrows results;
- Unicode NFKC normalization does not make visually equivalent full-width/ASCII input diverge;
- minimum and maximum level filters include `null`-level placeholder/default entries only when query/default behavior requires them, never as false matching real items;
- reset clears query/level filters;
- no-match state displays `No matching equipment`.

- [ ] **Step 2: Add compatibility freshness tests before implementation**

Browser sequence:
1. Open Equipment Search and capture the current option-value set for one target.
2. Change race or job through the existing simulator control to a configuration whose rendered select option set differs.
3. Re-open/refresh search.
4. Assert the new result value set equals the *current legacy select values*, not the old set.

No Modern cache may be treated as canonical.

- [ ] **Step 3: Add Equipment selection parity test**

Choose a searchable non-default result. Record the resulting `Store()` after selection through Modern Search. Reload the baseline build and select the same value manually through the legacy select. Assert payloads are identical.

- [ ] **Step 4: Add failing Soul search tests**

Assertions:
- when current equipment exposes no visible Soul sockets, panel shows a clear `No available Soul sockets` state;
- after equipping a socket-bearing item, Soul target selector is rebuilt from `adapter.listSoulTargets()`;
- results equal the current compatible option values for the selected socket;
- query filters by current localized Soul names;
- choosing a Soul through Modern Search gives the same `Store()` payload as manual selection through that exact legacy Soul select.

- [ ] **Step 5: Run search tests and verify RED**

Run: `npm run test:ui:search-builds`
Expected: FAIL because `modern/search.js` / search UI are absent.

- [ ] **Step 6: Implement `modern/search.js`**

Decisions:
- results are rebuilt from adapter output each time the panel opens and each time the target changes;
- Equipment compatibility is described as `Compatible with current character` because the legacy select has already filtered by current race/job; no second race/job filter is implemented;
- level filtering uses adapter-exposed legacy option levels only;
- selecting a result delegates to `adapter.selectEquipment()` / `adapter.selectSoul()` and then closes or refreshes the panel;
- UI remains keyboard-operable and touch-friendly; Escape closes the panel; focus returns to the trigger.

- [ ] **Step 7: Add search triggers/panel host to `modern/app-shell.js` and styles**

Add Modern utility/actions for:
- `Equipment Search`
- `Soul Search`

CSS requirements:
- desktop panel/dialog fits inside Modern shell;
- results have at least practical touch targets;
- 390px viewport has no body-level horizontal overflow;
- result list itself may scroll vertically;
- search UI does not change Legacy Mode.

- [ ] **Step 8: Wire `search.js` after adapter and before app-shell**

Builder required order:

```text
version.js
adapter.js
search.js
app-shell.js
```

Update builder tests accordingly.

- [ ] **Step 9: Run search + foundation regression suites**

Run:
```bash
npm run test:ui:foundation
npm run test:ui:adapter
npm run test:ui:search-builds
python -m unittest discover -s tests -v
```
Expected: all PASS, and legacy preservation fingerprint remains unchanged.

- [ ] **Step 10: Commit**

```bash
git add modern/search.js modern/app-shell.js modern/modern.css tests/ui/search-builds.spec.mjs scripts/build_pages.py tests/test_build_pages.py package.json package-lock.json
git commit -m "feat: add Equipment and Soul search"
```

---

### Task 3: Add resilient versioned Modern build storage

**Files:**
- Create: `modern/build-store.js`
- Create: `tests/ui/build-store.spec.mjs`
- Modify: `scripts/build_pages.py`
- Modify: `tests/test_build_pages.py`
- Modify: `package.json`

**Interfaces:**
- Produces namespace: `PandoraRemaked.buildStore`.
- Constants:
  - `AUTOSAVE_KEY = "pandora-remaked.autosave.v1"`
  - `BUILDS_KEY = "pandora-remaked.builds.v1"`
  - `SCHEMA = 1`
  - `ENGINE = "legacy-2.00"`
- Produces `readAutosave(): {ok:boolean, record?:AutosaveRecord, error?:StorageError}`.
- Produces `writeAutosave(payload:string): {ok:boolean, error?:StorageError}`.
- Produces `listBuilds(): {ok:boolean, builds:Array<BuildRecord>, error?:StorageError}`.
- Produces `saveBuild(name:string, payload:string): {ok:boolean, build?:BuildRecord, error?:StorageError}`.
- Produces `updateBuild(id:string, patch:{name?:string,payload?:string}): Result`.
- Produces `duplicateBuild(id:string): Result`.
- Produces `deleteBuild(id:string): Result`.
- Produces `getBuild(id:string): BuildRecord|null`.
- Build name normalization: trim whitespace; maximum 60 Unicode code points; if blank when saving a new build, generate `Build N` using the first free positive integer.
- Build IDs: `crypto.randomUUID()` where available; deterministic collision-checked fallback only when unavailable.

**Record shapes:**

Autosave:
```json
{
  "schema": 1,
  "engine": "legacy-2.00",
  "updatedAt": "ISO-8601",
  "payload": "legacy Store() payload"
}
```

Named store:
```json
{
  "schema": 1,
  "engine": "legacy-2.00",
  "builds": [
    {
      "id": "uuid",
      "name": "PvP Horseman",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601",
      "payload": "legacy Store() payload"
    }
  ]
}
```

- [ ] **Step 1: Write failing tests for clean save/read lifecycle**

Assert:
- autosave writes exact schema/engine/payload and valid ISO timestamp;
- named build persists and reads exact payload;
- blank names become `Build 1`, then `Build 2`;
- names are trimmed/capped at 60 code points;
- rename changes `updatedAt` but not `createdAt`;
- duplicate receives new ID and a non-colliding readable name;
- delete removes only the requested build.

- [ ] **Step 2: Write failing corruption/version/engine tests**

Seed localStorage manually and assert:
- malformed JSON returns `{ok:false}` and never throws into app startup;
- `schema:999` returns unsupported-schema error and is not treated as a valid autosave/build collection;
- `engine:"future-engine"` returns engine-mismatch and is not treated as loadable;
- an invalid named entry does not cause valid sibling builds to disappear from the returned safe list; error metadata indicates corrupted entries when practical.

- [ ] **Step 3: Write failing unavailable/quota storage tests**

Temporarily replace/mock Storage methods to throw `SecurityError` / `QuotaExceededError`; every public store operation returns an error object instead of throwing. Assert legacy `localStorage.file` sentinel remains untouched through all Modern store operations.

- [ ] **Step 4: Run storage tests and verify RED**

Run: `npm run test:ui:build-store`
Expected: FAIL because `PandoraRemaked.buildStore` does not exist.

- [ ] **Step 5: Implement `modern/build-store.js`**

Use a small guarded storage boundary (`getItem`, `setItem`, JSON parse/stringify). Never enumerate or mutate unrelated localStorage keys. Do not auto-delete malformed or unsupported records; return warnings/errors so UI can tell the user without destroying recoverable data.

- [ ] **Step 6: Wire module after adapter and before builds/UI modules**

Builder order becomes:

```text
version.js
adapter.js
build-store.js
search.js
app-shell.js
```

Extend build tests and syntax checks.

- [ ] **Step 7: Run storage and existing regression suites**

Run:
```bash
npm run test:ui:build-store
npm run test:ui:foundation
npm run test:ui:adapter
npm run test:ui:search-builds
```
Expected: PASS, including untouched `localStorage.file` assertions.

- [ ] **Step 8: Commit**

```bash
git add modern/build-store.js tests/ui/build-store.spec.mjs scripts/build_pages.py tests/test_build_pages.py package.json package-lock.json
git commit -m "feat: add resilient versioned local build storage"
```

---

### Task 4: Add autosave and named Build Manager UI

**Files:**
- Create: `modern/builds.js`
- Create: `tests/ui/build-manager.spec.mjs`
- Modify: `modern/app-shell.js`
- Modify: `modern/modern.css`
- Modify: `scripts/build_pages.py`
- Modify: `tests/test_build_pages.py`
- Modify: `package.json`

**Interfaces:**
- Consumes only `PandoraRemaked.adapter` and `PandoraRemaked.buildStore` for build state/storage.
- Produces namespace: `PandoraRemaked.builds`.
- Produces `scheduleAutosave(): void` with 300 ms debounce.
- Produces `flushAutosave(): Result`.
- Produces `restoreAutosave(): Promise/Result` or synchronous equivalent after legacy initialization.
- Produces `openBuildManager(): void`.
- Produces `saveCurrent(name?:string): Result`.
- Produces `loadBuild(id:string): Result`.
- Produces DOM markers `[data-remaked-builds]`, `[data-remaked-autosave-status]`.

- [ ] **Step 1: Write failing autosave debounce/dedup tests**

Browser assertions:
- a meaningful legacy `change` that changes `Store()` writes `pandora-remaked.autosave.v1` after about 300 ms;
- several rapid changes within the debounce window produce one final payload write;
- triggering UI activity that leaves `Store()` unchanged does not rewrite `updatedAt`;
- `localStorage.file` sentinel is unchanged.

- [ ] **Step 2: Write failing autosave recovery tests**

Sequence:
1. Build payload A and allow autosave.
2. Reload page with same origin/storage.
3. Assert Modern Mode restores payload A through adapter and shows a subtle `Restored last session` notice.

Negative assertions:
- malformed autosave does not mutate the current default build and shows non-blocking warning;
- unsupported schema/engine does not auto-load;
- storage unavailable leaves simulator controls/calculation usable.

- [ ] **Step 3: Write failing named-build CRUD UI tests**

Assert Build Manager can:
- save current state with a user name;
- show name + last-updated information;
- load another saved build and reproduce its exact `Store()` payload;
- rename;
- duplicate to a distinct ID;
- request confirmation before delete;
- delete confirmed build without touching siblings;
- update autosave to the just-loaded named build.

- [ ] **Step 4: Write failing Copy/Import build-code tests**

Use the existing legacy serialization as interchange format:
- Copy/Export exposes current `adapter.serialize()` payload without server calls;
- Import accepts a valid payload, loads through adapter, recalculates, and updates autosave;
- malformed import is rejected without mutating current `Store()`;
- import does not call the legacy `File()` storage path.

- [ ] **Step 5: Run Build Manager tests and verify RED**

Run: `npm run test:ui:build-manager`
Expected: FAIL because `modern/builds.js` / Build Manager UI do not exist.

- [ ] **Step 6: Implement `modern/builds.js`**

Decisions:
- event delegation attaches to the Modern calculator frame / legacy `#body` and schedules autosave after bubbling `change`, relevant `input`, and Modern search selections;
- compare serialized payload with last successfully saved autosave payload before writing;
- restore runs after legacy initialization and before declaring Modern build manager ready;
- storage warnings render in Modern UI and never block calculator use;
- destructive delete requires explicit confirmation;
- no account/cloud concepts appear in this phase.

- [ ] **Step 7: Add Build Manager trigger/status to app shell and Concept-C styling**

Header/tool area adds `Builds` with compact autosave state (`Saved`, `Saving…`, warning). Build panel works at desktop and 390px without body-level overflow.

- [ ] **Step 8: Wire builds module before app shell initialization**

Final Phase-2 script order:

```text
version.js
adapter.js
build-store.js
search.js
builds.js
app-shell.js
```

Extend builder tests to assert exact order and presence.

- [ ] **Step 9: Run full Phase-2 browser regression set**

Run:
```bash
npm run test:ui:foundation
npm run test:ui:adapter
npm run test:ui:search-builds
npm run test:ui:build-store
npm run test:ui:build-manager
```
Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add modern/builds.js modern/app-shell.js modern/modern.css tests/ui/build-manager.spec.mjs scripts/build_pages.py tests/test_build_pages.py package.json package-lock.json
git commit -m "feat: add autosave and named build manager"
```

---

### Task 5: Integrate Phase 2 into release QA and player documentation

**Files:**
- Modify: `.github/workflows/feature-ci.yml`
- Modify: `.github/workflows/pages.yml`
- Modify: `tests/ui/visual-capture.spec.mjs`
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `README.ru.md`
- Modify: `modern/version.js`

**Interfaces:**
- Feature/production CI runs all Phase-2 tests before artifact upload/deploy.
- User-facing docs mark Equipment/Soul Search and local Builds as available, not upcoming.
- Remaked UI version increments from `2026.09.1` to `2026.09.2`.

- [ ] **Step 1: Add a single CI browser command for all shipped suites**

Add package script such as:

```text
"test:ui:ci": "playwright test tests/ui/modern-foundation.spec.mjs tests/ui/adapter.spec.mjs tests/ui/search-builds.spec.mjs tests/ui/build-store.spec.mjs tests/ui/build-manager.spec.mjs"
```

Feature CI and Pages workflow use this command after `npm ci` / Chromium install.

- [ ] **Step 2: Extend visual QA captures**

Capture at least:
- Modern main desktop 1440;
- Modern mobile 390;
- Equipment Search open at desktop and mobile;
- Build Manager open at desktop and mobile.

Artifacts remain short-retention CI QA output rather than committed screenshots until final branding/media phase.

- [ ] **Step 3: Update version/changelog/player README EN/RU**

Update `modern/version.js` to `2026.09.2`. Changelog documents:
- Equipment Search;
- Soul Search;
- autosave/session recovery;
- named local builds;
- import/export build code;
- all data remains local to the browser in this phase.

README EN/RU moves these features from `coming next` to available features without adding developer infrastructure detail to the main page.

- [ ] **Step 4: Run the full verification gate on the feature branch**

Required fresh evidence:
```bash
python -m unittest discover -s tests -v
python3 scripts/validate_site.py
node --check modern/version.js
node --check modern/adapter.js
node --check modern/build-store.js
node --check modern/search.js
node --check modern/builds.js
node --check modern/app-shell.js
npm ci --no-audit --no-fund
npm run test:ui:ci
npm run test:ui:visual
```
Expected: all PASS.

- [ ] **Step 5: Inspect visual QA artifacts manually**

Review desktop/mobile/search/build-manager screenshots. Confirm:
- no wide-header drift;
- no body-level mobile overflow;
- dialogs/panels remain readable;
- the calculator remains usable behind/after panels;
- no unexpected visual regression in the main Modern shell.

- [ ] **Step 6: Compare feature branch to `bonaqu_projects` before PR**

The diff must show **no modifications** to preservation source:
- `index.html`
- `js/**`
- `css/**`
- `image/**`

Any legacy-source difference blocks merge unless separately justified, fingerprint-updated, and user-reviewed.

- [ ] **Step 7: Open Phase-2 PR with exact verification evidence**

PR describes architecture, storage keys, local-only privacy scope, tests, and any intentionally deferred filters. Do not claim unsupported global class/race filters if search deliberately relies on current-character compatibility.

- [ ] **Step 8: Squash-merge only after PR CI succeeds**

Use one clean public release commit while retaining detailed TDD history in the PR branch/Actions history.

- [ ] **Step 9: Verify production Pages deployment**

After merge:
- wait for production `build`, `deploy`, and Wiki jobs to succeed;
- download the exact deployed `github-pages` artifact;
- verify Modern scripts are present in expected order;
- verify `/legacy/` still exists;
- verify version `2026.09.2` is present;
- verify preservation source remained unchanged;
- do not claim live-browser verification unless the environment can actually access the GitHub Pages URL.

- [ ] **Step 10: Commit final Phase-2 release prep**

```bash
git add .github/workflows package.json package-lock.json tests/ui/visual-capture.spec.mjs modern/version.js CHANGELOG.md README.md README.ru.md
git commit -m "release: prepare Remaked UI 2026.09.2"
```

---

## Phase 2 success criteria

Phase 2 is complete only when all of the following are true:

1. Equipment Search can find and select items from the current legacy-compatible option set without duplicating compatibility logic.
2. Soul Search exposes only currently usable socket targets and compatible legacy Soul options.
3. Search selections produce the same `Store()` output as equivalent manual legacy selections.
4. Race/job/equipment changes cannot leave stale search results.
5. Autosave restores an exact serialized build after refresh.
6. Multiple named builds can be saved, loaded, renamed, duplicated, and deleted.
7. Import/export uses the legacy serialized payload and never requires a backend.
8. Corrupt/unavailable storage never prevents ordinary simulator use.
9. Modern storage never changes or deletes legacy `localStorage.file`.
10. Existing Phase 0–1 Modern/Legacy regressions remain green.
11. Legacy preservation fingerprints remain unchanged.
12. Production GitHub Pages deployment succeeds from the same deterministic builder/test gate.

## Explicitly deferred from Phase 2

- Compare Builds — Phase 3.
- Numeric “why this stat?” decomposition — Phase 3+ after verified formulas/tests.
- Full Russian game-data localization — dedicated localization phase with user-supplied terminology.
- Deep single-column mobile restructuring / sticky stat summary — mobile/PWA phase.
- PWA/service worker/offline caching — mobile/PWA phase.
- Canonical migration of legacy item/Soul data into JSON — structured-data phase; Phase 2 deliberately reads current legacy state through the adapter.
- Cloud accounts, cloud save, cross-device synchronization, database, Cloudflare Workers/D1/KV — later separate project/spec.
