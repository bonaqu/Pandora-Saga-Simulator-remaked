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
- [ ] Final feature CI, source-preservation and recorded screenshot review.
- [ ] PR/merge/deploy; exact artifact/live bytes and actual public PC/touch
  description interaction. Acceptance is not inferred from local tests alone.

The 18 current racial definitions, RU/EN skill-source mapping, supplied banner,
author credit and editor-learning follow-ups remain in TASK_QUEUE.ru.md.
