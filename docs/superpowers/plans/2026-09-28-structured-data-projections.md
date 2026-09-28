# Structured Data Projections Implementation Plan

**Goal:** Ship Remaked UI `2026.09.6` with deterministic, searchable equipment, Soul and skill JSON projections generated from the preserved Legacy 2.00 runtime, while leaving Legacy JavaScript as the only calculation/data source of truth.

**Status:** In progress on `feature/structured-data-projections`.

**Architecture:** Load the built Modern route in headless Chromium so the existing Legacy scripts construct their real runtime globals. Export read-only JSON from `EquipData`, `SoulData`, `Skill` and `Name.Skill`; retain exact selector coordinates/IDs and record source-file fingerprints. Commit the generated indexes for static tooling and copy them unchanged into GitHub Pages. A deterministic `--check` gate must fail whenever Legacy inputs and committed projections diverge.

## Invariants

- Do not edit `index.html`, `js/**`, `css/**` or `image/**` Legacy source.
- Generated JSON never becomes a calculation input in this phase.
- Every equipment ID equals the existing Legacy select value `category_id * 10000 + item_index`.
- Soul IDs equal existing Legacy select values; skill coordinates map directly to `Skill[*][category_id][entry_index]`.
- Localized game data is copied as-is from JP/EN/TW runtime arrays; no Russian terms are guessed.
- Output ordering, whitespace, metadata and source hashes are deterministic across Windows/Linux.
- GitHub Pages remains static and backend-free.

## Task 1 — Runtime exporter and versioned schemas

- Share the existing bounded local runtime-page launcher between terminology and projection exporters.
- Generate `data/generated/equipment.v1.json`, `souls.v1.json` and `skills.v1.json`.
- Include schema/projection versions, Legacy engine version, Remaked UI version, source paths and SHA-256 fingerprints.
- Expose only proven semantic fields plus explicit legacy coordinates/paths; retain opaque Legacy flags/codes without inventing meanings.

## Task 2 — Consistency and regression gates

- Add Python schema, count, ID, source-hash and cross-file consistency tests.
- Add exporter `--check` and run it in feature/production CI.
- Copy generated indexes unchanged into `_site/data/generated/` and verify the Pages build contains no data scripts under `/legacy/`.
- Verify a browser can fetch all three indexes and map representative records back to the live Legacy runtime.

## Task 3 — Complete the terminology worksheet

- Preserve all existing term IDs and any approved Russian text.
- Add the 211 actual `Skill[*][category][entry][0]` names as stable `skill_entry.*` terms; the existing 25 `skill.*` entries remain skill-discipline names.
- Keep `ru_proposed` and `ru_approved` empty for new records pending official-client verification.

## Task 4 — Release and production gate

- Update version, changelog, README/data documentation and roadmap.
- Run Python, syntax, projection/terminology determinism, complete browser, visual and Legacy-preservation gates.
- PR, squash merge, inspect the exact Pages artifact and verify production JSON availability/mapping.
