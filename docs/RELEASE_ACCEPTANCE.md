# Release acceptance — UI 2026.09.10

This is the completion boundary for the approved Phases 0–7. Cloud save/backend is a later, separately designed project; GitHub Pages stays free/static. Official Russian game translations remain user input through the workbook.

## Immutable publication record

The annotated Git tag **`v2026.09.10`** is created only after all gates below pass. Its message records the exact feature CI run, squash merge commit, production workflow, artifact/cache/workbook fingerprints and live acceptance. It is the immutable final publication record, not a claim made before deployment. Inspect it with `git show v2026.09.10` or the repository Tags page.

The preceding keyboard/localization block shipped in PR #14 (`816e72f`), feature CI `36631948186`, production workflow `36632481054`. Its exact artifact and live UI 2026.09.9 passed workbook equality, all four native dialogs/background inertness/opener restoration, non-empty search Escape, Legacy globals/source display isolation, both offline routes and both compressed save/load paths, with no browser errors.

## Final gates

- Exact Git archive static validation and original Legacy preservation manifest; no original `index.html`, `js/`, `css/`, `image/` or preservation-source edits.
- 57 Python tests; deterministic 2,667 Legacy terms, 2,828 translation rows, 1,120 equipment, 184 Souls, 211 skills. Workbook translator input is unchanged by the media block.
- 96 shipped Chromium contracts including Modern/Legacy differential, build round trips, storage corruption/quota behavior, localization, native dialogs, image decoding and offline routes.
- 12 bounded Chromium/Firefox/WebKit smoke checks; 17 desktop/mobile visual captures. Real source-language release images and icon exports manually viewed; README image/link/alt audit.
- PR CI green for the exact feature HEAD, squash merge, Pages workflow success; download and inspect that run's artifact, not a local approximation.
- Live UI version, workbook SHA-256, OG PNG dimensions/URL/MIME, installer icons, Chrome manifest/installability diagnostics, calculation/state isolation, keyboard dialogs, offline routes and compressed saves; zero startup/runtime HTTP errors.

## Honest limits

- Browser accessibility role/name/focus evidence is not a full WCAG or manual screen-reader conformance claim. The inherited calculator is not completely semantically remediated.
- Desktop/mobile viewport QA and Chromium installability diagnostics do not claim physical iOS/Android device or OS-shell installation acceptance. The SVG/PNG/touch icon files are real, decode and have verified dimensions.
- Social metadata is verified from the actual public response; third-party messenger preview caches/refresh timing are not controlled by the project.
- Builds remain local to the current browser. Export important builds before moving devices or clearing browser storage.
- Russian game names are not guessed. Empty workbook translations use source-language fallback; the museum route, diagnostic Log and image lettering are not Russian text surfaces.

Translation instructions for ordinary users: [Russian beginner guide](LOCALIZATION_FOR_BEGINNERS.ru.md).
