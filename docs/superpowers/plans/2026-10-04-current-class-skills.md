# Current class skills — reconciliation before mutation

Status: identity/definition audit and custom-learning support implemented locally;
current server gameplay updates not published or accepted. Continues queue item
4 after accepted 3.07.

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

The first two support steps are now local code, not production balance. See
[custom learning implementation and gates](2026-10-03-custom-skill-learning.md#local-implementation-4-october).
Public descriptions now derive from explicit conditions; future source updates
must still review each variant, timing and intrinsic effect before publishing.

Two source-active records are prepared in `current-elemental-skills.mjs`, not
automatically published: Resist Ice `skill_entry.18.9` (35) and Resist Lightning
`skill_entry.18.10` (41). Fresh reference fetch at 03:35 UTC had the same three
resource hashes. Original MP/cast/cooldown match; current official RU/EN names
and descriptions are copied literally. Duration stays native; target resistance
and combat are explicitly not simulated. No variant, duplicate or formula added.
The two typed conditions passed 140 synthetic parser states across all 28 native
class identities, plus original summary/code/revision restoration. These probes
do not assert legal point allocation or combat balance for every class.
