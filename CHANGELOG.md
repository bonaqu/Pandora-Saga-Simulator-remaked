# Changelog

All notable player-facing changes to **Pandora Saga Simulator Remaked** are recorded here.

## 2026.09.10 — Release media and installation metadata

- Added real desktop/mobile screenshots to both player READMEs: compatible equipment search, example build comparison and mobile build management. They were captured from verified production UI 2026.09.9, not mockups or invented Russian game names.
- Added an absolute Open Graph image URL, descriptive unofficial-project metadata and a large-image sharing card. The image shows the real Modern calculator with the approved Pandora artwork; it is not required for the offline precache.
- Added opaque PNG exports of the existing PWA icons and a 180px Apple touch icon, keeping the vector sources and original design. Browser image decoding and exact dimensions are regression-tested.
- GitHub Pages remains free and static. The Legacy source, formulas and translation workbook are unchanged in this release.

## 2026.09.9 — On-site updates and keyboard-safe Modern dialogs

- Added an EN/RU What's new panel with current engine/UI versions, feature highlights, full changelog and report links.
- Search, Build Manager and Compare now use native modal dialogs: background controls are inert, Tab/Shift+Tab stays inside, Escape closes and returns focus to the opener. Focused stat help dismisses before its parent dialog.
- Added a first-focusable Skip to calculator link and platform-native keyboard focus indicators.
- Extended the translation workbook to 2,828 rows without changing any existing input. The 11 new interface strings include Russian copy; official game names remain user-owned.
- Added Chromium/Firefox/WebKit smoke gates for both Legacy/Modern compressed save/load and mobile Russian search.

## 2026.09.8 — Workbook translations throughout the Modern calculator

- Expanded the same workbook to 2,817 rows, preserving all 119 existing approved UI translations: 150 UI strings, 1,617 core game terms, 259 inherited labels, 158 hints and 633 skill-detail fields.
- Added Modern-only display adapters for race/class/racial skill, equipment/Soul lists, skill names, descriptions, requirements, calculator labels and hints. Blank Russian fields retain the chosen source language; no official Russian game translations were invented.
- Preserved Legacy arrays, formulas, selected values, compressed build bytes and existing help-node focus/listeners. The museum route and diagnostic Log output remain unchanged.
- Updated the beginner guide with the complete table workflow and current display coverage.

## 2026.09.7 — One Excel file for Russian translations

### Added
- A single editable `localization/translations.xlsx` with 1,764 rows: 147 Modern UI strings and 1,617 game terms, including all 211 actual skills. English, Japanese and Traditional Chinese source names sit beside the yellow Russian input column.
- A beginner's Russian guide covering download, editing, GitHub upload, automatic deployment and common errors without terminal commands.
- Approved Russian equipment and Soul names in Modern search, with matching by both source and Russian names. Other game terms are collected in the same workbook for subsequent display adapters.

### Reliability
- Every Pages build validates stable IDs, source columns, row coverage and UI placeholders before generating runtime catalogs. Invalid uploads leave the previously published site available.
- Translation-only changes now alter the service worker cache fingerprint automatically, so offline installations receive the updated catalogs without a manual app-version edit.
- English fallback, Legacy data, calculation formulas and serialized builds are preserved.

### Corrected after production inspection
- Recovered the original Base64 and DEFLATE libraries from the source-code tables inside the archived CodeRepos HTML pages. The Pages builder emits executable JavaScript for Modern and Legacy routes while retaining the archival repository files byte-for-byte.
- Restored the preserved compressed File save/load path and removed its three startup syntax errors. CI now gates browser parse errors, compressed save/load round-trips and generated codec syntax.

## 2026.09.6 — Versioned Legacy data projections

### Added
- Deterministic read-only JSON indexes for 44 equipment categories / 1,120 equipment records, 184 Souls and 25 categories / 211 actual skills.
- Exact mappings back to existing Legacy equipment selector values, Soul IDs and nested skill coordinates.
- Explicit schema, projection, Legacy engine and Remaked UI versions plus cross-platform SHA-256 fingerprints of every Legacy source file used by each index.
- Static Pages delivery under `data/generated/` for future search and tooling without a backend.

### Corrected
- The Russian terminology worksheet now contains 1,617 stable terms. It adds all 211 actual skill names as `skill_entry.*` while preserving the original skill-discipline and other term IDs.

### Reliability
- Feature and production CI regenerate all three indexes from the live Legacy runtime and reject stale committed output.
- Browser contracts fetch the published JSON and map representative records back to `EquipData`, `SoulData` and `Skill`.
- Legacy JavaScript remains the only calculation/data source of truth; generated JSON is not loaded as a calculator engine and `/legacy/` receives no Modern projection scripts.

## 2026.09.5 — Russian interface and terminology workflow

