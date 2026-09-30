# Skill allocation and effect panels — UI16

Continuation of the approved Modern usability work after UI15 (`8ca8369`).
Do not change museum files, formulas, point budgets, class/level availability,
source IDs, saved build format or the user's approved game-name translations.

- Show full branch names, with the existing approved translation projection.
- Distinguish Adeptness and Potential. Default to native −1/+1 controls;
  one panel-wide larger-steps toggle reveals ±10/min/max. Delegate every
  action to its retained source input exactly once. Keep the source bar and
  extra point indicator nodes for engine updates; show the indicator in
  larger-steps mode without deriving another formula.
- Replace hover-only effects switching with explicit native pressed buttons.
  Keep calculated values, percentage units and next-SPR hints intact.
- Extend the translation workbook, preserving every previous cell and native
  table/filter/freeze-pane feature. Leave new game-adjacent terminology in
  English until reviewed; translate ordinary interface instructions only.
- RED contracts → minimal GREEN → exact callback/boundary parity, locale,
  load/reset, keyboard, mobile/desktop, unavailable-module fallback.
- Full Python/Chromium/three-engine/visual gates, diff against UI15, feature
  CI, squash PR, Pages exact artifact + live checks + installed PWA acceptance.

## Evidence

Local acceptance: 147 Chromium contracts, 59 Python tests, 27 three-engine
smoke checks and 26 visual cases. Actual desktop/mobile captures inspected.
Native callback/result parity covers 240 actions in both base and allocated
states, with an exact once-only callback count. Isolated actual installed
Chromium Modern/Legacy online/offline launches and skill/effect rollback pass.

Full regression exposed a fallback overlap when the layout module was missing.
The skill enhancement now requires the responsive layout marker; the original
calculator remains fully usable if it is absent. Fixed text-nowrap and source
separator-float overflows at their causes, without weakening assertions.

Workbook: all 2,837 UI15 rows and 139 Russian values preserved, five new UI
rows only (2,842 total, 141 Russian UI values, zero approved Russian game names).
Existing frozen source-ID columns and the filter table extend to A1:H2843.

Publication still requires exact feature CI, squash PR, Pages artifact/live
and isolated installed production-PWA acceptance. Annotated `v2026.09.16`
will record these exact runs and fingerprints only after they pass.
