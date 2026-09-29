# Workbook Translations Across the Modern Calculator

**Goal:** Complete the user's table-based localization request by applying approved game names throughout Modern Mode and collecting the inherited calculator's interface labels in the same workbook before Phase 7.

**Status:** Shipped as Remaked UI `2026.09.8` in PR #13 (`4176718`). Feature CI `36628459114` and `36628483316` passed for exact feature head `d107de8`. Production workflow `36628855993` built/deployed the merge; its exact Pages artifact and live site passed workbook, display/state, compressed save/load and offline acceptance on 2026-09-29. The workbook publication foundation was delivered separately as `2026.09.7`.

## Proven source mappings

- `SelRace` option values and `Status.Job[0]` identify `race.*`; `StatusRace` displays the selected name.
- `SelRSkill` option values plus the selected race identify `racial_skill.*.*`; `StatusRSkill` displays the selected name.
- `SelJob` option values and `Status.Job[2]` identify `job.*`; `StatusJob` displays the selected name. Preserve the existing job-tree prefix.
- `TextSkill_*` and the corresponding File labels identify the existing `skill.*` disciplines.
- Equipment option values encode category/item coordinates. Preserve category markers and level prefixes; localize only display names.
- Soul options use stable Soul IDs.
- `LearnSkill_category_entry` identifies individual `skill_entry.*.*` names in the learned-skill popup. Buff/heal surfaces have exact source coordinates in `create.js`/`ini.js`.
- `textset.js` maps inherited interface labels to `Name.Text`, `Name.Tab`, `Name.Option`, equipment-slot and other source arrays. These labels must join the workbook with stable IDs rather than receive hardcoded Russian strings.

## Implementation requirements

- Add a Modern-only display adapter, leaving Legacy data globals and source files unchanged.
- Read stable IDs from source state; never identify a calculation input by its translated text.
- Refresh overlays after Legacy redraws, language changes, build loads and UI locale changes. Avoid observer loops.
- Restore the selected JP/EN/TW source text when leaving RU; blank Russian fields keep source labels.
- Preserve control values/indices, listeners, icons, numeric outputs and serialized builds.
- Preserve existing workbook Russian values by stable ID and source text when adding interface rows. Reject ambiguous or stale carry-forward.
- Retain all names in the workbook. Keep missing JP/TW Modern copy blank until proper translations exist.
- Verify long Russian names, native selects, skill popups and narrow-screen wrapping in the rendered interface.

## Gates

- [x] RED tests for race/class/racial skill/group/item/Soul/individual skill display and source-language restoration.
- [x] Read-only Modern adapter and inherited interface source export.
- [x] Workbook migration preserving all existing user input: 2,817 rows and all 119 prior Russian UI values; zero invented approved game translations.
- [x] Differential calculations/build bytes and complete Legacy-global snapshots before/after RU rendering.
- [x] EN/JP/TW changes, load/compare, keyboard and mobile visual QA. Regression test proved DOM replacement lost help-node focus; in-place help updates preserve the node and other decorators' attributes/listeners.
- [x] Full local/CI checks: 54 Python, 90 browser contracts, 15 visual captures, deterministic terminology/data exports; exact Git archive preservation validation. PR/merge, exact production artifact and live workbook workflow verified.
- [x] Update beginner guide to implemented display coverage; record production acceptance in roadmap after deployment.

## Scope boundary

The original diagnostic Log text is intentionally not translated. Embedded image lettering is not editable through text cells. Native full-name titles and wrapped skill descriptions accompany fixed-width inherited rows. Original Legacy source, formula/data globals and compressed payloads remain untouched.

## Production evidence

- Published workbook SHA-256: `6d3af8fe3b1d04c26debfa1c15f266e4ce2c1e1329a031fb5755cd1ce5909852`, matching both the exact Pages artifact and live download.
- Live UI version `2026.09.8`, 119 approved RU UI strings, zero invented approved game translations.
- Ephemeral runtime fixtures confirmed names/labels, source search, EN restoration and complete Legacy-global isolation. They were removed from the browser runtime; none were added to the shipped workbook.
- Modern/Legacy offline boot, compressed File save/load and error-free runtime passed on the real Pages origin.
