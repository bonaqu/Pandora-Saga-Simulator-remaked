# Phase 7 — Release Polish and Verified Acceptance

**Approved scope:** Phase 7 of `2026-09-27-pandora-saga-modernization-design.md` and the modernization roadmap. No new backend or paid hosting.

**Status:** UI `2026.09.9` release-panel/keyboard block implemented on `codex/phase7-release-polish`, after PR #13 (`4176718`). Prior production workflow `36628855993`, its exact artifact and live acceptance were verified. Twelve local Chromium/Firefox/WebKit smoke checks pass. New code, workbook and CI gates are not published yet; Phase 7 remains incomplete until final production/media gates.

## Audit findings and remaining work

- Existing Hybrid C hero, favicon, SVG PWA icons and repository cover already ship. Preserve them; inspect actual installation/share rendering before deciding which asset needs a correction. No generic fantasy replacement.
- The header now opens the approved compact localized What's new panel, with full-changelog/report links and explicit Legacy/UI versions. Its 11 UI strings extend the workbook to 2,828 rows without changing any prior translator input.
- Player READMEs have no real UI screenshots. Add curated, current, source-language screenshots demonstrating build/search/compare, not synthetic Russian fixture names.
- RED tests exposed background focus leaks in the custom overlays. Search, Builds, Compare and Updates now use native modal dialogs, with deterministic Tab cycling, background inertness and opener restoration. Skip navigation and tooltip Escape are covered. Role/name/focus checks are browser accessibility evidence, not a manual screen-reader conformance claim; the inherited calculator is not fully remediated.
- Twelve bounded smoke checks pass locally in Chromium, Firefox and WebKit. Chromium/Firefox search inputs consumed Escape to clear a non-empty query; a scoped key handler restores the existing one-key close contract. CI installs all three engines and runs these checks.
- Visual QA exposed inherited Legacy list typography in Updates; scoped Modern list styles restore readable 15px copy. Adapter test snapshots avoid hundreds of protocol trips and Legacy's overwritten `Set`/`Array.from`; every parity assertion remains intact.
- Final documentation cleanup and release tag are pending. A tag requires all release gates, not just a green unit suite.

## Sequence and gates

1. Completed: record exact production acceptance for UI 2026.09.8 and the 2,817-row workbook.
2. Implemented after RED: native localized Updates dialog and workbook migration preserving translator input; production gate pending.
3. Implemented after RED: keyboard-only navigation, accessible roles/names/focus, background inertness and tooltip dismissal. Manual screen-reader testing remains unperformed.
4. Run existing contracts plus bounded cross-browser smoke. Keep Modern/Legacy differential and compressed save/load checks.
5. Capture and inspect release media desktop/mobile; verify OG/PWA assets from the artifact, then update player-facing docs.
6. Full CI → PR/squash → exact Pages artifact/live acceptance. Record known limits, then create the approved release tag.

The diagnostic Legacy Log and image lettering are not Russian workbook surfaces. Official Russian game names remain user-owned inputs, not guessed translations.
