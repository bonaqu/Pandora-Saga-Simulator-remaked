# Russian Localization Framework Implementation Plan

**Goal:** Ship Remaked UI `2026.09.5` with a first-class EN/RU Modern interface, deterministic translation catalogs and a user-reviewable export of Legacy game terminology, without changing or guessing Legacy game data.

**Status:** Release-ready on `feature/russian-localization-framework`; production PR/artifact/live verification remain before marking the framework shipped. The exported official-game-term fields intentionally remain empty pending user review.

**Architecture:** Keep UI locale separate from the preserved JP/EN/TW Legacy data language. Build validated JSON UI catalogs into a synchronous Modern runtime bundle, expose one namespaced translation API with English fallback, and let components update live on locale changes. Export Legacy terminology from the built calculator through its existing runtime data into stable machine-readable JSON and CSV; leave the approved Russian field blank until the user supplies official-client terms.

## Invariants

- English remains the default Modern UI locale.
- RU UI changes never change `Flag[0]`, serialized build bytes, formulas or Legacy source files.
- Missing RU UI strings fall back to the English source string.
- JP/EN/TW continue to select only the preserved Legacy data language.
- Game-term translations are never guessed or shown as approved.
- GitHub Pages remains the only required hosting.

## Task 1 — Catalog runtime and separate UI locale switch

- Add validated `localization/ui.en.json` and `localization/ui.ru.json` sources.
- Generate `modern/locales.js` during the deterministic Pages build.
- Add `modern/i18n.js` with locale detection, English fallback, interpolation, safe persistence, DOM binding and locale-change events.
- Add a separate EN/RU UI switch while retaining JP/EN/TW Legacy data controls.
- Translate the persistent Modern shell live and preserve build bytes/data language.
- Gate default, fallback, persistence and isolation behavior in Playwright and Python tests.

## Task 2 — Localize feature surfaces

- Route Search, Build Manager, Compare Builds, tooltips, mobile controls and PWA controls through the shared catalog.
- Keep dynamic game names from the Legacy adapter untranslated until approved mappings exist.
- Re-render or update open surfaces on locale change without losing in-memory build state.
- Add keyboard/mobile regression contracts for the RU interface.

## Task 3 — Deterministic Legacy terminology export

- Add a browser-backed exporter that reads the real Legacy runtime and emits stable term IDs, category, English source, JP/TW references and empty `ru_approved` values.
- Cover races, racial skills, jobs/classes, skills, equipment and Souls where stable IDs can be proven.
- Emit machine-readable JSON plus a UTF-8 CSV worksheet for human review.
- Add validation for stable sorting, unique IDs, source provenance and refusal to overwrite non-empty approved Russian values.

## Task 4 — Release and production gate

- Update Remaked UI to `2026.09.5`, changelog, EN/RU README and roadmap.
- Run Python, syntax, complete browser, extraction-determinism and visual QA gates.
- Confirm the preservation diff is empty for Legacy source files.
- PR, squash merge, exact Pages artifact inspection and live production EN/RU/offline verification.

