# Current racial data and skill alignment

Status: racial portion published and accepted in Modern 3.07 / catalog 20;
class-skill reconciliation remains unfinished.
Previous goal turn made authoritative progress: PR37/Pages/Worker and live
PC/touch/offline tooltip acceptance completed, not merely another status update.

## Current scope

- Match all 18 owner-supplied RU/EN racial names/descriptions and confirmed
  public `pandorasaga-os.com/gamedata/skills.json` values, by existing IDs.
- Replace the old racial conditional only for explicit current records; preserve
  old pinned catalogs and the historical two-record correction factory.
- Use existing native typed options: separate ATK +10 and +12%, weapon gates,
  physical/magic damage, accuracy/evasion and separate critical metrics.
- Extend the data codec minimally, with old absent optional fields still valid.
  Display truthful calculation limitations rather than inventing combat/range
  formulas. MP recovery speed uses the existing native percentage-point field
  10 (`Set.RES[1]`); it is not an invented MP amount/rate formula. Make current
  values/conditions clear in the editor.
- Verify real output deltas, weapon boundaries and full removal on passive/race
  switch. Save/load/share and source-revision restoration must remain compatible.
- Next: find existing current class skills and align their RU/EN metadata and
  learning/values without duplicating or deleting future skills. Max stays 55.

## Gates

- [x] Production remains revision 2 with only two additive -2 crit corrections.
- [x] Confirm shared native race>=3 bug and impossible AND weapon gates.
- [x] Public source confirms all 18 values/names; preserve owner's ё spelling.
- [x] All 18 independent validated drafts, supported effects and explicit limits.
- [x] Read-only primary-source audit: all RU/EN text and native effect values
  match public data; owner's ё spelling is explicit. No network CI dependency.
- [x] Server/client codecs and understandable current/editor previews.
- [x] Data-driven actual native results and removal/weapon/pin regressions.
- [x] Synthetic editor preview/save/publish and immutable revision/rollback.
- [x] Workbook H/I: exact 48 cells (six races and 18 names), all other values,
  styles, table, row layout, widths and freeze panes preserved. Render inspected.
- [x] Rendered desktop/touch, appropriate CI, PR/merge/free deployment and actual
  public publication acceptance. No acceptance claim based on text alone.

Only existing Worker/D1; no auth reset, new infrastructure, paid resources,
legacy edits, dropped skills or simulator cap changes. The CI-efficiency proposal
remains separate and unimplemented; use focused Chromium for numeric mechanics.

Evidence: `D:\CODEX\Tasks\pandora-admin-runtime\current-racial-source-audit.json`,
`racial-current-ui` and `current-racial-workbook` (outside Git; public/synthetic
data only). Original/native range output is `---`; fatal-hit events are not
modeled. Source `BARE_HAND` versus the existing knuckle category cannot prove a
new empty-slot bonus: preserve the owner's two-handed requirement, no guessed
unarmed modifier. Raw Eagle Eye carrying metadata is not added to the approved
range-only description/effects. Future class-skill reconciliation is not done.
