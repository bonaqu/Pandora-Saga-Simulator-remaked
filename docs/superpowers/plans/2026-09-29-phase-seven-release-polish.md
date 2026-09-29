# Phase 7 — Release Polish and Verified Acceptance

**Approved scope:** Phase 7 of `2026-09-27-pandora-saga-modernization-design.md` and the modernization roadmap. No new backend or paid hosting.

**Status:** Release-panel/keyboard block shipped as UI `2026.09.9` in PR #14 (`816e72f`): feature CI `36631948186`, production workflow `36632481054`, exact artifact and live acceptance verified. Final media/installation block is implemented as UI `2026.09.10` on `codex/phase7-release-media`. Its immutable acceptance record is the annotated `v2026.09.10` tag; that tag must not be created until the final CI, Pages artifact and live gates pass. See `docs/RELEASE_ACCEPTANCE.md` for gate scope and limitations.

## Audit findings and remaining work

- Existing Hybrid C hero, favicon, SVG PWA icons and repository cover remain unchanged. Real Chrome production manifest/installability diagnostics returned no errors. Added opaque 192/512px PNG exports and 180px Apple touch icon; the original vectors remain editable sources. Added a 1200×630 real-site OG preview and absolute share metadata; no generic fantasy replacement.
- The header now opens the approved compact localized What's new panel, with full-changelog/report links and explicit Legacy/UI versions. Its 11 UI strings extend the workbook to 2,828 rows without changing any prior translator input.
- Both player READMEs now include real production UI 2026.09.9 captures of equipment search, example comparison and mobile build management, with provenance and original game names. A repeatable capture script uses isolated browser storage. README reference/alt/SVG audits pass; all four new image surfaces were visually inspected.
- RED tests exposed background focus leaks in the custom overlays. Search, Builds, Compare and Updates now use native modal dialogs, with deterministic Tab cycling, background inertness and opener restoration. Skip navigation and tooltip Escape are covered. Role/name/focus checks are browser accessibility evidence, not a manual screen-reader conformance claim; the inherited calculator is not fully remediated.
- Twelve bounded smoke checks pass locally in Chromium, Firefox and WebKit. Chromium/Firefox search inputs consumed Escape to clear a non-empty query; a scoped key handler restores the existing one-key close contract. CI installs all three engines and runs these checks.
- Visual QA exposed inherited Legacy list typography in Updates; scoped Modern list styles restore readable 15px copy. Adapter test snapshots avoid hundreds of protocol trips and Legacy's overwritten `Set`/`Array.from`; every parity assertion remains intact.
- Updated release/architecture/deployment/media documentation and bounded precache policy. The OG image is served online but excluded from offline precache. Final production gate and annotated release tag remain publication steps, not implied by a green unit suite.

## Sequence and gates

1. Completed: record exact production acceptance for UI 2026.09.8 and the 2,817-row workbook.
2. Shipped after RED: native localized Updates dialog and workbook migration preserving translator input; production gate passed in workflow `36632481054`.
3. Implemented after RED: keyboard-only navigation, accessible roles/names/focus, background inertness and tooltip dismissal. Manual screen-reader testing remains unperformed.
4. Shipped: 95 browser contracts, 54 Python tests, 12 cross-browser checks and 17 visual captures; CI and live Modern/Legacy differential boundaries, offline and both compressed save/load paths passed for UI 2026.09.9. UI 2026.09.10 adds one browser image-decoding contract and three Python/media contracts (96 and 57 respectively).
5. Implemented: real release media desktop/mobile, OG/PWA image and metadata contracts; browser decode and exact dimensions pass locally. Added missing PNG/manifest MIME types in the local server after a failing browser contract; production verification remains required.
6. Full CI → PR/squash → exact Pages artifact/live acceptance. Record known limits, then create the approved release tag.

The diagnostic Legacy Log and image lettering are not Russian workbook surfaces. Official Russian game names remain user-owned inputs, not guessed translations.
