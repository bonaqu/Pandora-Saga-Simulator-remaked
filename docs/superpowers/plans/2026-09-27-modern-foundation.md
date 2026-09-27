# Modern Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a preserved `/legacy/` simulator and a responsive Concept-C Modern Mode at `/`, with a player-facing bilingual repository presentation and strong preservation/deployment checks.

**Architecture:** Keep the recovered root simulator files as the immutable legacy source set and generate both deployment surfaces from them. A deterministic Python Pages builder writes a near-museum Legacy copy to `_site/legacy/` and a Modern copy to `_site/` by injecting only Modern CSS/JS/meta hooks; the existing legacy IDs, globals, inline handlers, formulas, data files, `Store()`, and `Expand()` remain the calculation/state implementation. Modern JS/CSS progressively enhance the legacy DOM rather than replacing the calculator engine.

**Tech Stack:** Existing static HTML/CSS/JavaScript + Prototype-era legacy scripts, plain modern JavaScript/CSS, Python 3 standard library (`unittest`, `hashlib`, `pathlib`, `shutil`, `re`), Node.js syntax checks, GitHub Actions, GitHub Pages. Browser QA uses Playwright as a development/CI smoke-test dependency only, not an application runtime dependency.

**Spec:** `docs/superpowers/specs/2026-09-27-pandora-saga-modernization-design.md`

## Global Constraints

- `/` is Modern Mode; `/legacy/` is the preserved historical simulator.
- English is the default language in Modern Mode.
- Legacy formulas/data remain the calculation source of truth.
- Modern code must not duplicate or rewrite game formulas in this phase.
- Modern Mode must preserve the existing element IDs and state functions needed by the legacy engine.
- GitHub Pages remains the only required runtime hosting.
- No Cloudflare, database, account system, or cloud save is introduced.
- Main README content targets ordinary players; technical/deployment material stays in Wiki/docs.
- New Remaked files receive restrictive project terms while legacy/original materials retain accurate attribution and historical permissions.
- The user-provided Pandora Saga banner is a visual-direction reference; any new decorative game art must be based on verified Pandora Saga references and remain clearly unofficial.

## Review Focus

1. **Legacy payload compatibility:** existing `Store()`/`Expand()` serialized builds must round-trip unchanged after Modern assets load. Task 3 adds a browser smoke fixture that stores, reloads, and compares payload text.
2. **Wide-screen float regression:** at 1920×1080 and 2560×1440, Modern header/tabs/language controls must stay inside the centered application shell rather than drifting to the viewport edge. Task 3 adds bounding-box assertions.
3. **Narrow viewport usability:** at 390×844, the page must not create body-level horizontal overflow and primary navigation must remain reachable. Task 3 adds viewport/overflow assertions.
4. **Missing Modern asset/build error:** Pages generation must fail if Modern CSS/JS is missing rather than silently deploying a half-modern page. Task 2 adds builder tests.
5. **Licensing boundary confusion:** README/LICENSE/NOTICE must not claim exclusive ownership of legacy/original Pandora Saga materials. Task 4 adds text assertions in documentation tests.

---

### Task 1: Freeze and verify the preservation baseline

**Files:**
- Create: `scripts/legacy_fingerprint.py`
- Create: `preservation/legacy-files.sha256`
- Create: `tests/test_legacy_fingerprint.py`
- Modify: `scripts/validate_site.py`

**Interfaces:**
- Produces: `collect_legacy_files(root: pathlib.Path) -> list[pathlib.Path]`
- Produces: `fingerprint_file(path: pathlib.Path) -> str`
- Produces: `verify_manifest(root: pathlib.Path, manifest: pathlib.Path) -> list[str]`, returning human-readable mismatches and an empty list on success.
- Later tasks consume the preservation manifest as the explicit gate for unintentional legacy-engine edits.

- [ ] **Step 1: Write failing unit tests for stable hashing and mismatch detection**

Create `tests/test_legacy_fingerprint.py` with tests asserting:
- SHA-256 output is deterministic for a fixture file;
- `verify_manifest()` reports changed bytes;
- `verify_manifest()` reports a missing file;
- a manifest line cannot escape repository root with `../`.

- [ ] **Step 2: Run tests and verify they fail because the module does not exist**

Run: `python -m unittest tests.test_legacy_fingerprint -v`
Expected: FAIL importing `scripts.legacy_fingerprint`.

- [ ] **Step 3: Implement the fingerprint module**

Implement the exact interfaces above using only Python standard library. The production legacy file set includes `index.html`, `readme.txt`, `css/**`, `js/**`, and `image/**`; exclude Modern files, docs, workflows, generated `_site`, and preservation metadata itself.

