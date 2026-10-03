# Custom skill learning — next authorized investigation

Status: investigation started after the Modern 3.02 delivery; not implemented
or published. The owner requested a useful editor for new skills and wider
character mechanics. This block continues that request, not a new approval gate.

## Current evidence

- Modern 3.02 allows new active/passive records with immutable source-template
  identity/type/learning. New passives have only explicitly declared numeric
  effects. The first milestone does not complete arbitrary classes or combat.
- The native `SkillList` parser retains temporary prerequisites across rows.
  Reordering or appending probes to its original catalog changes old learning;
  the original 211-entry order must remain untouched.
- An isolated museum-browser diagnostic temporarily substituted exactly one
  probe row, called the original Potential/Adeptness callbacks and restored the
  exact Skill/Learn/Flag/build state in finally. Nine threshold/class/branch cases
  passed. A 256-probe local run took about 1 ms, not a production latency promise.
- A single native `J=0=5` gate includes advanced Warrior descendants. Native
  `J=1=20_S=0=35` matches the exact class, not its descendants. Editor language
  must make those differing native meanings explicit rather than guess them.
- Native Store/Expand use CSV (optionally compressed), not a five-bit class ID.
  Modern bounds still rely on the original 28 classes, and C1 has five strict
  context fields. New class representation needs separate compatibility work;
  there is no justification to silently widen native class indexes now.

## Intended bounded next step

The 3.03 follow-up inspection reconfirmed the parser boundary in
`js/simulator.js:SkillList`: a single class gate includes native ancestry, while
a paired class/branch gate uses the exact current class. Evaluate typed class,
level and branch gates independently through isolated native probes, then
combine their boolean results. Do not let a second requirement silently change
the meaning of a previously selected class. Potential and learned eligibility
must remain distinct; equipment-derived skill bonuses participate in both the
native checks and the cache key. This is implementation guidance, not a shipped
editor capability.

Allow additional variants, not source skills, to opt into typed custom learning
requirements. Preserve template learning as the default for all existing data.
Use canonical class/branch IDs and bounded levels/points; do not accept raw
prerequisite strings, formulas, HTML or executable code. Compose independently
evaluated native gates when needed, with explicit documented class ancestry.

The retained parser performs numeric learning checks. A temporary single-row
probe is isolated from original source ordering, with complete finally restore,
recursion protection and a cache keyed by catalog/rules and native state. Never
rewrite or duplicate the game's formulas. Additional effects still go through
the existing typed Calc adapter; active combat remains outside this step.

## Required delivery gates

1. RED server/public codec tests: default old drafts/snapshots remain readable;
   typed variant-only rules validate strictly, publish/rollback/pins survive,
   and unsafe fields/unknown identities fail before mutation. No data rebuild.
2. RED native tests: threshold boundaries, real class ancestry, branch potential
   versus learned points, equipment-derived skill bonuses, hidden Skill List,
   source order, repeated calls and injected native exceptions/finally restore.
3. Private keyboard/phone editor: understandable requirements, defaults,
   validation, unsaved typing, draft-first/publish and truthful capability notes.
4. Literal localized public requirements/status; source records still unchanged.
   Validate comparison, adoption, fresh/cached-offline sharing and C1 restoration.
5. Full CI, rendered desktop/mobile QA, free Worker/D1 only, PR/squash/Pages,
   exact published artifacts, actual authentication/PWA and beginner docs.

Do not announce custom learning or new classes shipped because this plan exists.
Do not publish invented game balance to production as an acceptance shortcut.
