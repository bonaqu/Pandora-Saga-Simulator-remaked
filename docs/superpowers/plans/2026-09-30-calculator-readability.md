# Calculator readability follow-up (UI15)

Approved by the user's request to continue UI/UX improvements and verify the
whole site. Builds on shipped UI14, not an unfinished roadmap phase.

## Scope and invariants

- Modern-only font correction: Legacy's global `li`/`ul` font declarations
  currently defeat the font on `#body`.
- Responsive primary sections: character, skill allocation and effects remain
  in source order instead of disappearing beyond a 992px phone canvas.
- Readable attribute/level controls and calculated label/value pairs. Native
  buttons delegate to retained source callbacks; no copied formulas or budgets.
- Preserve source nodes/IDs, source-language/RU projections, all 55 levels and
  28 classes, reset/load/share/autosave compatibility, and unenhanced fallback.
- Do not redesign the museum route, translate unapproved game terms or change
  the translation workbook. Skill allocation's dense source controls remain a
  separately documented follow-up, not a claim of full mobile accessibility.

## Acceptance

- [x] RED reproduces font, tiny controls and off-canvas primary sections.
- [x] Native level/attribute controls match direct Legacy callback results,
      including min/max and point-budget boundaries.
- [x] Locale/reset/load and repeat initialization retain nodes and state.
- [x] 320/390/768/1440px and long source labels have no clipped primary values
      or overlapping new targets; desktop/mobile visual inspection passes.
- [x] Full local regression: 138 Chromium, 58 Python, 24 three-engine smoke,
      24 visual captures, translation/projection checks and isolated installed
      online/offline PWA checks pass. Actual screenshot inspection is required,
      not just successful capture output.

Publication still requires remote feature CI, PR/squash/Pages exact artifact,
live full-site checks and isolated installed online/offline PWA acceptance.
The annotated `v2026.09.15` is created only after those gates pass and records
the exact runs, artifact/cache/workbook fingerprints and remaining limitations.
