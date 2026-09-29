# Simple Russian Translation Workflow

**Goal:** Deliver the user's requested no-terminal Excel translation workflow before Phase 7, as Remaked UI `2026.09.7`.

**Status:** Workbook publication workflow verified in production as Remaked UI `2026.09.7`. PR #11 (`3e3227d`) delivered the workbook; PR #12 (`c5aac53`) recovered the pre-existing broken codec transport. Exact production workflow `36622163023` and live Modern/Legacy verification passed. Calculator-wide translation display continues in the separate game-term adapter plan; it is not claimed complete here.

## Accepted workflow

- One canonical `localization/translations.xlsx`, with 147 Modern UI strings and 1,617 stable game terms.
- English, Japanese and Traditional Chinese source names beside one yellow Russian input column.
- The user edits Russian values, saves `.xlsx` and uploads it through GitHub's web interface to `bonaqu_projects`.
- Pages validates inputs, generates runtime catalogs and publishes automatically. Translation-only updates must invalidate the PWA cache automatically.
- No invented Russian-client game terminology. Blank cells use existing source labels.
- Preserve Legacy calculation/data globals, build bytes and `/legacy/`.

## Implementation and evidence

- [x] Create and visually inspect the filtered, frozen-pane workbook.
- [x] Add strict stdlib XLSX parsing and source/placeholder checks.
- [x] Generate UI and game runtime catalogs during every Pages build.
- [x] Display approved equipment/Soul names in Modern search and match Russian queries.
- [x] Add beginner instructions and link them from both READMEs.
- [x] Test a real edited Russian game cell and deterministic translation-only cache invalidation.
- [x] Full Python/browser/visual/CI gates and preservation diff.
- [x] PR, squash merge, production artifact and live route verification.

## Final publication acceptance — 2026-09-29

- 53 Python tests and 78 shipped browser contracts passed locally. Both feature CI runs for PR #12 (`36621608903`, `36621613740`) and the exact production build/deploy/wiki workflow passed.
- Desktop/mobile workbook-release visual QA was inspected; the transport correction does not change the layout.
- The downloaded Pages artifact contains executable recovered codecs on both routes. All six codec runtime files passed `node --check`.
- Live workbook SHA-256 matches the repository: `51bc5741ef61659f001ed734176cc8a032e9ef0717dc024dcc69b407d65b4887`.
- Live RU shell, equipment search, unchanged build serialization/data language, service-worker control, offline Modern/Legacy boot, and compressed Legacy File save/load round-trip passed with zero page errors or failed site requests.
- Published cache fingerprint changed to `pandora-remaked-2026.09.7-897b347d2c21727f` without a manual UI-version bump.
- Preserved source files remain unchanged. The workbook has 119 approved Russian UI values and no invented approved Russian game terms.

## Production-discovered codec defect

`js/base64.js`, `js/rawinflate.js` and `js/rawdeflate.js` are preserved CodeRepos HTML pages rather than directly executable scripts. Their original code is present in numbered source tables. RED browser tests prove three startup syntax errors and a broken compressed File save/load path on both routes. The corrective build step extracts the original code into published runtime copies, leaves preserved source bytes untouched, and gates source-table completeness, generated JavaScript syntax, browser parse errors and compressed save/load round-trips.

## Display coverage

Modern UI and equipment/Soul search consume approved translations now. The same workbook includes race, class, racial skill, skill group and individual skill terms, but their calculator display adapters remain a follow-up. The guide must clearly distinguish collected terms from the surfaces currently using them.
