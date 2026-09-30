# Release acceptance — Calculator readability UI 2026.09.15

UI15's scope is recorded in
`superpowers/plans/2026-09-30-calculator-readability.md`. It corrects calculator
descendant fonts, adds source-delegating native character controls and reflows
primary sections. Publication is accepted only after feature CI, Pages exact
artifact/live verification and isolated installed-PWA online/offline checks.
Annotated **`v2026.09.15`** records the successful runs and fingerprints when
those gates pass; absence of that tag means acceptance is still pending.

The translation workbook and all Legacy files must remain identical to UI14.
Physical iOS/Android devices, screen-reader acceptance and complete WoB balance
parity are not asserted. Dense skill-allocation arrows, horse/effect controls
and some secondary source panels remain a separate usability follow-up.

## Historical Equipment follow-up — UI14

UI12 shipped in PR #17, feature HEAD `12fffd4dd3a28877d66ac0eab5c631415149d911`,
feature CI `36658390600`, squash `edfb202d58b9f8e0e1b7866e15c73d4aaf443559`
and Pages `36658979809`. Passed: 57 Python, 119 Chromium, 18 three-engine and
21 visual checks; exact artifact and live Equipment/hover/load/share/offline
acceptance. All 459 Legacy files and the translation workbook remain unchanged.
Artifact SHA-256: `396b919cf3c8d82513d3e0b2e7d423debdb14f6e4e8c8528493f84d5d1781ff1`;
cache: `pandora-remaked-2026.09.12-c14cb1612004a7bc`.

Additional keyboard QA found automatic scrolling could close an off-screen
item's focused card. Further user feedback requested compact anchored dropdowns
instead of Equipment modals and removal of repeated Characteristics rows. UI13
addresses these together; gates are tracked in
`superpowers/plans/2026-09-30-equipment-picker-followup.md`. Final acceptance is
recorded by annotated **`v2026.09.14`**, created only after exact feature CI,
Pages artifact, live-site and isolated installed-PWA verification. Its message
records those run IDs and fingerprints. If the tag does not exist, these final
gates are not complete. Earlier releases do not substitute for UI14 gates.

UI13 published through PRs #18/#19, final feature CI `36687313590` and Pages
`36687944657` (squash `e0371ff4caad94610642b27ce8220703a7b2453a`). Its 126
Chromium/57 Python/21 three-engine/22 visual checks and live site acceptance
passed; all 459 Legacy files stayed identical. Final installed-app acceptance
then exposed a late pointer-focus scroll closing an explicitly opened card.
No `v2026.09.13` acceptance tag was created. UI14 corrects that event-ordering
defect and the hover-to-explicit pinning behavior; it must pass the same gates.

## Historical UI11 release record

This is the completion boundary for the approved Phases 0–7. Cloud save/backend is a later, separately designed project; GitHub Pages stays free/static. Official Russian game translations remain user input through the workbook.

## Immutable publication record

The annotated Git tag **`v2026.09.11`** is created only after all gates below pass. Its message records the exact feature CI run, squash merge commit, production workflow, artifact/cache/workbook fingerprints and live acceptance. It is the immutable final publication record, not a claim made before deployment. Inspect it with `git show v2026.09.11` or the repository Tags page. Final acceptance was deferred to include the user's UI, item-preview and sharing requests.

The preceding keyboard/localization block shipped in PR #14 (`816e72f`), feature CI `36631948186`, production workflow `36632481054`. Its exact artifact and live UI 2026.09.9 passed workbook equality, all four native dialogs/background inertness/opener restoration, non-empty search Escape, Legacy globals/source display isolation, both offline routes and both compressed save/load paths, with no browser errors.

## Final gates

**Passed:** PR #16 (`e0ee03d90e5ba20ee83ce774a87c75bf3ff5f3ad`), feature HEAD
`54af919c9c43d9925464771eef95d6f72a0cc730`, feature CI `36653977707`, Pages
workflow `36654352147`, exact artifact/live acceptance. Annotated `v2026.09.11`
exists and records fingerprints/results. All 459 Legacy files match UI10.
Real isolated desktop PWA install, both routes standalone online/offline and
uninstall also passed for production UI11. These are historical automated
release results, not acceptance of every requested interaction: subsequent user
feedback identified immediate hover previews and missing characteristics in the
actual Equipment selectors. UI12 corrected that gap; UI13 covers the later
off-screen keyboard regression described above. Current-server
complete balance parity is not claimed.

