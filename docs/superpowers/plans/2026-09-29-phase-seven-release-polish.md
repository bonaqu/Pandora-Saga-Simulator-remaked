# Phase 7 — Release Polish and Verified Acceptance

**Approved scope:** Phase 7 of `2026-09-27-pandora-saga-modernization-design.md` and the modernization roadmap. No new backend or paid hosting.

**Status:** Started on `codex/phase7-release-polish`, after the workbook display extension shipped in PR #13 (`4176718`). Production workflow `36628855993`, its exact artifact and live acceptance were verified. Nine local Chromium/Firefox/WebKit smoke checks pass; CI gates for these engines have been added locally, not published yet.

## Audit findings and remaining work

- Existing Hybrid C hero, favicon, SVG PWA icons and repository cover already ship. Preserve them; inspect actual installation/share rendering before deciding which asset needs a correction. No generic fantasy replacement.
- The header currently links Updates to GitHub. The approved compact on-site What's new panel is still missing; retain a full-changelog link and explicit Legacy/UI versions.
- Player READMEs have no real UI screenshots. Add curated, current, source-language screenshots demonstrating build/search/compare, not synthetic Russian fixture names.
- Existing tests cover modal Escape and focus restoration, but do not establish complete keyboard traversal, background inertness, skip navigation or screen-reader acceptance. Test the Modern boundaries before changing them; keep the museum route untouched.
- The shipped browser contracts run Chromium. Firefox/WebKit smoke and relevant engine differences remain unverified.
- Final documentation cleanup and release tag are pending. A tag requires all release gates, not just a green unit suite.

## Sequence and gates

1. Completed: record exact production acceptance for UI 2026.09.8 and the 2,817-row workbook.
2. RED → implement a native, localized Updates dialog with full changelog/report links; add its strings through the same workbook migration, preserving translator input.
3. Verify keyboard-only navigation and accessible roles/names/focus for the Modern shell and overlays; fix confirmed defects with regression coverage. State screen-reader checks honestly when not performed.
4. Run existing contracts plus bounded cross-browser smoke. Keep Modern/Legacy differential and compressed save/load checks.
5. Capture and inspect release media desktop/mobile; verify OG/PWA assets from the artifact, then update player-facing docs.
6. Full CI → PR/squash → exact Pages artifact/live acceptance. Record known limits, then create the approved release tag.

The diagnostic Legacy Log and image lettering are not Russian workbook surfaces. Official Russian game names remain user-owned inputs, not guessed translations.
