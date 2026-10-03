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

The initial creation contract reproduced `Unsupported item type` (RED). The
typed backend now creates variants in a new additive identity table, not sparse
source arrays. Tests cover private drafts, literal data, immutable template/type,
unique IDs, 256-variant transactional capacity, concurrent publication,
source preservation, publish/rollback and old pins. All 50 backend tests and
Wrangler dry-run passed. The public codec now validates these identities,
retains source arrays/order, exposes literal metadata and uses the original
template's learning result for additive passives. Fifty related browser tests
passed, including fresh C1 recipient and cached offline reload. Ten private
editor tests passed: source-template duplication, keyboard activation, private
save/explicit publish, literal text, unchanged source and PC/phone screenshots.

An additional RED regression found that integer multiplication-based precision
guards rejected valid `0.29` effects and `1.005` second timings because of binary
floating-point representation. Both server and public codec now compare the
original value with its declared decimal representation, without rounding
submitted values or admitting excess precision. All 50 backend and 45 focused
adapter/adoption/skill browser tests passed after this repair.

The public skill details now expose literal multilingual names/descriptions,
MP/timings, source learning template and actual conditional passive bonus state.
They open deliberately via native keyboard/touch details. Visual QA found the
old absolute-positioned Skill panel overlapped the character; its original node
now lives below the complete calculator workspace, with native callbacks/IDs
retained. Open details and focused summaries survive recalculation/language
changes. All 211 variant gates were compared with the actual source-order
results across 28 classes, low/high levels and branch allocation. A native
learning exception restores Learn/Flag/option cache and permits recovery.
Eleven focused variant tests and the new contract in Chromium/Firefox/Windows
WebKit passed. PC/320/390 screenshots were inspected; no physical-device claim.

Ten genuinely new captions were added through the bundled spreadsheet authoring
tool. Its exporter altered the table's appearance; a scope-preserving package
normalization retained every original row/style/pane/filter and transferred only
the authored additions. All 2866 old rows and RU/EN overrides compare exactly;
the existing filter extends through the new rows. Workbook validation passed.

Modern 3.02 is published through PR28 (`6af7bc5294c1d5691ea88e309f783e7453ccbabe`).
Exact feature head `8a1bcf2657c6536e2853530a0f00526869cf5444` passed Feature CI
`37082164957` and API `37082164962`: 63 Python, 50 backend, 5 workspace, 182 main,
10 editor, 74 catalog/context, 60 cross-engine and 28 visual checks. All JSON
reports have zero skipped/flaky/unexpected results. Pages `37083172767`, Worker
`37083172764` and additive migration 0003 passed. The actual artifact, 17 live
files, unchanged museum/runtime, workbook, fresh/offline C1 recipient, installed
PWA and unchanged-password direct three-engine login were accepted. Actual
Pages IDDQD login with blocked third-party cookies and all four deployed editor
views/creation controls also passed, without production game-data writes.
The operations guide's stale pre-Pages paragraphs were corrected. Canonical Git
bytes, not Windows CRLF checkout conversions, were used for Worker asset hashes.
The preserved global Set prevents main-world Playwright polling; isolated
locator checks retain exact assertions. No native source change was made.
The variant-specific comparison and explicit adoption contracts additionally
verify unchanged native tables, C1, named pins and current autosave/reload.
Public production is now the accepted 3.02 release.
Later blocks still include typed new learning rules, new class representation,
racial selection additions and native class-passive replacement when their
serialization and retained-engine behavior are demonstrated. A template-based
first milestone does not redefine those original requests as complete.
