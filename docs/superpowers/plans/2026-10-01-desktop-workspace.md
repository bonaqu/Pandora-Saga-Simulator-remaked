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
- Move the original riding row into existing simulation settings, keeping its
  full-width toggle, native value and callbacks. Consolidate Equipment title
  and global enchant/reset controls in one desktop header. Reduce surrounding
  desktop chrome padding, not the action targets or text size.
- Remove the repeated desktop calculator title and randomized Japanese ASCII
  joke panel from Modern presentation only. `js/common.js:Message()` confirms
  this panel is decorative, with no simulation values; museum/source remain
  intact. Keep all status pairs, effect tabs and forty-two attribute/level actions.
- TDD: desktop default workspace geometry, complete visible controls and
  unchanged source/build; then long labels/fonts, all locales, keyboard,
  boundary viewports, existing source-callback parity and regression suites.
- Full CI, desktop/mobile rendered inspection, diff against production,
  squash/Pages publication and exact artifact/live/PWA gates precede release.

Authentication correction is published as PR25. Its real direct native login,
authorized read, logout and logged-out reload passed Chromium/Firefox/WebKit.
Windows WebKit's documented SameSite reporting limitation is not represented
as physical Safari cookie-policy acceptance. See the release ledger.

Measured candidate at 1440×900: character 503px, SkillSet 453px, effects 455px,
Equipment begins at y=801 and the first weapon control ends at y=893. The
desktop geometry test initially failed at character 793px; after implementation
its stronger first-weapon assertion caught another incomplete layout. The
full-width riding regression also caught a narrowed toggle; that was corrected
without weakening any assertion.
The existing Hybrid C hero contract caught an over-short banner; its approved
80–100px desktop bound is retained. No existing regression was weakened.

Local checks: 31 related calculator/workspace tests, five new workspace tests
and the new three-engine layout/riding contract passed. New tests are included
in the main CI list and cover real EN/RU/JP/TW controls, three font fallbacks,
all twenty branches, 80/240 actions, long names, narrow/zoom-equivalent widths
and the 1365/1366 boundary. Final complete CI, visual and production gates
remain pending; candidate UI version is 3.01, Legacy engine remains 2.00.
The version bump requires regenerating the three searchable projections. The
reviewed diff changes only their `remaked_ui` stamp from 3.00 to 3.01; every
record and source fingerprint remains identical.

First full Linux CI (`36839869712`) passed 185 main contracts and correctly
failed both stronger first-weapon checks at y=905.625. Its system-font metrics
exposed insufficient width for native simulation-option labels. Aligning the
budget column with the existing 186px attribute column gives these actions
more width, without smaller text/targets or looser assertions. The default
desktop test now also checks that the three native option labels fit one row.
The full exact-head CI is rerun before publication.
The second Linux run (`36841313501`) passed 186 main contracts including the
1920px layout, but retained the 1440px height failure. The option columns now
reserve proportionate width for the longer two value labels; the first-screen
assertion includes actual label/font/row geometry if any platform still fails.
The third Linux run (`36842193278`) again passed 186 main contracts. Its
diagnostics disprove the option-label hypothesis at 1440px: all three actions
are 28px tall and one line, yet the character is 515.625px versus Windows
503.25px. No further CSS adjustment is made without field-level evidence.
The five workspace tests now run as an early, nonduplicated gate in Feature CI
and Pages; failure screenshots and detailed geometry are retained. The main
182 contracts still run unchanged after that gate. CI assertions remain strict.
