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

**Phase 7 status:** Native modal focus, skip navigation and localized on-site Updates shipped as UI `2026.09.9` in PR #14 (`816e72f`), verified through feature CI `36631948186` and production workflow/artifact/live acceptance `36632481054`. Final real media, OG/installation metadata and documentation are implemented as UI `2026.09.10`. Release completion is recorded by annotated tag `v2026.09.10`, created only after final CI/Pages artifact/live acceptance. Plan: `2026-09-29-phase-seven-release-polish.md`; gate scope: `docs/RELEASE_ACCEPTANCE.md`. No manual screen-reader or physical-device conformance claim.

Deliverable:
- polished favicon/PWA/OG/repository cover assets;
- visuals based on verified Pandora Saga references and clearly marked unofficial;
- user-facing changelog/version panel;
- real UI screenshots/GIFs in README;
- accessibility/keyboard pass;
- cross-browser smoke pass;
- final documentation cleanup and release tag.

### Later project — Cloud save

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
