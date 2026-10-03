# Pandora Saga Simulator Remaked — Implementation Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each phase plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved modernization spec as a sequence of independently testable releases without changing legacy calculator semantics.

**Architecture:** Keep the recovered simulator as the calculation source of truth and preservation baseline. Build Modern Mode around it through deterministic page generation, a narrow adapter, modern CSS/JS modules, and progressively extracted read-only indexes. Each major subsystem gets its own implementation plan and test gate.

**Tech Stack:** Static HTML/CSS/JavaScript, existing legacy JavaScript engine, Python 3 standard library for build/validation scripts, GitHub Actions, GitHub Pages, browser smoke tests, Web App Manifest + Service Worker.

**Spec:** `docs/superpowers/specs/2026-09-27-pandora-saga-modernization-design.md`

## Global Constraints

- `/` is Modern Mode; `/legacy/` is the preserved historical simulator.
- English is the default language; JP/TW remain supported; RU is added only with user-verified game terminology.
- Legacy formulas/data remain the calculation source of truth until explicitly changed under regression coverage.
- GitHub Pages remains the only required hosting for the current roadmap.
- Cloud save/backend work is excluded until the local/offline roadmap is complete.
- New Remaked code/assets use restrictive project terms; recovered legacy material retains accurate historical attribution/permissions.
- Player-facing README content stays focused on ordinary users; developer infrastructure belongs in Wiki/docs.

## Review Focus

1. **State compatibility:** a build serialized before modernization must still load and calculate the same values after modernization.
2. **Wide/mobile layout:** 1080p, 1440p, ultrawide, and narrow phone widths must not recreate the old floating-header/clipping bug.
3. **Storage failure/corruption:** localStorage unavailable, full, or containing malformed records must not make the calculator unusable.
4. **Language fallback:** missing RU translations must fall back to English without corrupting legacy EN/JP/TW data selection.
5. **Offline/update behavior:** a stale service-worker cache must not trap users on an unusable version or discard an in-progress build.

---

## Phase Plans

### Phase 0–1 — Preservation baseline + Modern Mode foundation

**Plan:** `docs/superpowers/plans/2026-09-27-modern-foundation.md`  
**Status:** Shipped to `bonaqu_projects` in `5f0d00c739f6c0ae779093d0234b87d46fa3228e`; production Pages build/deploy and Wiki sync passed.

Deliverable:
- deterministic Pages builder;
- `/legacy/` preservation route;
- `/` Modern Mode Concept C shell;
- corrected responsive header/layout;
- meaningful Project / Updates / Legacy navigation;
- EN default in Modern Mode;
- player-facing `README.md` + `README.ru.md`;
- initial restrictive-license boundary and updated NOTICE;
- foundation smoke tests.

### Phase 2 — Equipment/Soul discovery + build storage

**Plan:** `docs/superpowers/plans/2026-09-27-search-builds.md`  
**Status:** Shipped to `bonaqu_projects` in `541077f4c2cb606391fcaedd4e29828bc16a905e` as Remaked UI `2026.09.2`.

Deliverable:
- adapter-backed equipment and Soul search;
- trustworthy filters only;
- autosave;
- named builds;
- rename / duplicate / delete / recovery;
- versioned namespaced localStorage records;
- corrupted-storage tests.

### Phase 3 — Compare Builds + safe diagnostics

**Plan:** `docs/superpowers/plans/2026-09-27-compare-diagnostics.md`  
**Status:** Shipped as Remaked UI `2026.09.3` in PR #3 (`35aca9a`); the follow-up hero restoration shipped in PR #4 (`6b1d086`).

Deliverable:
- Build A vs Build B selection;
- summary/delta table generated through the legacy calculation path;
- initial stat-definition/source tooltips with exact Legacy output-node provenance;
- no unverified numeric decomposition claims;
- Modern-vs-Legacy differential fixtures;
- desktop and 390px Compare visual QA.

### Phase 4 — Mobile polish + PWA/offline

**Plan:** `docs/superpowers/plans/2026-09-27-mobile-pwa.md`
**Status:** Shipped as Remaked UI `2026.09.4` in PR #5 (`0e6cd1b`). Production workflow `36390367797`, its exact Pages artifact and live Modern/Legacy offline routes were verified on 2026-09-28.

Deliverable:
- phone/tablet interaction polish;
- sticky compact summary;
- collapsible advanced sections;
- manifest/icons;
- service worker;
- offline boot;
- non-blocking update notification.

### Phase 5 — Russian localization framework

