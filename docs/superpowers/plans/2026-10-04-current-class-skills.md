# Current class skills — reconciliation before mutation

Status: identity/definition audit and custom-learning support shipped in accepted
3.08, PR40. Two reviewed elemental source records are published in revision 22.
Intrinsic passive replacement shipped and passed live acceptance in 3.09, PR41.
Class variants and complete balance remain unfinished. Continues queue item 4;
see the 3.08/3.09 release acceptance ledgers.

## Accepted 3.09: explicit native passive replacement

Fourteen identified native contributions are guarded only in Modern's generated
calc.js; the source and museum remain unchanged. The strict build helper checks
every original anchor count, preserving formula expressions exactly. Optional
`intrinsicEffectMode: replace` disables that contribution; absent/add retains old
semantics. Active skills, variants and unmapped passives reject replacement.

The editor shows numeric dependencies and separates current/draft/preview.
Empty replacement is explicitly zero, not "native mechanics preserved". Stat 21
is weapon-damage percentage points; stat 81 is display-only mounted release,
not a new cross-stat riding formula. Merciful replacement switches its three
native heal amplifiers back to ordinary formulas; arbitrary combat is unsupported.

Runtime evidence found Paladin's Jousting bonus falsely unlearned because the
full native list carries temporary prerequisite state from an earlier row.
Only opted-in replacements now use the existing isolated native gate probe;
visible learned pools/icons and effects use the same state. Old additive pins
retain their exact default learned behavior.

Focused Chromium checks cover all 14 actual contributions, revision-zero
restoration, all three heal outputs, four separate riding identities, level and
class changes, comparison restoration and fresh/offline recipients. Editor
preview/draft/publish and duplicate isolation use synthetic local sessions only.
Release CI, Pages/Worker deployment and actual production acceptance passed.
No server balance record has been published by this support change. Remaining
variants/timing/type changes listed below remain unfinished.

## Reference and preservation

