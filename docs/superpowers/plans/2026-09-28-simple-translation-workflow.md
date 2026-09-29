# Simple Russian Translation Workflow

**Goal:** Deliver the user's requested no-terminal Excel translation workflow before Phase 7, as Remaked UI `2026.09.7`.

**Status:** Implementation and release verification in progress.

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
- [ ] Full Python/browser/visual/CI gates and preservation diff.
- [ ] PR, squash merge, production artifact and live route verification.

## Display coverage

Modern UI and equipment/Soul search consume approved translations now. The same workbook includes race, class, racial skill, skill group and individual skill terms, but their calculator display adapters remain a follow-up. The guide must clearly distinguish collected terms from the surfaces currently using them.
