# Changelog

All notable player-facing changes to **Pandora Saga Simulator Remaked** are recorded here.

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
