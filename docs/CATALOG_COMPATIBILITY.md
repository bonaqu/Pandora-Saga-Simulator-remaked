# Modern catalog and saved builds

Status: under development in PR24; not released on GitHub Pages.

The administrator publishes validated **data**, not code. The existing Legacy
engine calculates the result. Original `js/`, the museum route and generated
source projections remain unchanged. Runtime overrides are explicit and
reversible: revision 0 always means the preserved source catalog.

## Build identity

An unchanged source build retains its original CSV/compressed import format.
When a published catalog is active, Modern exports `PS3:<revision>:<Legacy CSV>`.
With non-default calculation context, it exports
`PS3:<revision>:C1:<base64url JSON>:<Legacy CSV>`, including revision 0. The typed
context contains riding, source buff selections, Honor, clan levels and three
caster attributes; no arbitrary flag keys or executable expressions. Source
mutually exclusive buff groups are validated. Default source builds retain
their exact CSV/compressed format. Old codes lack context and load with source
defaults (unmounted, effects off), never with the recipient's current switches.
The shared URL carries the same versioned payload. A recipient requests that
exact immutable revision, even if the administrator has since changed an item
or rolled the catalog back. Comparisons evaluate each build with its own data
and restore the original active character and catalog afterward.

Public snapshots, never credentials, may be cached in IndexedDB. A previously
loaded revision can be used offline. If a required revision is unavailable and
not cached, loading stops before changing the character. Named records remain
intact; an unavailable autosave is protected from subsequent autosave writes
until a compatible build is successfully loaded. A slow obsolete share request
cannot replace a newer hash selection.

## Stable IDs and limits

Existing equipment categories are part of the Legacy encoded ID. Change type
by creating a new variant, not by silently reinterpreting saved IDs. New IDs
are allocated transactionally and never recycled. Drafts do not change the
public catalog. Each equipment category and the Soul catalog allow up to 1024
additions; publications are bounded to 900,000 UTF-8 bytes.

Canonical Japanese source names remain internal keys for existing hardcoded
special effects. Display names in EN/RU/JP/TW are separate literal text.
New records use an isolated `Modern:<stable ID>` engine key, so a name cannot
accidentally activate an unrelated Legacy special effect. Published names take
precedence over workbook display overrides; blank RU falls back to edited EN.

Soul capacity, Soul slot compatibility and equipment race/class compatibility
are checked before rebuilding source lists. Numeric equipment IDs avoid a
Legacy right-hand list bug (`'4' > '30'` as strings), which otherwise clears
valid equipment during restoration.

## Required work before release

- The existing 28 class slots now support typed multilingual labels and the
  six native `Status.Mod` LP/MP coefficients in the local editor/adapter.
  Their source fingerprint is checked separately from equipment data. Pinned
  builds restore their class parameters; revision 0 restores all original
  coefficients. No class lineage, skill caps or hardcoded passive is replaced.
  New arbitrary classes are deliberately unavailable until the engine can
  represent and serialize them correctly. The initial class editor is deployed
  on Worker, but its public Pages consumer is not released.
- Classes, active skills, character passives and racial passives require typed
  schemas and engine capability tests, not merely translated descriptions.
- The local editor now supports all 18 existing racial passive slots. `preserve`
  leaves native mechanics unchanged, `add` adds typed numeric options, and
  `replace` explicitly bypasses the selected native racial conditionals inside
  the retained `Calc` call. A temporary out-of-range selector and temporary
  option projection are always restored in `finally`, including engine errors;
  no sentinel enters build data or the UI. All native formulas stay in Legacy.
  Empty replacement removes the native calculation effect. Other race/skill
  selections do not inherit the edited bonus; source revision 0 restores it.
  Unsupported combat actions are not created by a description or numeric bonus.
  The editor is deployed on Worker; its Pages consumer is not released.
- The local editor covers the 178 active and 33 passive source skills. Active
  text, MP cost and cast/cooldown/duration values update the actual learned-skill
  view, not a new combat simulation. Type and prerequisite code stay immutable.
  Passive bonuses are additive: the retained `SkillList` checks whether the
  character has learned the skill, independently of whether that view is open.
  Typed weapon/shield/riding requirements gate those additional numbers. Native
  `CalcSet` completes recalculation when a level, branch or riding change affects
  a bonus; no learning or damage formula is copied into Modern. Source revision
  0 restores the exact original skill tables. Native hardcoded class passives
  cannot yet be replaced, and new skill/class slots are not supported. These
  initial editors are deployed on Worker; their Pages consumer is not released.
- Context C1 restoration is locally verified with a fresh recipient, offline
  reload, a pinned riding-dependent passive, comparison state/storage restoration,
  invalid input rejection and all three browser engines. Source language changes
  preserve clan levels instead of silently resetting them. Pages deployment
  acceptance is still required.
- Arbitrary scripts, HTML, SQL or game-effect expressions are not supported.
- Combat mechanics absent from Legacy cannot be advertised as simulated.
- Source `equipment.42.32` (Wyss Belt) has malformed effect code `0=1_-7`.
  The museum still reproduces its historical `EquipOpt[-7].push` failure.
  An exact identity/code guard in Modern presents only confirmed STA +1 during
  the retained equipment check, restores the original row in `finally` and
  displays the unresolved Rex Naturalis trigger warning. It does not invent
  an MP penalty, mask other engine errors or rewrite source data. Five tests
  cover source parity, round-trip/recalculation, exception propagation and
  desktop/mobile warning layouts.
- Remote migration 0002 and the initial equipment/Soul CMS are deployed on
  Worker version `e1d50807-85d4-410d-aa10-c39065002ae6`. Production checks
  confirmed first-party login from Pages with third-party cookies blocked,
  authorized reads of all 1304 source records, public revision 0 (no test game
  data published), desktop/mobile rendering and logout revocation. The new
  IDDQD frontend was injected locally on the real Pages origin for this check;
  it is not yet the deployed Pages artifact. Expanded CMS and public release
  acceptance remain pending. Expanded editors are now deployed on version
  `c488e6d9-9403-4285-94e0-37b427a72888`: ten real auth/security checks and
  read-only authenticated reads of 1561 records passed, including the four new
  editors on desktop/mobile. Public revision remains 0; no test data published.
