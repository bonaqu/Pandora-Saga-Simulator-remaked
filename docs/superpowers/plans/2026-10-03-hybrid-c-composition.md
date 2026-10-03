# Modern 3.04 — Hybrid C composition

User-prioritized continuation of the accepted compact-input block. The new
reference is inspiration, explicitly not a pixel-perfect or narrow-screen target.
This is presentation work, not a replacement of the completed 3.03 engine fixes
or another implementation of the approved racial corrections/admin editors.

## Decisions

- Borrow clear Character, Skills and Results hierarchy, green/beige section
  bands, quiet readable data, compact equipment and Pandora atmosphere.
- Keep the PC workbench broad: two complete native branch columns at 1366px+,
  all 80 primary allocation controls, seven bounded editable inputs and every
  native calculated result. No new category tabs hiding work or duplicated builds.
- Keep Level 1–55 and no Modern LOG/FILE. The reference's level 120, +/- input
  layout, old tabs, extra Builds sidebar and unverified icons are not requirements.
- Name Character / Skills / Effects, with Base stats / Calculated stats below
  Character. Static results no longer look like editable input boxes.
- Move the existing Equipment/Soul discovery controls and autosave status beside
  Equipment on PC; keep them above the long calculator on phones. Responsive
  changes move the same nodes without cloning them or their handlers. Remove the museum-only empty
  toolbar spacer from Modern layout, retaining its source node.
- PC equipment rows share 30px targets, global actions retain their uniform
  36px targets, and phone controls use 44px targets. Preserve compatible
  item/Soul selectors, enhancements, native values and anchored dropdown behavior.
  Remove only the decorative +----- category placeholder from displayed names.
- Keep the complete approved fan-art composition on the right; use a faint crop
  of its castle/landscape, not a second large logo, behind the title on wide screens.
  No new image, paid service, game balance data or formula.
- Append eleven editable EN/RU section/input-feedback/list-prompt captions to the existing workbook. Preserve
  all 2883 existing rows including header, owner translations/styles/panes/native
  table. New table: A1:I2894, 2893 data rows / 226 interface captions.
- Follow-up: field-specific maximum/minimum/fraction/empty/budget feedback uses
  native bounds and displayed names. Esc and explicit load clear stale feedback.
- Follow-up: JOB and SKILL float without pushing the calculator, retain native
  callbacks and repeat-tab closing; X/Escape restore opener focus. Other native
  inspectors remain inline. Disabled SKILL explains its source-owned list switch.
- Follow-up: BUFF labels and inputs share flexible row height, not the source's
  14–18px label boxes beside larger inputs. Preserve all original values/handlers.

## Active task queue

New requests extend this queue; they do not discard unfinished work.

1. Complete compact Hybrid C UI, responsive discovery, input feedback, JOB/SKILL
   popups and BUFF row alignment together. Current implementation/acceptance block.
2. Full source/native/catalog regression, phone/desktop visual QA, PR/CI, production
   Pages/Worker artifacts and installed/offline checks. Do not release merely on code.
3. Typed custom skill learning from `2026-10-03-custom-skill-learning.md` after UI
   acceptance; preserve approved admin clarity, localization workbook and source rules.
4. Reconcile remaining approved roadmap work against actual merged state, then
   continue the first unfinished authorized item without repeating completed phases.

## Verification / release gates

- [x] RED: named-section/alignment/state/PC-density checks fail on 3.03.
- [x] GREEN: headings and source identity survive repeated language/refresh calls.
- [x] Fix observed header overlap, first-screen growth and empty toolbar spacer
  at their causes; do not raise the 900px Equipment acceptance bound.
- [x] Desktop/font/locale/long-label matrix and phone/zoom widths 320–2560 pass.
- [x] RED/GREEN: phone discovery stays accessible above the calculator through
  repeated PC/phone resize, preserving node identity, actions and build state.
- [x] Workbook render and preserved-package checks; editable EN/RU caption test.
- [x] RED/GREEN: seven field-specific bounds and stale-feedback clearing.
- [x] RED: JOB/SKILL floating behavior, two JOB columns and BUFF row alignment.
- [x] GREEN and local visual QA of populated JOB/SKILL and BUFF at phone/PC widths.
  The previous inline-only Skill assertion was replaced with explicit fixed-panel,
  unchanged-workbench and viewport bounds per the owner's new popup requirement.
  No numeric, source, eligibility or rendering assertions were relaxed.
- [x] RED: actual Linux CI screenshots exposed clipped phone SKILL prompt and RU
  Base stats heading; new scroll-width bounds reproduce both inherited nowrap defects.
- [x] GREEN: natural wrapping passes local PC/phone bounds and populated-panel checks.
- [x] RED/GREEN: screenshot review exposed a transparent native popup surface;
  JOB/SKILL now have opaque cream backgrounds so underlying calculator text cannot
  interfere. Explicit alpha/opacity assertions cover both popups at six widths.
- [x] RED/GREEN: the PC Potential budget caption was clipped by equal narrow
  columns. Three short label/value rows preserve full level-55 budgets, normal
  font size and the unchanged first-screen weapon/600px Character bounds.
- [x] Responsive test measurements now wait for the existing toolbar relocation
  before capturing resting geometry and read BUFF pairs atomically. This removes
  the observed 54px before/after measurement race without changing alignment bounds.
  Renewed full CI/visual evidence after this final CSS fix is still required.
- [ ] Full browser/CI, source catalog differential and visual acceptance.
- [ ] Squash PR, Pages/Worker deploy and exact production artifact acceptance.

Candidate, not yet a production acceptance claim. The next functional block is
still `2026-10-03-custom-skill-learning.md`, after these UI gates pass.