- [ ] **Step 4: Generate the initial manifest from the currently recovered working snapshot**

Run: `python scripts/legacy_fingerprint.py --write preservation/legacy-files.sha256`
Expected: manifest created with sorted relative paths and SHA-256 values.

- [ ] **Step 5: Extend static validation to verify the preservation manifest**

Modify `scripts/validate_site.py` so a legacy mismatch fails validation with a clear message naming changed/missing paths. It must still perform all existing FC2/core/local-reference checks.

- [ ] **Step 6: Run preservation/static tests**

Run: `python -m unittest tests.test_legacy_fingerprint -v && python scripts/validate_site.py`
Expected: all tests PASS; validator prints `Static validation passed`.

- [ ] **Step 7: Commit**

```bash
git add scripts/legacy_fingerprint.py scripts/validate_site.py preservation/legacy-files.sha256 tests/test_legacy_fingerprint.py
git commit -m "test: freeze legacy simulator baseline"
```

---

### Task 2: Replace inline Pages assembly with a deterministic Modern/Legacy builder

**Files:**
- Create: `scripts/build_pages.py`
- Create: `tests/test_build_pages.py`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: root legacy snapshot validated by Task 1.
- Produces: `build_pages(root: pathlib.Path, output: pathlib.Path) -> None`.
- Produces deployed routes `_site/index.html` (Modern) and `_site/legacy/index.html` (Legacy).
- Modern injection contract: exactly one `<!-- REMAKED:HEAD -->` insertion before `</head>` and one `<!-- REMAKED:BODY -->` insertion before `</body>`.

- [ ] **Step 1: Write failing builder tests**

Create `tests/test_build_pages.py` with temporary fixture directories asserting:
- Legacy output receives an unmodified copy of the source HTML bytes apart from path-safe deployment handling explicitly required by the builder;
- Modern output contains `modern/modern.css` and `modern/app-shell.js` references exactly once;
- Modern output defaults to English without changing Legacy default language;
- Modern output contains links/hooks for Project, Updates, and `/legacy/`;
- shared `css/`, `js/`, `image/`, and `readme.txt` are copied into deployment output;
- builder raises a clear exception when `modern/modern.css` or `modern/app-shell.js` is missing.

- [ ] **Step 2: Run builder tests and verify failure**

Run: `python -m unittest tests.test_build_pages -v`
Expected: FAIL importing `scripts.build_pages`.

- [ ] **Step 3: Implement `build_pages(root, output)`**

Rules:
- delete/recreate output safely only when output is inside repository working tree;
- copy shared legacy runtime assets once at output root;
- copy the preserved entry/readme/runtime set under `output/legacy/` with relative paths adjusted only as needed so `/legacy/` loads from shared or copied runtime assets deterministically;
- generate Modern HTML from the preserved source by deterministic string/DOM-safe insertion, not by hand-maintaining a second full calculator HTML file;
- set Modern default language to EN while preserving explicit `?lang=en`, `?lang=jp`, and `?lang=tw` behavior;
- add `.nojekyll` to output.

- [ ] **Step 4: Run builder tests**

Run: `python -m unittest tests.test_build_pages -v`
Expected: PASS.

- [ ] **Step 5: Update GitHub Actions to call the builder**

Replace the current inline `_site` copy step with:

```bash
python3 scripts/build_pages.py --output _site
```

Keep source import, static validation, JS syntax checks, Pages configure/upload/deploy, and Wiki sync behavior. Add `python -m unittest discover -s tests -v` before deployment.

- [ ] **Step 6: Build locally in CI-compatible mode and inspect route structure**

Run: `python scripts/build_pages.py --output _site`
Expected required files: `_site/index.html`, `_site/legacy/index.html`, `_site/modern/modern.css`, `_site/modern/app-shell.js`, `_site/js/calc.js`, `_site/image/`.

- [ ] **Step 7: Commit**

```bash
git add scripts/build_pages.py tests/test_build_pages.py .github/workflows/pages.yml
git commit -m "build: generate modern and legacy Pages routes"
```

---

### Task 3: Implement Concept-C Modern Mode shell and responsive layout

**Files:**
- Create: `modern/modern.css`
- Create: `modern/app-shell.js`
- Create: `modern/version.js`
- Create: `package.json`
- Create: `tests/ui/modern-foundation.spec.mjs`
- Modify: `scripts/build_pages.py`

