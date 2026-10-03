# Modern 3.03: compact inputs and reliable review

User-approved priority: finish UI and correct reported calculation defects before
expanding custom skill learning. Keep the museum and original formula files intact.

## Acceptance

- Seven bounded native numeric controls replace 42 +/- controls in Modern only.
  Attribute allocation delegates to StatusMove; available points, race minima,
  reset/load/import/autosave and keyboard use retain native behaviour.
- Equipment remains an anchored list. Touch opening/searching survives browser
  keyboard and viewport changes; intentional outside actions still dismiss it.
- Compare can hide identical rows without changing either saved or current build.
- Header art is legible, not an accidental centre strip. Desktop-first panels
  stay compact and usable at 320/390/768/1366/1440/1920, all supported languages.
- Enkidu/Lapin do not gain Myrine's critical bonus in the corrected Modern data;
  their physical/magical protection remains native. Old pinned revisions remain
  reproducible, and any Modern-only correction is explicit and regression-tested.
- Admin editors distinguish current source values, overrides, descriptions and
  calculation effects, with a clear draft -> preview -> publish path.

## Verification and release

First reproduce each defect with a failing targeted test. Inspect root causes,
apply scoped fixes and run the related scenarios, then the full existing CI.
Review actual desktop/mobile captures. Ship through a feature PR and squash;
verify exact Pages artifact, offline/PWA and actual Worker authentication.
Numerical audit covers each source catalogue entry in a valid native context,
not a claim to test every possible combination or undocumented server formula.

## Delivered, 2026-10-03

PR30 and PR31 are published and accepted, tag `v3.03`. Final feature CI
`37128992142`, Pages `37129818426` and Worker `37129818509` passed. See
`docs/RELEASE_ACCEPTANCE.md` for exact commits, artifacts, workbook preservation,
1,560-record source audit, live six-editor preview checks, unchanged-password
slow-session login and installed/offline acceptance. Public revision 2 contains
only the two approved racial corrections; old revision 0 remains immutable.
Continue custom learning as the next bounded block, with its existing plan.
