# User-requested UI and usability corrections

The user's 2026-09-30 screenshots and follow-up requests authorize this block.
Do not alter preserved Legacy files or implement new calculation formulas.

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
remain unchanged. Exact feature CI/production acceptance is still required.

User clarification: Weapons of Balance is the target server. Follow-up server
compatibility verification is separate from preserving Legacy 2.00. See
`docs/localization/RU_CLIENT_REFERENCE.md`; current balance parity is not claimed.