### Added
- A separate **EN / RU interface language** switch for Modern Mode. It does not change the preserved JP/EN/TW game-data language or character build bytes.
- Russian UI copy for the persistent shell, Equipment/Soul Search, Build Manager, Compare Builds, mobile controls and PWA install/update controls.
- English fallback for any Modern string that is not yet present in the Russian catalog.
- A reviewable terminology worksheet containing 1,406 stable Legacy terms: races, racial skills, jobs, skill lines, equipment categories, equipment and Souls.

### Translation safety
- Legacy game names remain unchanged until their official Russian-client equivalents are supplied and approved by the user.
- The terminology export keeps stable Legacy paths and JP/EN/TW source values; proposed and approved Russian game-term fields start empty.
- Deterministic export validation blocks stale worksheets, duplicate IDs and carrying an approved translation across a changed English source.
- UI locale persistence fails open when browser storage is unavailable and never blocks the calculator.

## 2026.09.4 — Mobile polish and offline PWA

### Added
- A compact sticky character summary on phone screens, sourced through the existing Legacy adapter.
- Collapsible legacy detail cards and mobile equipment rows that keep item and Soul selectors reachable without horizontal page overflow.
- Installable PWA metadata and root-scoped offline support for both Modern Mode and the preserved `/legacy/` route.
- A non-blocking `New version available — Reload` notice when a newly downloaded app version is ready.

### Reliability and local data
- The service worker precaches the calculator core and small interface assets while leaving external requests and the bulk item-icon library out of the required offline bundle.
- Updates activate only after the player chooses Reload; the existing Remaked autosave is flushed before the page changes.
- Offline reloads retain the serialized Legacy build in the current browser, and missing optional item icons do not prevent the calculator from starting.
- All autosaves, named builds and cached app files remain local to the browser. No account, backend or cross-device sync was added.
- Mobile, PWA, real offline, preservation and production-artifact contracts are gated in CI.

## 2026.09.3 — Compare Builds and safe diagnostics

### Added
- **Compare Builds** for selecting two named builds and viewing their legacy-calculated stats side by side.
- Neutral `Build B − Build A` deltas with explicit higher/lower/unchanged direction only; the UI does not claim that a larger or smaller number is inherently better.
- Accessible stat help controls in the comparison table with conservative definitions and the exact Legacy 2.00 output node used as their source.
- Desktop and 390px mobile visual QA captures for Compare Builds.

### Reliability
- Build comparison evaluates both serialized builds through the preserved legacy calculation path and restores the active character afterwards.
- Comparison is covered against the Legacy route with representative serialized-build differential fixtures.
- Comparing builds does not replace the legacy `localStorage.file`, named-build storage or autosave data.
- Empty, unavailable and non-numeric legacy outputs do not produce invented numeric deltas.
- Stat help deliberately avoids unverified formula decomposition; equipment, attribute and buff contributions are not claimed unless they are explicitly verified later.
- Feature and production CI gate the complete Phase-3 browser suite before release.

## 2026.09.2 — Search and local builds

### Added
- **Equipment Search** over the item options already considered compatible by the legacy simulator, with name and level filters.
- **Soul Search** for the Soul sockets and options currently exposed by the legacy simulator.
- Automatic local autosave with compatible-session recovery after refresh.
- **Build Manager** for saving, loading, renaming, duplicating and deleting multiple named builds.
- Import and export of the exact legacy serialized build code, without requiring a backend or account.
- Desktop and 390px mobile visual QA captures for the main Modern shell, Equipment Search and Build Manager.

### Reliability
- Added browser contracts for the legacy adapter, search behavior, local storage, autosave recovery, named-build CRUD and import/export.
- Feature and production CI now run the complete shipped Phase-2 browser suite before visual QA or Pages deployment.
- Legacy calculation files remain protected by preservation fingerprints and are not modified by these Modern features.

### Local data
- Autosave and named builds stay in this browser's `localStorage` in this phase.
- Remaked storage uses separate keys and does not replace or delete the legacy simulator's `localStorage.file` value.
- There are no cloud accounts, server-side build storage or cross-device sync in this release.

## 2026.09.1 — Modern foundation

### Added
- New **Modern Mode** as the primary GitHub Pages experience.
- Preserved **Legacy Mode** at `/legacy/` for the original simulator interface and behavior reference.
- Hybrid Light Modern visual shell inspired by the original green Pandora Saga Simulator.
- Responsive top navigation for desktop, ultrawide and mobile screens.
- English as the Modern Mode default while retaining JP/TW switching from the legacy calculator.
- Project, Updates and Legacy Mode navigation with dead historical links removed from the primary interface.
- Player-facing English and Russian repository pages.
- Preservation fingerprints and automated checks to detect accidental legacy-engine changes.
- Browser smoke tests for layout, language controls, legacy tabs and serialized build compatibility.

### Preserved
- Legacy calculation files and their existing game-data behavior remain the calculation source of truth.
- Historical attribution for the recovered Pandora Saga Simulator remains documented in `NOTICE.md`.

### Next
- Russian localization workflow with user-verified in-game terminology.
- Reproducible structured-data projections while retaining the Legacy calculation source of truth.
