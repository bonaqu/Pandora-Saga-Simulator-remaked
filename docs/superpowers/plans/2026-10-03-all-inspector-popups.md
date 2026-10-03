# Modern 3.05 — all five floating inspectors

Owner clarification: JOB/SKILL were examples. ATTACK/DEFENSE/BUFF must behave
the same way, not remain inline regions. This is a targeted follow-up to the
accepted 3.04 composition, not a new calculator or a cancellation of data work.

## Acceptance

- All five retained panels are non-modal dialogs with viewport-bound, opaque
  surfaces. Opening/closing never shifts the workbench or changes the build.
- The active tab closes on repeat click. Escape works within the panel and
  on its opener; the close button works by pointer/keyboard and restores focus.
- Switching tabs leaves exactly one panel open. PC/phone widths, scroll and
  short-screen resize keep the close action reachable and content scrollable.
- Original source IDs, fields and callbacks remain; museum and formulas are
  unchanged. No racial correction or publication is implied by this UI patch.
- Feature CI, exact deployed Pages artifact and live public/touch interactions
  must pass before calling the correction published and accepted.

## Evidence so far

- The strengthened existing panel test failed on ATTACK: `role="region"`
  instead of `dialog`. The cause is the Modern `tab < 2` gate, not game data.
- Reused the existing floating setup, position and dismissal for tabs 0–4.
- Local Chromium: 19 panel/foundation/data-projection checks passed, including
  six widths 320–1920 px. Actual ATTACK desktop and BUFF phone screenshots viewed.
- Local Chromium/Firefox/WebKit: the three added switching/scroll/568px-height
  checks passed. No state changes or page errors.
- 64 Python checks and deterministic source projections passed.
- Browser plugin/skill described by the frontend-testing workflow is absent;
  used the repository Playwright configuration, not a parallel browser setup.

## Remaining gates

- [x] Feature CI and source-state regression suite: 429 browser/64 Python/53 backend.
- [x] PR35/merge, exact Pages artifact, live PC/touch and installed offline app.
- [x] Record acceptance in the release ledger and durable queue.

Accepted 2026-10-04 (Europe/Moscow); runtime `03233ce`, tag `v3.05`.
Feature CI `37152907424`; Pages `37153804413`; API `37153804418`.
Live acceptance had one helper timing failure: BUFF was measured before display.
Waiting for visible fields and reading each pair atomically corrected the helper,
not the runtime; minimum height and 1px alignment assertions remain strict.
The final live checks passed with zero errors. Full evidence is in
[RELEASE_ACCEPTANCE.md](../../RELEASE_ACCEPTANCE.md).

The corrected 18-racial dataset, current RU/EN skills, banner/author credit,
independent skill-learning requirements and new-class support remain queued in
[TASK_QUEUE.ru.md](../../TASK_QUEUE.ru.md). Maximum level remains 55; future
skills must not be deleted. This change does not alter the admin account or data.
