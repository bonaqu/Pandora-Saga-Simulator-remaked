# Calculator code and riding controls — UI17

Continue approved Modern usability work after accepted UI16 (`ab41c01`).
Keep Legacy sources, formulas, arrays, saved build formats and workbook intact.

- Reproduce direct Code Load failures before changing the Modern wrapper.
- Native keyboard/touch buttons for riding and existing Create/Load/Delete.
  Riding, creation and field clearing delegate to retained callbacks once.
- Code Load uses the same validated, rollback-capable import as Build Manager,
  never compressed Legacy File storage. Invalid input preserves the character,
  autosave, saved builds and File storage; explain the error beside the field.
- Keep exact compressed code export and accept compressed or numeric CSV import.
  Keep paste and focus, source labels and approved translation projection.
- Desktop/mobile geometry, keyboard, locale/load/redraw, storage failure and
  unavailable-module fallback. Full CI, exact Pages/live and installed PWA gates.

## Evidence

RED reproduced `1,2,3` replacing the source character with incomplete fields
before a Legacy exception. Modern now shares the existing import validator and
rollback, without calling or changing `File`. Another RED contract showed
`click()` swallowing a codec exception while displaying a false export success;
Create/Delete now invoke retained DOM callbacks directly once, catching failure
and keeping prior input. Riding still delegates through the original TD click.

Local: 158 full Chromium contracts passed before the final isolated codec fix;
32 import/translation/build-manager checks passed after it, including all 12
new contracts. 59 Python, 30 three-engine smoke and 28 visual cases passed.
Final affected desktop/mobile captures were inspected; riding's obsolete table
height and wrapped percentage were corrected at the container and checked.

Actual isolated installed Chromium PWA Modern/Legacy online/offline launches,
native character/skill/riding controls, invalid/compressed code import, restored
state, Equipment review/focus return and uninstall passed. The verifier waits
for DOMContentLoaded before asserting enhancement initialization, rather than
using an early source field as proof that bottom-of-page Modern scripts ran.

The entire workbook remains identical to UI16. All three generated catalogs
change UI-version metadata only; core source/formulas/arrays are unchanged.
Windows checkout line endings differ from the LF preservation baseline, so
strict preservation validation uses a fresh Git archive and publication uses
the exact LF Pages artifact; it is not waived or weakened on Windows.

Publication still requires exact feature CI (159 Chromium including the added
codec regression), squash PR, Pages artifact/live and isolated installed
production-PWA acceptance. Annotated `v2026.09.17` will record these exact runs
and fingerprints only after they pass.
