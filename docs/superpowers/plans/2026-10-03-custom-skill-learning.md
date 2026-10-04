# Custom skill learning — next authorized investigation

Status: implemented locally on 4 October; not published or production-accepted.
The owner requested a useful editor for new skills and wider
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

The 4 October current-data audit supersedes the variant-only boundary: allow
existing skills as well as additional variants to opt into typed custom learning
requirements. Resist Ice/Lightning have confirmed changed thresholds on existing
identities. Preserve template learning as the default for all existing data;
never mutate retained source codes/order or old pinned snapshots. See the
[current class-skill audit](2026-10-04-current-class-skills.md).
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
   typed source/variant rules validate strictly, publish/rollback/pins survive,
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

## Local implementation, 4 October

- Optional `learningRequirements` survives strict draft/preview/publication,
  history and rollback. Absent rules keep old native-template behavior. Canonical
  class IDs `job.0`–`job.27`, exact/descendant scope, level 1–55 and unique branch
  IDs `skill_category.0`–`skill_category.24` with 1–200 points; no raw code.
- Class choices are OR; branch requirements are AND. Each check uses a temporary
  single-row native probe with `finally` restoration, distinct potential/learned
  results and cache invalidation. Neither source gate codes nor ordering change.
- Source icons and additional passive bonuses use the same custom eligibility.
  Intrinsic source formulas are not replaced; that remains a separate balance
  reconciliation task, honestly identified in the editor.
- Private editor shows current/pending conditions, preserves unsaved mode changes
  and requires explicit draft/publication. Public requirements use actual rules
  and localized literal text, not a stale template threshold. Six interface
  labels were appended to Translations; all 2,894 original rows/styles survived.
- Build loading now clears the four derived Learn pools before native traversal;
  previously stale learned IDs could make native Color reference a removed icon.
- Focused tests cover independent thresholds, ancestry, multiple branches,
  equipment points, injected single-row-probe exceptions, source immutability,
  comparisons, revision removal, fresh and cached-offline recipients. Rendered
  EN/RU requirements reviewed at 1440×900 and 390×844; synthetic admin editor at
  1440×900 and 390×900. Browser plugin not available; configured Playwright used.
- Grouped local checks: 54 Chromium editor/learning/source/pin/offline scenarios,
  78 backend and seven pure source-audit tests passed. The subsequent two-record
  elemental fixture and 140-state runtime test also passed separately. Changed
  smoke scenario passed Chromium/WebKit; Firefox hit a context-close protocol
  error after assertions and passed a focused standalone rerun. No assertions
  weakened. Full release CI and production acceptance remain pending. No test
  skills or invented balance were published to the working D1 catalog.