**Interfaces:**
- Consumes existing legacy globals/DOM only after legacy initialization; no formula writes.
- Produces `window.PandoraRemaked` namespace.
- Produces `PandoraRemaked.initModernShell(): void`.
- Produces `PandoraRemaked.getLegacyBuildCode(): string` using existing `Store()` without modifying state.
- Produces DOM markers: `[data-remaked-header]`, `[data-remaked-nav]`, `[data-remaked-version]`, `[data-remaked-mode="modern"]`.

- [ ] **Step 1: Write failing browser smoke tests**

Create `tests/ui/modern-foundation.spec.mjs` asserting on generated `_site/`:
- title contains `Pandora Saga Simulator`;
- `[data-remaked-header]` exists;
- Project link points to the GitHub repository;
- Updates link points to project changelog route/document;
- Legacy link resolves to `/legacy/` relative to Pages base path;
- default Modern labels render in English;
- the old dead FC2 blog link is absent from Modern primary navigation;
- at 1920×1080 and 2560×1440, header/nav right edge is not outside the main shell right edge;
- at 390×844, `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`;
- primary controls have no overlap according to their bounding rectangles;
- calling existing `Store()` before and after Modern shell initialization returns the same payload.

- [ ] **Step 2: Add a minimal Playwright test package and verify tests fail**

`package.json` contains scripts:
- `test:ui`: `playwright test tests/ui`
- `test:ui:foundation`: `playwright test tests/ui/modern-foundation.spec.mjs`

Use `@playwright/test` as a devDependency only. Run the generated site through a local static server started by the test configuration or workflow.

Run: `npm ci && npx playwright install chromium && npm run test:ui:foundation`
Expected: FAIL because Modern shell/assets do not exist yet.

- [ ] **Step 3: Implement semantic Modern header/navigation without deleting calculator nodes**

`modern/app-shell.js` must:
- add Modern mode marker/class;
- create a semantic header above the calculator;
- provide `Project`, `Updates`, `Legacy Mode` links;
- surface existing major calculator tabs in a stable Modern navigation region without changing the IDs or inline behaviors the legacy scripts use;
- surface language controls EN/JP/TW in a compact utility area, with EN selected by default;
- remove/hide the obsolete legacy top link strip only in Modern Mode;
- expose the exact namespace/functions listed in Interfaces.

- [ ] **Step 4: Implement Concept-C responsive CSS**

`modern/modern.css` must:
- center the application in a bounded shell suitable for 1080p/1440p/ultrawide;
- use light cream/pale green surfaces, moss/olive structure, restrained gold accents;
- override legacy float positioning in Modern header/navigation;
- preserve calculator content density but improve spacing/readability;
- create a mobile breakpoint that prevents body-level horizontal overflow and keeps navigation touch-reachable;
- preserve legacy element IDs and interactive hit areas.

- [ ] **Step 5: Add visible version metadata**

`modern/version.js` exposes:
- legacy engine label `2.00`;
- Remaked UI version `2026.09.1` for this first Modern release.

The shell renders both in a small non-intrusive version area.

- [ ] **Step 6: Run browser smoke tests**

Run: `npm run test:ui:foundation`
Expected: PASS at desktop and mobile viewports with zero failed assertions.

- [ ] **Step 7: Run legacy/static checks again**

Run: `python -m unittest discover -s tests -v && python scripts/validate_site.py && node --check modern/app-shell.js && node --check modern/version.js`
Expected: PASS; no preservation manifest mismatch.

- [ ] **Step 8: Commit**

```bash
git add modern package.json package-lock.json tests/ui scripts/build_pages.py
git commit -m "feat: add responsive hybrid modern shell"
```

---

### Task 4: Make repository presentation player-facing in English and Russian

**Files:**
- Modify: `README.md`
- Create: `README.ru.md`
- Create: `CHANGELOG.md`
- Create: `LICENSE`
- Modify: `NOTICE.md`
- Create: `tests/test_repository_docs.py`

**Interfaces:**
- Produces stable repository language switch links: `README.md` ↔ `README.ru.md`.
- Produces stable user links: Live Simulator, Legacy Mode, Changelog, Report Issue.
- Produces explicit license scope labels `Remaked Material` and `Legacy / Third-Party Material`.

- [ ] **Step 1: Write failing repository-document tests**

Create `tests/test_repository_docs.py` asserting:
- English README links to Russian README and Russian README links back to English;
- both READMEs link to the live simulator;
- both explain Modern vs Legacy in ordinary-user language;
- neither main README contains sections titled `Does it need Cloudflare or a database?`, `Local run`, or raw deployment architecture;
- both include concise unofficial-project attribution;
- `LICENSE` explicitly scopes restrictive terms to new Remaked material and does not claim original Pandora Saga/legacy assets/code as exclusively owned;
- `NOTICE.md` preserves original attribution/permission facts and explains the split;
- `CHANGELOG.md` contains the initial restoration and Modern foundation entries.

