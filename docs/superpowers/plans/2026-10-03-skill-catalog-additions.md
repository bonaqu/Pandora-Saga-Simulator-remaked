# Modern skill additions — next authorized catalog block

The owner requested adding, not only editing, active/passive skills alongside
gear, Souls, racial abilities and classes. Existing editors cover 211 source
skills, 28 classes and 18 racial slots. This block starts with new skill
variants; it does not declare arbitrary new classes or combat simulation done.
Branch: `codex/admin-skill-creation`, from published PR26.

## Observed constraints

- Preserve all 459 museum files, source fingerprints, original class/level
  availability and the complete workbook. Reuse the existing free Worker/D1,
  authorization, CSRF, private draft, immutable publish and rollback workflow.
- Source `SkillList` is not safe for naive appending: its temporary prerequisite
  array survives successive rows. On the actual museum runtime at Warrior Lv5,
  `[J=0=5, S=4=41_S=15=21]` learns Provoke; reversing those rows does not learn
  it. This was reproduced in an isolated browser with complete table, Learn,
  Flag and build restoration. Do not rewrite the museum parser or copy formulas.
- New variants must inherit a real source skill's native learning/type gate
  explicitly. Evaluate that gate through the retained original catalog order;
  introducing a variant must not alter learning of any existing entry.
- A source template is immutable identity, not an editable prerequisite/code
  field. Additional passive numeric options use the retained `Calc` adapter and
  typed weapon/shield/riding requirements. A new passive has only its declared
  additional effects; do not duplicate a template's hardcoded intrinsic bonus.
- Active MP/timing/text are skill metadata. Damage/combat actions absent from
  Legacy remain unsupported and must be described as such in the editor.
- Opaque stable admin identities must not rely on sparse source arrays or
  recyclable per-revision indexes. No new allocation may collide with a source
  entry, reinterpret a saved build or change an older immutable snapshot.

## Delivery gates

1. RED: create source-backed active and passive variants through the real
   catalog handler/SQLite; private drafts, correct immutable identities and
   inherited native conditions; reject unknown/wrong-kind templates and raw
   prerequisites/code. Existing revisions and drafts must remain readable.
2. Minimal typed backend and additive migration, with transactions, stale-tab
   guards, safe limits, publish/rollback and old-pin preservation. No destructive
   rebuild of existing auth/catalog tables and no production sample game data.
3. Modern adapter/view: retain source ordering/learning, no holes; literal
   multilingual names/descriptions; native gate changes with class/level/branch;
   passive calculation including equipment, shield, riding and repeated calls.
4. Admin workflow: source-template choice/duplication, clear capability notes,
   save before publish, unsaved input preservation, keyboard and phone use.
5. Saved/shared build, C1 context, comparison restoration, explicit adoption,
   stale loads, rollback and cached offline recipient. Source revision 0 restores
   original tables/calculations. Different publication order cannot leak a bonus.
6. Full CI, desktop/mobile rendered QA, exact production diff, PR/squash,
   Pages/Worker publication, actual artifact/PWA/auth read-only acceptance and
   beginner guide/changelog updates before claiming this capability released.

The initial creation contract is intentionally RED in this feature branch.
Public production remains the accepted 3.01 release until all gates pass.
Later blocks still include typed new learning rules, new class representation,
racial selection additions and native class-passive replacement when their
serialization and retained-engine behavior are demonstrated. A template-based
first milestone does not redefine those original requests as complete.