**Plan:** `docs/superpowers/plans/2026-09-28-russian-localization-framework.md`
**Status:** Shipped as Remaked UI `2026.09.5` in PR #7 (`58925ed`). Production workflow `36394028338`, its exact Pages artifact and live EN/RU state-isolation, persistence and Modern/Legacy offline routes were verified on 2026-09-28. The deterministic 1,406-term review worksheet is complete; official Russian game-term integration remains intentionally gated on user verification.

Deliverable:
- Modern UI string catalog;
- translation extraction tooling;
- human-editable RU worksheet/data files;
- RU shell translation;
- EN fallback;
- exported complete list of game terms for user correction;
- final full RU game terminology integrated only after user verification.

### Phase 6 — Structured data projections

**Plan:** `docs/superpowers/plans/2026-09-28-structured-data-projections.md`
**Status:** Shipped as Remaked UI `2026.09.6` in PR #9 (`eccdda4`). Production workflow `36433459517`, its exact Pages artifact and live Modern/Legacy routes were verified on 2026-09-28. Deterministic projections contain 1,120 equipment, 184 Soul and 211 actual skill records; the terminology worksheet now covers 1,617 stable terms.

Deliverable:
- reproducible exporters for equipment/Soul/skill read-only JSON indexes;
- legacy IDs preserved;
- version metadata;
- build-time consistency checks;
- legacy JS remains calculation source of truth.

### Phase 7 — Brand, changelog, media, final QA

**Before Phase 7:** The user requested a beginner-friendly, single-Excel Russian translation workflow. Its foundation shipped as UI `2026.09.7` (PR #11) and codec recovery (PR #12), verified through workflow `36622163023`. The calculator display extension shipped as UI `2026.09.8` in PR #13 (`4176718`), with 2,817 workbook rows preserving prior input. Production workflow `36628855993`, exact Pages artifact and live workbook/state/offline/compressed-save acceptance were verified on 2026-09-29. Plans: `2026-09-28-simple-translation-workflow.md` and `2026-09-29-game-term-display-adapters.md`.

**Phase 7 status:** Native modal focus, skip navigation and localized on-site Updates shipped as UI `2026.09.9` in PR #14 (`816e72f`), verified through feature CI `36631948186` and production workflow/artifact/live acceptance `36632481054`. Real media, OG/installation metadata and documentation shipped as UI `2026.09.10` in PR #15 (`f7771dd`), feature CI `36633848793`, production workflow/artifact/live acceptance `36634171950`. The user's UI consistency, item/Soul preview and sharing follow-ups extend final acceptance to UI `2026.09.11`; see `2026-09-30-ui-item-sharing.md`. Release completion is recorded by annotated tag `v2026.09.11`, created only after final CI/Pages artifact/live acceptance. Plan: `2026-09-29-phase-seven-release-polish.md`; gate scope: `docs/RELEASE_ACCEPTANCE.md`. No manual screen-reader or physical-device conformance claim.

Deliverable:
- polished favicon/PWA/OG/repository cover assets;
- visuals based on verified Pandora Saga references and clearly marked unofficial;
- user-facing changelog/version panel;
- real UI screenshots/GIFs in README;
- accessibility/keyboard pass;
- cross-browser smoke pass;
- final documentation cleanup and release tag.

### Verified final acceptance and current-server references

**Verified Phase 7 completion:** UI `2026.09.11`, PR #16 (`e0ee03d`), feature CI
`36653977707`, Pages `36654352147`, exact artifact/live acceptance and isolated
real desktop PWA install all passed. Annotated `v2026.09.11` now exists and
records fingerprints/limits. The preceding conditional tag wording describes
the release gate; the gate has passed.

**Current-server reference follow-up:** Weapons of Balance is the target. The
Human/W2g level-40 baseline matches HP/MP/attributes and point budgets, not proof
of full balance parity. Client terminology/server observations are recorded in
`docs/localization/RU_CLIENT_REFERENCE.md`. The user confirmed temporary server
caps must NOT restrict Modern; retain 55 levels, all 28 classes and saved builds.

**Equipment follow-up:** UI12 shipped actual Equipment characteristic cards,
450 ms hover intent, manual-scroll cancellation, responsive equipment controls
and Legacy cache refresh corrections in PR #17 (feature CI `36658390600`, Pages
`36658979809`, exact artifact/live acceptance). Further QA exposed off-screen
keyboard auto-scroll closing a focused card; UI13 corrects it. The plan is
`2026-09-30-equipment-picker-followup.md`; final UI13 publication evidence is the
annotated `v2026.09.14`, created only after its own release gates pass. UI13's
artifact/live acceptance passed, but real installed-app review exposed late
pointer-focus scroll cancellation of an explicitly opened card; UI14 corrects
it before final Equipment follow-up acceptance.