- [ ] **Step 2: Run documentation tests and verify they fail**

Run: `python -m unittest tests.test_repository_docs -v`
Expected: FAIL because new files/structure are not present.

- [ ] **Step 3: Rewrite `README.md` for ordinary users**

Required sections only:
- language switch (`English | Русский`);
- cover/title;
- `Open Simulator` CTA;
- short project description;
- key player-facing features;
- Modern Mode vs Legacy Mode;
- supported languages/status;
- screenshots/media placeholders only where actual app evidence exists;
- report issue link;
- concise unofficial/preservation note.

Move technical deployment/local-run/Cloudflare explanations out of the main README; leave them in Wiki/docs.

- [ ] **Step 4: Create equivalent `README.ru.md`**

Russian copy should be natural and user-facing, not a literal machine translation. EN remains primary repository language.

- [ ] **Step 5: Add user-facing changelog**

`CHANGELOG.md` starts with:
- restoration milestone;
- EN default change;
- Wiki/repository presentation milestone;
- Modern foundation release `2026.09.1`.

- [ ] **Step 6: Add restrictive new-material license boundary and update NOTICE**

`LICENSE` must permit ordinary use of the hosted simulator while reserving redistribution/modification/commercial reuse rights for new Remaked material unless written permission is granted. It must explicitly exclude legacy/original Pandora Saga material from any exclusive-ownership claim and defer those materials to their own historical permissions/rights holders.

`NOTICE.md` must clearly identify recovered legacy material, original author attribution, and the new-material boundary.

- [ ] **Step 7: Run documentation tests**

Run: `python -m unittest tests.test_repository_docs -v`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add README.md README.ru.md CHANGELOG.md LICENSE NOTICE.md tests/test_repository_docs.py
git commit -m "docs: make repository player-facing in EN and RU"
```

---

### Task 5: Integrate Phase 0–1 QA into GitHub Actions and publish

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `docs/superpowers/plans/2026-09-27-modern-foundation.md` (checkbox progress only)

**Interfaces:**
- Consumes all test/build commands from Tasks 1–4.
- Produces a deployment only after Python unit/static checks, legacy fingerprint verification, core JS syntax checks, Modern JS syntax checks, builder checks, and foundation UI smoke tests pass.

- [ ] **Step 1: Add CI commands in dependency order**

Required order before `upload-pages-artifact`:
1. `python -m unittest discover -s tests -v`
2. `python scripts/validate_site.py`
3. core legacy `node --check` commands
4. Modern `node --check modern/app-shell.js` and `modern/version.js`
5. `python scripts/build_pages.py --output _site`
6. Node dependency install suitable for locked CI (`npm ci`)
7. Chromium availability/install for Playwright
8. `npm run test:ui:foundation`

- [ ] **Step 2: Push and observe the complete Actions run**

Expected: build, deploy, and Wiki jobs conclude `success`; Pages artifact includes root Modern Mode and `/legacy/`.

- [ ] **Step 3: Rendered smoke-check the deployed URL**

Verify manually/with available browser tooling:
- desktop 1920×1080;
- desktop 2560×1440;
- mobile 390×844;
- Modern header no longer exhibits the screenshot's rightward drift;
- Legacy route loads;
- EN is default at `/`;
- JP/TW explicit language selection still functions;
- Project/Updates/Legacy links resolve correctly.

- [ ] **Step 4: Record Phase 1 release in changelog if deployment evidence matches expectations**

Only after successful deployed QA, mark Phase 0–1 complete in `CHANGELOG.md` and check off completed plan items.

- [ ] **Step 5: Commit plan/changelog completion metadata**

```bash
git add CHANGELOG.md docs/superpowers/plans/2026-09-27-modern-foundation.md
git commit -m "chore: record modern foundation release"
```

---

## Phase 0–1 Completion Gate

Do not start the Equipment/Soul + Build Storage phase until all are true:

- `/` deploys Modern Mode Concept C;
- `/legacy/` deploys the preserved simulator;
- preservation manifest passes;
- Modern initialization does not change `Store()` output;
- wide-screen header layout passes browser assertions;
- 390 px mobile layout has no body-level horizontal overflow;
- dead Blog/Old-version links are replaced by meaningful navigation;
- `README.md` and `README.ru.md` are player-facing;
- restrictive new-material license boundary and legacy attribution are both explicit;
- full Actions deployment is green;
- deployed desktop/mobile smoke checks are captured/recorded.
