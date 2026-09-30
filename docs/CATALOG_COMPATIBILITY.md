# Modern catalog and saved builds

Status: under development in PR24; not released on GitHub Pages.

The administrator publishes validated **data**, not code. The existing Legacy
engine calculates the result. Original `js/`, the museum route and generated
source projections remain unchanged. Runtime overrides are explicit and
reversible: revision 0 always means the preserved source catalog.

## Build identity

An unchanged source build retains its original CSV/compressed import format.
When a published catalog is active, Modern exports `PS3:<revision>:<Legacy CSV>`.
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

- Classes, active skills, character passives and racial passives require typed
  schemas and engine capability tests, not merely translated descriptions.
- Arbitrary scripts, HTML, SQL or game-effect expressions are not supported.
- Combat mechanics absent from Legacy cannot be advertised as simulated.
- Source `equipment.42.32` (Wyss Belt) has malformed effect code `0=1_-7`.
  Its historical crash and a transparent Modern-only compatibility treatment
  still need their own regression test. Do not interpret `-7` as an invented
  MP penalty or rewrite the museum data.
- Remote migration 0002 and the initial equipment/Soul CMS are deployed on
  Worker version `e1d50807-85d4-410d-aa10-c39065002ae6`. Production checks
  confirmed first-party login from Pages with third-party cookies blocked,
  authorized reads of all 1304 source records, public revision 0 (no test game
  data published), desktop/mobile rendering and logout revocation. The new
  IDDQD frontend was injected locally on the real Pages origin for this check;
  it is not yet the deployed Pages artifact. Expanded CMS and public release
  acceptance remain pending.
