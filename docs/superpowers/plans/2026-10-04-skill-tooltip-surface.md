# Modern 3.06: complete skill descriptions above the floating inspector

Owner's screenshot shows the native learned-skill description cut off at the
SKILL list's scrolling boundary. All five inspector popups remain the accepted
3.05 behavior; only this description surface changes.

## Small implementation

- Keep native `LearnSkill_*` nodes, IDs, text, numbers and DDM open/close callbacks.
- Use a manual browser popover (top layer) to escape ancestor overflow/filter.
  Older runtimes use the same node in a temporary body portal, restored on close.
- Opaque theme-matched text, viewport-bounded placement and scrollable long text.
  Keep the skill list itself scrollable. Hover waits 450ms; pointer can move into
  the description. Focus, Enter/Space and touch have deliberate access; Escape
  dismisses the description before the inspector and restores the icon's focus.
- Panel close/switch, outside activation, list rebuild and source scroll must not
  leave a floating orphan or duplicate native IDs. No game-data publication.
- Do not change Legacy, formulas, catalog revisions, workbook or current data.

## Gates

- [x] Reproduce the old immediate native description after fixing the fixture's
  mistaken skill ID. Bash is `skill.0.15`, not `skill.0.6` (Obscene Gesture).
- [x] Four focused tests: hover/paint outside clipping boundary, keyboard/long
  text, real touch context, portal fallback/rebuild cleanup.
- [x] 42 related browser checks and all 64 Python checks pass locally.
- [x] Targeted Chromium/Firefox/WebKit paint/dismiss checks pass (three tests).
- [x] Final feature CI `37156610968` passes at feature HEAD
  `3b56c972bd333c4179691bb72c09a477a516a268`; source-preservation and
  the actual CI desktop screenshot reviewed. Main report: 207 expected,
  zero skipped, unexpected or flaky results.
- [x] PR37 squash `01258c6236856f2dbbdd8aa6744b8304f3defefa`; Pages
  `37157943717` and Worker `37157943710` succeeded. All 23 sampled live files
  match the Pages artifact; all 459 museum files and the workbook remain unchanged.
  Actual public PC/touch and new-module offline description checks pass; screenshots
  inspected. See RELEASE_ACCEPTANCE.md for helper corrections and explicit limits.

The 18 current racial definitions, RU/EN skill-source mapping, supplied banner,
author credit and editor-learning follow-ups remain in TASK_QUEUE.ru.md.