**Calculator readability follow-up:** UI15 fixes inherited descendant fonts,
adds native level/attribute/reset/options controls using retained callbacks and
reflows primary sections for phones. Scope/acceptance is in
`2026-09-30-calculator-readability.md`; the annotated `v2026.09.15` records final
feature-CI/Pages artifact/live/installed-PWA acceptance only after those gates
pass. All 55 levels/28 classes and the translation workbook remain intact.
Dense skill allocation, horse/effect controls and secondary source panels are
still usability follow-ups, not proof of universal mobile accessibility.

### Later project — Cloud save

**Approved Modern 3.00 extension:** The user has separately authorized a secure
Cloudflare Worker/D1 administrator CMS (not player cloud saves), editable English
workbook overrides, compact desktop UI and FILE/LOG consolidation. Current scope
and remaining acceptance gates are in `2026-09-30-modern-3-admin.md`. Worker auth
and initial editors, revision-pinned consumer and Modern 3.00 were published
through PR24 on 2026-10-01. Direct Worker-native login was fixed and accepted in
PR25. The owner's additional compact PC workspace is published as Modern 3.01
through PR26, tag `v3.01`; Pages `37075816244` and Worker `37075816303` passed.
The desktop plan and release ledger record full CI, exact artifact/live checks,
unchanged source/workbook, shared recipient, installed offline PWA and real login.
Exact gates are recorded in `docs/RELEASE_ACCEPTANCE.md`; museum engine and
player cloud-save scope stay unchanged.

**Next approved block, published:** Modern 3.02 in PR28 (`6af7bc5`)
adds source-template active/passive variants with stable IDs, native learning
gates, conditional typed bonuses, non-overlapping keyboard skill details and
ten editable workbook captions. See `2026-10-03-skill-catalog-additions.md` and
the Russian beginner guide `docs/ADMIN_NEW_SKILLS.ru.md`. Feature CI `37082164957`,
API `37082164962`, Pages `37083172767` and Worker `37083172764` passed. The exact
artifact, live bytes, installed/offline PWA, shared recipient and real direct /
Pages-entry authentication were accepted without publishing sample game data.
New classes, custom learning rules and new combat mechanics remain unfinished.
The next native custom-learning investigation is recorded in
`2026-10-03-custom-skill-learning.md`; it is not yet an implemented capability.

**User-prioritized follow-up, published and accepted:** Before custom learning, finish
Modern 3.03 compact numeric inputs, bounded source inspectors, touch Equipment,
equal-row comparison, approved racial corrections and current-vs-preview admin
editing. Plan: `2026-10-03-compact-inputs-and-review.md`. PR30 and PR31, tag
`v3.03`: final feature CI `37128992142`, Pages `37129818426`, Worker
`37129818509`; exact artifact/live files, unchanged museum, real six-editor
previews, native login on a slow connection, sharing and installed offline PWA
passed. Catalog revision 2 contains only the approved two racial corrections;
old revision 0 remains reproducible. The owner's subsequent Hybrid C example
prioritizes composition refinement before custom learning; its differences from
the broad PC workbench and remaining release gates are recorded in
`2026-10-03-hybrid-c-composition.md`. Do not repeat the completed 3.03 mechanics.

**Hybrid C follow-up, published and accepted:** Modern 3.04, PR33
(`f4cd755`), final Feature CI `37137877994`, API `37137878003`, Pages
`37138983439`, Worker `37138983447`. Compact sections, native floating JOB/SKILL,
field-specific feedback, aligned BUFF rows and responsive discovery passed full
CI and exact production/installed-offline/auth acceptance. See the release ledger.
The owner's corrected 2026-10-03 current-data request is the next priority:
all 18 RU/EN racial passives and current skills, retaining all future skills and
level 55, without duplicates or museum edits. Myrine's newly specified +5% is
not part of the older revision-2 acceptance. Custom learning/new classes remain
in the queue; the expanded request does not cancel that unfinished work.

Not part of this roadmap's implementation plans. Requires a new design/spec after Phases 0–7 are stable.

---

## Release Gates

Each phase may proceed only when:

- its targeted automated tests are green;
- GitHub Pages build/deploy is green;
- no regression is found in the phase's preserved legacy checks;
- user-visible changes have a rendered smoke check at the target viewport(s);
- documentation/changelog reflects shipped user-visible behavior.

## Work-history policy

- Detailed internal execution history lives in this roadmap, phase plans, spec files, commit history, and Actions logs.
- Public Issues are reserved for useful player-facing bugs/features rather than hidden internal planning, because closed public Issues/PRs remain visible.
- Completed plan checkboxes and commits provide the durable work log without cluttering the public issue tracker.