Read the current [skills](https://pandorasaga-os.com/#skills), using its public
[skills.json](https://pandorasaga-os.com/gamedata/skills.json),
[strings.en.json](https://pandorasaga-os.com/gamedata/strings.en.json) and
[classes.json](https://pandorasaga-os.com/gamedata/classes.json).
The 4 October snapshot is outside Git in `D:\CODEX\Tasks\pandora-admin-runtime`;
no external network dependency or automatic import is added to CI.

- skills raw SHA-256: `9dcdb2b6c5abb89094321def5c5a281595afa7530ec106cd8add43795ecc495d`
- English raw SHA-256: `e8707396c6630bad17de0e7b1c33e0fbd80e932e500d8470095e2d3ceee72e05`
- classes raw SHA-256: `9f658767c76b650aaadcec3eb4bed1a32fca2f8a2c23c3ec56cb685c59a20b27`

Do not limit the simulator to the server's temporary 45 cap. Preserve 55,
original 211 skill IDs/order and all 28 classes. Never delete a future skill for
absence from this source. Never create a duplicate just because EN was renamed.

## Implemented audit

`scripts/audit_current_skill_source.mjs` fetches only those public resources,
or accepts a captured snapshot. `scripts/lib/current-skill-audit.mjs` is pure:
it does not create drafts, publish records or import formulas. The seven focused
Node tests run through `npm run test:source-audit` in approximately 0.1 seconds.
Reports remain outside Git. This is not a replacement for runtime acceptance.

The audit verifies all 28 class engine codes, native indexes, family ancestry
and direct source parents, rather than relying on renamed EN class names.
It compares MP, cast, cooldown, active/passive type and prerequisite definitions;
records both RU/EN reference texts and raw functions without translating an
arbitrary function array into a guessed duration or numeric effect.

Current findings across 232 learnable class rows (558 total source rows):

- All 211 retained skills have at least one identity candidate. A candidate is
  not proof of numerical mechanics, actual learned eligibility or current text.
- 18 native identities have multiple distinct server variants. Preserve those
  differences; do not let the last row overwrite another class/rank variant.
- One unresolved source identity: `520005001` Equine Advantage. Riding/weapon
  description alone does not prove it equals Horse Archer or Median Riding.
- Jousting `520001001` corresponds to two existing native IDs: `skill.24.0`
  Dragoon and `skill.24.1` Paladin. Their union matches the source class/level
  definition. Do not merge or duplicate those retained identities.
- Quick Step active `260005001` maps to `skill.11.3`; passive Shifty `920120001`
  maps to `skill.6.1`. Matching names alone confused these two kinds.
- Weakness `440001001` reduces attack and corresponds to Enfeeble `skill.21.2`
  (Charm 8), not defense-reducing Weaken `skill.21.5` (Charm 26).
- Resist Ice `410015001` requires Element 35 vs retained 33. Resist Lightning
  `410025001` requires Element 41 vs retained 33. Source records are not changed
  by the audit; updating only descriptions would leave wrong learning gates.
- 30 rows have MP/cast/cooldown differences. Three rows conflict with retained
  passive kind: Arrow Fusillade `213703001` (MYSELF), Counterpunch `233200101`
  (MYSELF), Karmic Aura `320013001` (TOGGLE). All are level 50 and must not be
  dropped simply because currently above the server cap.
- Four native aggregate gates are intentionally not treated as equivalent to a
  named leaf branch: Backstep `S=6=3`, Physical/Magical Barrier `S=12=102`, Mental
  Aid `S=12=35`. These need explicit aggregate-to-source review.

## Native parser evidence changes the next implementation step

An isolated Chromium diagnostic used the exact accepted 3.07 museum artifact,
without reordering/replacing its 211 rows. It ran original Potential/Adeptness
callbacks in 1,120 synthetic diagnostic states (28 classes, ten levels through
55, four branch point values), restoring Skill, Status, Learn, Flag and Store in
finally. These are parser probes, not claimed to be legal spendable builds.

22 identities differ from a standalone interpretation of their prerequisite
code in at least one state. Example: inherited Scout Invigorate `J=7=12` appears
in Potential for Archer but disappears from Adeptness after a preceding paired
branch rule. `SkillList` retains `tmp[0][1]` across rows and changes a subsequent
single class rule to an accidental exact-class/two-gate check. This reinforces
the existing custom-learning plan: never assume parsed display codes prove the
real learned set; isolate native gates and restore complete state.

Diagnostic evidence:
`D:\CODEX\Tasks\pandora-admin-runtime\current-skill-native-learning-evidence.json`.
The first helper result was rejected: retained Prototype's `Array.from` ignores
the mapper, so it had not installed the requested probe states. The corrected
helper uses explicit loops and asserts installed points before native callbacks.
No deployed application change was made from that invalid result.

## Next implementation, not yet shipped

1. Add bounded, typed learning requirements for existing skills as well as new
   variants: current reference exposes real leaf thresholds needing correction.
   Keep absent requirements template/native-default for old drafts and pins.
2. Evaluate class/level/branch requirements through isolated native gates, with
   explicit ancestry/aggregate semantics; complete finally restore and cache
   invalidation for class, level, allocated/equipment-derived points and catalog.
   Ensure public skill eligibility and passive bonus eligibility agree. Do not
   quietly fix only the bonus adapter while leaving visible learned skills wrong.
3. Review each distinct server variant and each native passive effect. The
   existing `retained-plus-bonus` policy cannot safely replace outdated intrinsic
   passives. Do not stack current effects atop retained hardcoded bonuses.
4. Permit only proven type transitions with compatible identity/pin handling;
   current codecs deliberately prohibit kind and raw prerequisite edits. No raw
   formulas, executable code or wholesale calculator rewrite.
5. Show current learning conditions, native/current effects and honest combat
   limitations in the editor. Draft → preview → deliberate publication, not seed
   replacement or hidden production mutations. Existing future data stays.
6. Focused codec/native/editor/recipient tests, then one grouped release gate.
   Production publication remains blocked by unverified gameplay differences,
   not by a need to ask the absent owner routine implementation questions.

The first two support steps are now accepted production code, not complete balance. See
[custom learning implementation and gates](2026-10-03-custom-skill-learning.md#local-implementation-4-october).
Public descriptions now derive from explicit conditions; future source updates
must still review each variant, timing and intrinsic effect before publishing.

Two source-active records from `current-elemental-skills.mjs` were deliberately
published after deployment: Resist Ice `skill_entry.18.9` (35) and Resist Lightning
`skill_entry.18.10` (41). Fresh reference fetch at 03:35 UTC had the same three
resource hashes. Original MP/cast/cooldown match; current official RU/EN names
and descriptions are copied literally. Duration stays native; target resistance
and combat are explicitly not simulated. No variant, duplicate or formula added.
The two typed conditions passed 140 synthetic parser states across all 28 native
class identities, plus original summary/code/revision restoration. These probes
do not assert legal point allocation or combat balance for every class.

Actual publication moved 20→22 without changing unrelated records or historic
20/2. Production Warlock uses its normal Elemental potential 90 and actual
allocated learned points 33/34/35/40/41; icons/learned pools match current gates,
old pin 20 keeps both at 33. Fresh/offline C1 recipients, actual editor login and
PC/mobile screenshots passed. Complete class reconciliation is still open.

## Conditional-profile prerequisite audit, 4 October

The next read-only audit now compares the actual eligible domains of each source
variant, not its array order, numerical source ID or prerequisite upgrade link.
Expanded class sets, minimum character level and all branch thresholds define
the domain. Disjoint classes are safe to distinguish; overlapping domains must
be strictly nested. Equal or incomparable domains require manual resolution.
This is prerequisite evidence only: `mechanicsVerified` remains false.

The unchanged official snapshot hashes were freshly verified. Of 18 retained
identities with source variants, 17 groups have disjoint/nested candidate domains.
Minstrel's Song has two different definitions with identical class/level/Hymn 8
conditions. Its upgrade link is not evidence of which character should use which
definition. Do not implement an implicit "last row wins" rule for it.

Examples: Blocking retains `skill.5.3` with a general Defend 8 profile and separate
General/Paladin level 45 profiles; Toxify retains `skill.8.1` with Alchemy 12/61
profiles. Existing native identities, source order and future level-50 profiles
remain intact. The audit does not create duplicate skill slots or change balance.

Implementation boundary for the next step:

1. Typed, bounded conditional profiles belong to the existing skill record;
   profile IDs are not new native skill IDs. Start with proven active text,
   MP/cast/cooldown and learning definitions. Unknown duration and effect-array
   coefficients stay unknown, rather than becoming guessed combat formulas.
2. No profiles means the exact previous payload and behavior. Source references
   identify provenance, not priority. Reject ambiguous equal/incomparable selectors
   before draft/publication; selection must be independent of profile array order.
3. Reuse isolated native learning evaluation, real class ancestry and actual branch
   points. Changing class/level/points/catalog or loading a pinned build must
   invalidate the selection and restore the previous projection completely.
4. Text/timing, tooltip and learned icon must reflect the same selected profile.
   The editor should expose a compact profile selector and current/preview values,
   not append many giant cards or require the administrator to edit raw JSON.
5. Verify selector mathematics cheaply in pure tests, then test actual projection,
   switching, pinned builds and one rendered editor path in Chromium. Broaden
   browser checks only for changed platform behavior or final release acceptance.

Current focused audit tests: ten pass, including nested/disjoint Blocking,
branch ranks, identical Minstrel gates, incomparable conditions, unchanged inputs,
28 class identities and all 211 retained skills. This does not accept a runtime
profile editor or all current-server skill mechanics: those remain unfinished.
Outside evidence: `current-class-profile-selector-audit.json` under the existing
`D:\CODEX\Tasks\pandora-admin-runtime` directory.

Backend and frontend implementation are local, not deployed: an optional bounded
`profiles` field for existing active records holds typed localized text, timing
and learning requirements. It rejects ambiguous domains (including equivalence
between descendant scope and an explicit family), malformed IDs/timing, raw
effects/code, passive/new-variant identities, over eight profiles and oversized
data. Absent profiles preserve the old compiled payload. The twelve model tests
and one focused synthetic API integration test pass: preview remains private,
publication creates one native record with no allocation, old revision/rollback
and an unpublished draft survive. Runtime projection selects the most specific
learned profile through isolated native gates; text/timing and eligibility agree.
The editor keeps one selected form, independent base/profile fields, explicit
conditions and a current/preview comparison. A real event-reentrancy bug found
in rendered QA is fixed: removing focused old inputs cannot overwrite the newly
selected profile. Removing all profiles restores the main-record fallback; it
does not change published data until explicit publication.

One grouped Chromium run passed 46 related editor/learning/native-passive/catalog
scenarios in 35 seconds. It includes PC/mobile, comparison, old pins and fresh/
offline recipients. A further focused source-data test passed 222 boundary parser
states for all 17 reviewed existing active identities (37 source definitions),
with literal RU/EN text/timing and exact revision-zero source restoration. These
synthetic boundary states do not prove legal spendable builds or combat parity.
Six focused profile scenarios additionally pass after adding transactional
rollback on an interrupted native probe; all 88 backend tests pass. Worker
dry-run succeeds using the existing DB/Assets/version bindings, with no migration,
secret/auth change, new infrastructure or production write. Candidate UI version
is 3.10; generated catalogs change only their version metadata, not source data.

Fresh source fetch changed hashes to skills
`dd49933fc3412986bc6cf379392cc2ed9924c69e18ff3eca1e0c06a9df2b88c4`
and English `b5bdd1304b91baff52718a8c5145518044199eb105bdf3ff28751601df3e4c29`;
classes are unchanged. The 17 profile groups are unchanged. Other learnable rows
changed: Triple/Quadruple Stab range 300→0 and Arrow Storm 213603002 MP 15→32,
cooldown 5→10. These are fresh reference findings, not automatic simulator edits.
The previous hashes above describe the historical snapshot, not the live source.

`data/current-active-profiles.v1.json` captures only reviewed RU/EN names,
descriptions, explicit learning and MP/cast/cooldown. Its factory creates private
candidate edits, never imports/publishes automatically or allocates native IDs.
Native duration and combat stay unchanged. Minstrel's Song is explicitly excluded
because its identical selectors cannot distinguish two definitions safely.
Before production publication, review the retained buff/combat limits, preserve
unrelated current records and drafts, then validate the actual deployed runtime.
Source reconciliation and complete gameplay balance remain open.
