# Modern desktop workspace follow-up

Scope: the owner's continued request for a compact, presentable PC calculator
after direct Worker authentication is repaired. No new balance assumptions,
Legacy edits, unrelated Cloudflare services or additional density switches.
Branch: `codex/desktop-workspace-3-01`, based on the published login correction.

## Observed baseline

Actual production at 1440×900: character 793px tall, SkillSet 824px, effects
745px, Equipment starts at y=1164. The preserved museum at the same viewport
starts Equipment around y=630. Modern also retains the same 1158px work area
at 1920px, wasting space while six attribute cards use two rows of controls
and twenty skill branches occupy a single long column.

## Implementation and evidence

- Keep the existing font, green/beige Hybrid C art and native callbacks.
- Use wider PC space; align the five native skill groups in two columns when
  both complete name/Adeptness/Potential rows fit. Keep source DOM/tab order,
  all twenty branches, both point modes and discoverable larger steps.
- Put six attribute actions in a compact row where space permits and use the
  existing three-column source-results rhythm, without hiding statistics.
- Place native next-attribute effect thresholds on the same desktop row when
  readable. Do not remove inactive effects or shrink targets to make a height
  assertion pass. Narrow layouts retain 44px primary targets and natural flow.
- TDD: desktop default workspace geometry, complete visible controls and
  unchanged source/build; then long labels/fonts, all locales, keyboard,
  boundary viewports, existing source-callback parity and regression suites.
- Full CI, desktop/mobile rendered inspection, diff against production,
  squash/Pages publication and exact artifact/live/PWA gates precede release.

Authentication correction is published as PR25. Its real direct native login,
authorized read, logout and logged-out reload passed Chromium/Firefox/WebKit.
Windows WebKit's documented SameSite reporting limitation is not represented
as physical Safari cookie-policy acceptance. See the release ledger.

Status: baseline measured; implementation and final release gates pending.