- Exact Git archive static validation and original Legacy preservation manifest; no original `index.html`, `js/`, `css/`, `image/` or preservation-source edits.
- 57 Python tests; deterministic 2,667 Legacy terms, 2,837 translation rows, 1,120 equipment, 184 Souls, 211 skills. All prior translator input is preserved; nine new interface translations were appended.
- 109 Chromium contracts including Modern/Legacy differential, build round trips, storage corruption/quota behavior, localization, native dialogs, image decoding, item descriptions/socket rings/upgrades, fresh-browser sharing, clipboard denial and offline routes. A successful shared-character load must not hide an autosave quota warning.
- 15 bounded Chromium/Firefox/WebKit smoke checks; 19 desktop/mobile visual captures including the changed surfaces. Real source-language release images and icon exports manually viewed; README image/link/alt audit.
- PR CI green for the exact feature HEAD, squash merge, Pages workflow success; download and inspect that run's artifact, not a local approximation.
- Live UI version, workbook SHA-256, OG PNG dimensions/URL/MIME, installer icons, Chrome manifest/installability diagnostics, calculation/state isolation, keyboard dialogs, offline routes and compressed saves; zero startup/runtime HTTP errors.

## Honest limits

- Browser accessibility role/name/focus evidence is not a full WCAG or manual screen-reader conformance claim. The inherited calculator is not completely semantically remediated.
- Real isolated desktop Chromium installations of production UI 2026.09.10 and UI 2026.09.11 passed standalone Modern and Legacy launches, both online and offline; they were then uninstalled without touching the user's browser/profile. This is not physical iOS/Android device acceptance. The SVG/PNG/touch icon files are real, decode and have verified dimensions.
- Social metadata is verified from the actual public response; third-party messenger preview caches/refresh timing are not controlled by the project.
- Named builds remain local to the current browser. Export important builds before clearing browser storage, or use Share build to send the current character to another browser. Anyone with the URL can read that build; this is not private/cloud storage.
- Item previews show source descriptions, not calculated stat deltas. Modern Equipment item/Soul selectors now offer read-only cards with deliberate hover, keyboard review and explicit touch disclosures. Search also provides cards but is not a new socket editor. Original native selects remain the script-unavailable fallback; museum menus stay unchanged.
- Russian game names are not guessed. Empty workbook translations use source-language fallback; the museum route, diagnostic Log and image lettering are not Russian text surfaces.
- The user clarified that Modern targets Weapons of Balance. Phases 0–7 prove the modernization against Legacy 2.00, not parity with this server's current balance. Server-specific data/formulas require a separately visible and tested compatibility layer, never a silent museum-source rewrite.

## Approved spec success-criteria audit

The 15 criteria in section 23 of the approved spec map to these maintained
contracts and evidence. Publication gates above must pass for the final tag.

| Criterion | Evidence and boundary |
|---|---|
| 1. Main desktop layout | Foundation contracts and actual desktop captures; no original floating header in Modern. |
| 2. Preserved museum | Static source manifest, self-contained `/legacy/`, byte comparison of production Legacy files. |
| 3. Matching calculations | `compare-differential.spec.mjs` and summary/adapter contracts use the same preserved engine. This is Legacy parity, not current-server parity. |
| 4. Real item/Soul IDs | Adapter/search contracts compare direct Legacy selection, exact serialized state and unchanged source arrays. |
| 5. Refresh recovery | Build Manager autosave/reload and invalid/quota handling; share load must retain write-failure warnings. |
| 6. Multiple named builds | Save/load/rename/duplicate/delete, corrupt-sibling and local-storage boundaries. |
| 7. Clear comparison | Neutral B−A deltas, projection restore, missing/corrupt build states, rendered desktop/mobile table. |
| 8. Practical mobile | 320/390/768px contracts, 44px primary touch actions, collapsible cards and explicit non-equipping item details. |
| 9. Installed/offline app | Both cached routes and update contracts; isolated real desktop Chromium install/standalone online/offline/uninstall acceptance. Physical iOS/Android remain unverified. |
| 10. EN/RU workflow | Unified language control; workbook publisher, translation-only update, edited-workbook display isolation and source fallback. User's client terms retained for future verification. |
| 11. Player READMEs | EN/RU player-facing doc tests, actual panel PNGs/provenance, reference/alt audit and rendered GitHub image check. |
| 12. Ownership boundary | Restrictive new-material LICENSE, original author's permission in NOTICE, existing art clearly unofficial. |
| 13. Visible updates | Localized Updates native dialog, version badge and full changelog link. |
| 14. Deployment gates | Feature CI and Pages workflows run static/Python/browser/data/translation checks before publishing. |
| 15. Deferred cloud | Local browser storage and URL sharing only; no accounts/backend/Cloudflare changes. |

Translation instructions for ordinary users: [Russian beginner guide](LOCALIZATION_FOR_BEGINNERS.ru.md).
