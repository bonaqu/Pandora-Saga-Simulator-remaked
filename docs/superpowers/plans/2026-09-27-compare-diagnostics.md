# Compare Builds + Safe Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 3 with Build A vs Build B comparison calculated entirely through the preserved legacy engine, safe stat-definition/source tooltips, and Modern-vs-Legacy differential regression coverage.

**Architecture:** Extend the existing Modern adapter with a read-only calculated-summary projection and a non-destructive build evaluator that always restores the user's current serialized build. A new `compare.js` owns comparison UI/deltas, while `tooltips.js` owns factual stat definitions/source metadata; neither module reimplements game formulas. Differential browser tests run the same serialized payload through Modern and Legacy surfaces and compare the projected outputs.

**Tech Stack:** Static HTML/CSS/JavaScript, preserved legacy JavaScript engine, existing Modern adapter/build store, Python 3 builder/validation, Playwright, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-27-pandora-saga-modernization-design.md`

## Global Constraints

- The legacy calculation behavior remains the reference implementation; no Phase-3 code may reproduce or silently change formulas.
- `/legacy/` remains a near-museum copy and its source `index.html`, `js/**`, `css/**`, `image/**` must remain fingerprint-identical.
- Comparison loads/computes both builds through the same `Expand()` / `CalcSet()` path used by the simulator and restores the user's current build afterwards.
- Delta styling is directional, not evaluative: higher/lower must never be labelled better/worse.
- Numeric decomposition is omitted unless a component is explicitly verified against the legacy engine and covered by a regression test.
- Tooltips may define a stat and identify its legacy output node/source; they must not invent causal contributions from equipment, buffs, attributes, or formulas.
- Storage remains browser-local; comparison must not mutate `localStorage.file`, named builds, or autosave records.
- Phase-3 release version is `2026.09.3`.

## Review Focus

1. **Non-destructive evaluation:** comparing builds must leave the active character payload and autosave record byte-for-byte unchanged.
2. **Unavailable legacy values:** `---`, empty, or non-numeric fields render safely and produce no misleading numeric delta.
3. **Corrupt/missing builds:** fewer than two valid named builds or a disappeared selected build produces a clear empty/error state without breaking the calculator.
4. **Legacy differential:** the same serialized payload must yield the same projected summary in Modern and Legacy routes for default, changed-race, equipment-changed, and mounted-oriented fixture flows where available.
5. **Narrow screens/keyboard:** Compare dialog must fit a 390px viewport, restore focus on close, support Escape, and expose tooltip meaning without hover-only dependency.

---

### Task 1: Add calculated-summary projection to the Modern adapter

**Files:**
- Modify: `modern/adapter.js`
- Test: `tests/ui/adapter.spec.mjs`
- Create: `tests/ui/compare-differential.spec.mjs`

**Interfaces:**
- Produces: `adapter.readCalculatedSummary() -> Array<{key,label,value,display,unit,sourceId}>`
- Produces: `adapter.readCharacterMetadata() -> {race,raceSkill,job,level}`
- Produces: `adapter.evaluateBuild(payload) -> {metadata,summary}` while restoring the pre-call serialized build in `finally`.
- Summary projection reads legacy-calculated DOM outputs including LP/MP, ATK/MATK, DEF, physical/magic damage resistance, Accuracy, Dodge, Crit/Crit resistance, attack/cast/movement timing fields and elemental resistances where a stable legacy output node exists.

- [ ] **Step 1: Write failing adapter tests** for stable summary keys, numeric/display parsing, metadata, exact current-build restoration, and unchanged `localStorage.file`.
- [ ] **Step 2: Run `npm run test:ui:adapter` and verify RED** because the new adapter methods do not exist.
- [ ] **Step 3: Implement the minimal adapter projection/evaluator** using existing legacy DOM/state after `adapter.load()`; do not encode formulas.
- [ ] **Step 4: Add differential browser fixtures** that serialize representative Modern states and assert matching projected DOM values after loading the same payload on `/legacy/`.
- [ ] **Step 5: Run adapter + differential tests and verify PASS.**
- [ ] **Step 6: Commit** `feat: expose legacy calculated summaries`.

---

### Task 2: Build the non-destructive Compare Builds model and UI

**Files:**
- Create: `modern/compare.js`
- Create: `modern/compare.css`
- Modify: `modern/app-shell.js`
- Modify: `scripts/build_pages.py`
- Modify: `tests/test_build_pages.py`
- Create: `tests/ui/compare-builds.spec.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `PandoraRemaked.adapter.evaluateBuild(payload)` and `PandoraRemaked.buildStore.listBuilds()/getBuild(id)`.
- Produces: `PandoraRemaked.compare.open(trigger)` and `PandoraRemaked.compare.close()`.
- Comparison row shape: `{key,label,aDisplay,bDisplay,delta,direction,unit}` where `direction` is `up|down|flat|unavailable`, never `good|bad`.

- [ ] **Step 1: Write failing comparison contract tests** for two-build selection, A/B summaries, `B - A` deltas, unavailable values, fewer-than-two-build state, active-build restoration, untouched autosave/legacy storage, Escape/focus behavior, and 390px containment.
- [ ] **Step 2: Run the comparison spec and verify RED** because `compare.js` and the Compare Builds trigger do not exist.
- [ ] **Step 3: Implement `compare.js`** as a modal/panel around named builds; compute each side only through the adapter evaluator.
- [ ] **Step 4: Add `compare.css`** with neutral directional styling and responsive single-column controls/table handling on narrow screens.
- [ ] **Step 5: Add `Compare Builds` to the Modern tool row** without changing legacy navigation/state.
- [ ] **Step 6: Wire deterministic builder + Python builder assertions** for compare assets/script order.
- [ ] **Step 7: Run Python, syntax, and comparison tests; verify PASS.**
- [ ] **Step 8: Commit** `feat: add non-destructive build comparison`.

---

### Task 3: Add safe stat-definition/source tooltips

**Files:**
- Create: `modern/tooltips.js`
- Modify: `modern/compare.js`
- Modify: `modern/compare.css`
- Modify: `scripts/build_pages.py`
- Modify: `tests/test_build_pages.py`
- Create: `tests/ui/tooltips.spec.mjs`

**Interfaces:**
- Produces: `PandoraRemaked.tooltips.get(key) -> {definition,source}` or `null`.
- Produces: `PandoraRemaked.tooltips.decorate(labelNode,key)` for an accessible focusable help affordance.
- `source` identifies the preserved legacy calculated output (for example `Status_6`) and calculation ownership, not an unverified numeric decomposition.

- [ ] **Step 1: Write failing tooltip tests** for representative fields, unknown-field fallback, keyboard focus, and absence of unverified decomposition claims.
- [ ] **Step 2: Verify RED** before adding `tooltips.js`.
- [ ] **Step 3: Implement factual definitions/source registry** and decorate Compare table labels.
- [ ] **Step 4: Add hover/focus-visible tooltip presentation**; essential text remains available to keyboard users.
- [ ] **Step 5: Run tooltip + compare tests and verify PASS.**
- [ ] **Step 6: Commit** `feat: add safe stat diagnostics`.

---

### Task 4: Strengthen Phase-3 regression and visual QA

**Files:**
- Modify: `tests/ui/visual-capture.spec.mjs`
- Modify: `.github/workflows/feature-ci.yml`
- Modify: `.github/workflows/pages.yml`
- Modify: `package.json`

**Interfaces:**
- `test:ui:ci` includes adapter, differential, search/build storage, compare, tooltip and foundation suites.
- Visual QA adds Compare Builds at desktop 1440 and mobile 390 while retaining existing Phase-2 captures.

- [ ] **Step 1: Extend CI script/workflows** so every shipped Phase-3 suite gates both feature and production deploys.
- [ ] **Step 2: Add desktop/mobile Compare visual captures.**
- [ ] **Step 3: Run the full local/Actions-equivalent gate**: Python tests, validator, all relevant `node --check`, `npm ci`, `npm run test:ui:ci`, `npm run test:ui:visual`.
- [ ] **Step 4: Inspect all new Compare screenshots manually** for clipping, unreadable deltas, overlay overflow, and background usability.
- [ ] **Step 5: Commit** `test: gate Phase 3 comparison and diagnostics`.

---

### Task 5: Release Remaked UI 2026.09.3

**Files:**
- Modify: `modern/version.js`
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `README.ru.md`
- Modify: `docs/superpowers/plans/2026-09-27-modernization-roadmap.md`

**Interfaces:**
- Player docs mark Compare Builds and safe stat definitions as available.
- Docs explicitly state that comparison uses the legacy calculation path and that detailed numeric formula decomposition is not claimed where unverified.

- [ ] **Step 1: Update version/docs/changelog/roadmap** to `2026.09.3` and mark Phase 2 shipped + Phase 3 release-ready.
- [ ] **Step 2: Run fresh full verification.**
- [ ] **Step 3: Compare feature branch with `bonaqu_projects`; block release on any change to preserved `index.html`, `js/**`, `css/**`, or `image/**`.**
- [ ] **Step 4: Open Phase-3 PR with exact verification evidence.**
- [ ] **Step 5: Squash-merge only after PR CI is green.**
- [ ] **Step 6: Wait for production build/deploy/Wiki success and inspect the exact `github-pages` artifact for version, `/legacy/`, script order, Compare assets, and preservation separation.**

---

## Phase 3 success criteria

1. Two named builds can be compared without replacing the user's active build.
2. Every displayed comparison value comes from the legacy-calculated output/state, not a reimplemented formula.
3. Deltas are `Build B - Build A` and are styled directionally without claiming that higher/lower is better.
4. Unavailable/non-numeric legacy values never produce fake deltas.
5. Compare does not mutate autosave, named-build storage, or legacy `localStorage.file`.
6. Initial stat tooltips provide factual meaning/source information and no unverified numeric decomposition.
7. Modern-vs-Legacy differential fixtures pass for representative serialized builds.
8. Compare remains usable at 390px and on desktop.
9. Phase 0–2 regression suites remain green.
10. Legacy preservation files remain unchanged.
11. Production GitHub Pages deploys successfully as Remaked UI `2026.09.3`.
