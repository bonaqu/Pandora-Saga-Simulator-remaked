# User-requested UI and usability corrections

The user's 2026-09-30 screenshots and follow-up requests authorize this block.
Do not alter preserved Legacy files or implement new calculation formulas.

**Status:** Shipped as UI `2026.09.11` in PR #16 (`e0ee03d`), feature HEAD
`54af919`, feature CI `36653977707`, production workflow/artifact `36654352147`.
The recorded UI11 release gates passed. Immutable fingerprints/results:
annotated `v2026.09.11`. User feedback subsequently identified a scope gap:
the previews exist in Search, not in the actual Equipment selection lists,
and instant hover disrupts scrolling. UI12 corrected those in PR #17, with exact
artifact/live acceptance. UI13 addresses later dropdown-density and off-screen
keyboard feedback; see `2026-09-30-equipment-picker-followup.md` and conditional
`v2026.09.13` acceptance. Earlier release evidence does not substitute for its gates.

## Acceptance

- One EN/RU/JP/TW control; exactly one active button; same serialized build.
- Modern Compare typography, no inherited Japanese bitmap-family styling.
- Matching toolbar dimensions/styles; readable noninteractive autosave status;
  desktop/tablet/mobile including 320px, with no page overflow.
- Equipment/weapon/Soul preview reads descriptions from source arrays only;
  hover/focus and a distinct touch action must not equip the item.
- Share URL must restore the actual build in a fresh browser. Valid incoming
  links override autosave intentionally; malformed links cannot destroy it.
- Clipboard denial must provide a manual copy path, not a false success.
- Existing workbook rows/translations preserved; new UI copy in the workbook.
- Full CI, cross-browser smoke, rendered desktop/mobile QA, PR and production
  artifact acceptance before claiming shipped.

## Current boundaries

The friend's original button/URL could not be identified from the report alone.
It is not evidence of a diagnosed fault in a particular existing handler.
The new sharing route supplies and regression-tests the requested user journey.
Preview descriptions are source text, not predicted build-stat changes. Native
browser select popups cannot reliably host custom per-option hover cards; the
Modern search list is the enhanced discovery surface.

Historical implementation recipes contain original RED/GREEN instructions;
unchecked old recipe steps do not establish that shipped phases are unfinished.
The repository, CI/artifacts, roadmap and acceptance documents take precedence.

## Verification before publication

Implemented unified controls/Modern typography, read-only adjacent desktop and
inline touch previews, exact socket rings/current upgrades and fresh-browser
sharing. Local verification: 109 Chromium contracts, 15 three-engine smoke
checks, 19 visual captures. Quota failure during shared-build autosave was
reproduced RED and fixed without hiding the warning. An earlier parallel-run
report-directory collision was an orchestration error; final suites run
sequentially or with distinct output directories. Original source directories
remain unchanged. Feature CI and exact production acceptance passed: 459
Legacy files byte-identical to UI10; live workbook/PNGs, languages, upgraded
item/Soul preview, fresh-browser sharing, native modals, source isolation and
both offline/compressed-save routes; no browser/HTTP errors. Real isolated
desktop Chromium install/standalone online/offline launches/uninstall passed.

User clarification: Weapons of Balance is the target server. Follow-up server
compatibility verification is separate from preserving Legacy 2.00. See
`docs/localization/RU_CLIENT_REFERENCE.md`; current balance parity is not claimed.
The user explicitly rejected restrictions based on temporary level-40/reduced
class progression: Modern retains its existing 55 levels, 28 classes and builds.
