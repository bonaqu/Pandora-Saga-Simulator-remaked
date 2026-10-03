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
  Equipment. Do not clone them or their handlers. Remove the museum-only empty
  toolbar spacer from Modern layout, retaining its source node.
- PC equipment controls share 30px targets, 44px on phones. Preserve compatible
  item/Soul selectors, enhancements, native values and anchored dropdown behavior.
  Remove only the decorative +----- category placeholder from displayed names.
- Keep the complete approved fan-art composition on the right; use a faint crop
  of its castle/landscape, not a second large logo, behind the title on wide screens.
  No new image, paid service, game balance data or formula.
- Append five editable EN/RU section captions to the existing workbook. Preserve
  all 2883 existing rows including header, owner translations/styles/panes/native
  table. New table: A1:I2888, 2887 data rows / 220 interface captions.

## Verification / release gates

- [x] RED: named-section/alignment/state/PC-density checks fail on 3.03.
- [x] GREEN: headings and source identity survive repeated language/refresh calls.
- [x] Fix observed header overlap, first-screen growth and empty toolbar spacer
  at their causes; do not raise the 900px Equipment acceptance bound.
- [x] Desktop/font/locale/long-label matrix and phone/zoom widths 320–2560 pass.
- [x] Workbook render and preserved-package checks; editable EN/RU caption test.
- [ ] Full browser/CI, source catalog differential and visual acceptance.
- [ ] Squash PR, Pages/Worker deploy and exact production artifact acceptance.

Candidate, not yet a production acceptance claim. The next functional block is
still `2026-10-03-custom-skill-learning.md`, after these UI gates pass.
