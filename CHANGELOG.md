# Changelog

All notable player-facing changes to **Pandora Saga Simulator Remaked** are recorded here.

## Modern 3.03 — compact controls and understandable editing, 2026-10-03

- Level and all six attributes use seven bounded editable fields, native point
  allocation, Enter/blur confirmation and Escape cancellation instead of 42
  step buttons. Level 55, attribute caps and equipment totals remain native.
- Full original Pandora header art, inline bounded JOB/SKILL/ATTACK/DEFENSE/BUFF
  inspectors, readable stat pairs and keyboard-operable buff controls reduce
  overlap and desktop clutter. Equipment stays an anchored selection list;
  touch opening survives viewport/keyboard resizing. Compare can hide equal rows.
- Private editors show current published characteristics beside a server-validated
  preview, numerical controls before translations, optional JP/TW fields and an
  explicit edit/check/save/publish sequence. Failed checks and cancelled section
  changes preserve unsaved fields. A new Russian beginner editing guide explains
  supported mechanics and limitations without treating descriptions as formulas.
- A delayed initial session check no longer clears a password already entered
  into the native admin form. Desktop skill-name layout is checked with both the
  actual platform font and a larger explicit fallback.
- Modern adapters correct the retained recovery-array typo exposed by Silver
  Wand and keep the existing explicit Waist Belt warning. Museum files and
  formulas are unchanged. Full catalog differential coverage rejects any new
  exception and tests these two known source failures independently.
- Approved versioned racial corrections cancel erroneous +2 critical rate for
  Enkidu Stone Skin and Lapin Magic Resistance while retaining native damage
  protection and Myrine's correct bonus. Production catalog revision 2 contains
  only these two corrections; revision 0 remains immutable for pinned builds.
- Seven workbook captions extend the table to 2,882 rows / 215 UI captions;
  existing Russian/English overrides and styles are preserved.
- PR30 and PR31 are published. Final feature CI `37128992142`, Pages
  `37129818426` and Worker `37129818509` passed. Exact artifact/live files,
  unchanged museum, shared/offline recipients, installed PWA and real native
  login with the unchanged password passed; tag `v3.03` marks the accepted code.

## Modern 3.02 — native-gated skill additions, 2026-10-03

- New active/passive catalog entries can inherit a real skill's immutable native
  learning gate without overwriting its identity or changing source array order.
  Additional passives use declared typed bonuses, not a copy of a template's
  intrinsic mechanics. Active MP/timing/text remain metadata, not combat damage.
- Private source-template duplication, distinct stable IDs, explicit save and
  publish, additive D1 allocation migration, stale-tab protection and immutable
  rollback keep existing source records and pinned/shared/offline builds intact.
- Additional skill details use keyboard/touch activation, localized literal
  text, exact decimals and visible bonus requirements/status. The Skill List now
  opens below the calculator workspace instead of overlapping the character.
- Correct decimal validation no longer rejects valid `0.29` bonuses or `1.005`
  second timings; extra precision, non-finite values and invalid fields still fail.
- Ten new UI captions are editable in the existing RU/EN translation workbook;
  all 2866 previous rows, user overrides, source cells and native styling remain.
- PR28 is published: Pages `37083172767`, Worker `37083172764`; additive D1
  migration 0003 passed. Full CI, exact artifact/live bytes, fresh/offline shared
  recipient, installed PWA and real unchanged-password authentication passed.
  No sample game records were published. Custom learning rules, new classes and
  new combat mechanics remain unfinished; see the release ledger and guides.

## Modern 3.01 — compact desktop workspace, 2026-10-03

- Wide PC screens use two complete skill columns and compact native character
  settings/results. All twenty branches, both point modes and larger steps are
  retained. Riding now belongs with simulation switches; Equipment has one
  title/enchantment/reset header instead of a stacked toolbar.
- Less desktop chrome and no duplicate calculator title or randomized Legacy
  ASCII joke panel. Actual Pandora artwork, Hybrid C colors, readable values,
  original callbacks and 44px phone actions remain. The museum is unchanged.
- Default 1440×900 first weapon control ends around y=893 rather than appearing
  below the first screen. New geometry, real four-language/font/long-label,
  responsive boundary and three-engine riding tests guard the layout.
- The administrator capability note now describes the released pinned catalog
  correctly. No database, password, balance rule or translation workbook change.
- PR26 is published: Pages `37075816244`, Worker `37075816303`. Full CI,
  exact artifact/live checks, fresh shared recipient, four-language/320px RU,
  installed online/offline PWA and unchanged-password direct login passed.
  Release tag: `v3.01`. See the release ledger for evidence and limitations.

## Modern 3.00 — direct administrator login correction, 2026-10-01

- Direct Worker form sign-in keeps a same-origin request identity instead of
  `no-referrer` converting its Origin to `null`. The server still rejects null,
  missing and foreign origins; password/hash/pepper/session rules are unchanged.
- Local IDDQD opens the first-party secure login without collecting credentials
  on a disallowed preview origin. Native origin-denied submissions return to a
  clear retry form instead of raw JSON. PR25 is published: Pages `36804053399`,
  Worker `36804053403`. Actual direct login with the unchanged private-file
  password, authorized catalog, logout and reload passed all three engines.
  The Windows WebKit cookie-observer limitation is recorded in release acceptance.

## Modern 3.00 — 2026-10-01

- PR24 is published on Pages (run 36800046613) with Worker deployment
  36800046623. Exact artifact/live checks, C1 fresh-recipient/offline sharing,
  actual Pages IDDQD authentication and installed offline PWA passed.
- A later user report exposed a distinct direct Worker-form sign-in failure.
  Its root cause and published correction are recorded above; initial Pages-entry
  acceptance did not cover this native form.

- The release identifies Modern UI as 3.00; the retained engine and
  museum remain 2.00.

- Import, named builds and shared links ignore obsolete catalog responses after
  newer editing/loading, Code edits or closing Builds. Deleted named records
  cannot be resurrected by an in-flight request; stale feedback cannot steal focus.
- Catalog revisions outside the nine-digit PS3 format fail before runtime mutation.
  The administrator guide now maps all six editor kinds to their real simulation
  effects and explicitly identifies unsupported mechanics.

- Explicit current-build catalog adoption checks the live published head,
  preflights worn items and occupied Soul slots, preserves C1 and named pins,
  and cancels stale responses. Offline cache is never reported as the latest.
  Quota failures preserve old saves; an unverified calculation rollback pauses
  autosave and reports recovery honestly.
- Successful explicit code import, named load and catalog update detach an old
  shared URL fragment so reload restores the new autosave, not the old link.
  Failed imports keep the link, character and storage intact.
- Compact desktop workspace puts attributes beside results, uses the working
  area width and keeps branch names, Adeptness/Potential and their native actions
  in aligned rows. The Hybrid C art remains; the desktop banner is shorter.
  Phones retain 44px primary targets and visible Builds/Compare actions.
- Modern header replaces FILE/LOG with one Builds/Compare group. Misleading
  Heavy/Medium/Light controls and Modern log output are removed; museum controls
  remain. Legacy FILE slots can be explicitly copied into named builds without
  changing originals, character or autosave. Copies are atomic and idempotent;
  malformed data and quota failures leave the original collections intact.
- Modern handles the exact malformed Wyss Belt source marker `0=1_-7` without
  crashing: STA +1 remains, and a visible warning states that the unresolved
  conditional trigger is not simulated. No MP penalty is invented. The exact
  source row is restored even when another calculation fails; real errors still
  propagate. Legacy museum retains its source behavior.
- Consolidated Modern code export/import/clear into Builds using the original
  field and retained handlers. Plain source exports use the native compressed
  codec; versioned/context-bearing exports retain the full PS3 payload. Code
  validation stays visible when sharing, and clearing does not delete a build.
- Fixed signed skill-step labels wrapping in wider system-font fallbacks;
  desktop rows stay compact without reducing phone targets or test limits.
- Equipment reset now sizes to its label instead of the inherited 120px width.
  Wider fallback fonts stay compact; long translations wrap within the section.
- Modern build context C1 transfers riding, enabled effects, Honor, clan and
  caster attributes to fresh shared recipients and offline reloads. Comparisons
  restore the active context and storage afterward. Old CSV/compressed codes
  retain compatibility and load with source defaults. Changing source language
  no longer clears clan bonuses.
- The initial expanded CMS is deployed on Cloudflare: 28 class, 18 racial,
  178 active and 33 passive entries, with authenticated read-only production
  checks and desktop/mobile visual inspection. Public catalog remains revision 0;
  no test game data published.
- Initial active/passive editor covers all 211 retained skills: multilingual
  text, active MP/timing metadata and additive passive bonuses gated by native
  learning and typed weapon/shield/riding requirements. Hidden skill lists and
  partial native callbacks do not leave bonus calculations stale. Prerequisite
  code and built-in mechanics remain unchanged; arbitrary new skills and native
  passive replacement are not done. Context C1 persistence passed fresh-recipient
  and offline production checks.
- Initial racial-passive editor supports 18 retained slots with separate
  multilingual text and explicit preserve/add/replace numeric effects. Actual
  retained-engine results, revision restoration and exception-safe temporary
  state are verified; native formulas and museum data remain unchanged.
- Admin search no longer offers stale results while a query changes. Late item
  responses cannot replace the current selection; saves temporarily freeze
  fields so a successful response cannot discard subsequent typing.
- Initial administrator class editor supports all 28 retained class slots,
  multilingual text and native LP/MP progression parameters. Typed source
  fingerprint checks and pinned build revisions preserve old class calculations.
  Class lineage and arbitrary new classes remain unfinished. The first existing
  class/skill/passive editors are deployed on the Worker, with their revision-pinned
  consumer published on Pages.
- Modern-only equipment/Soul catalog adapter uses the retained calculation
  engine, with immutable catalog revisions pinned in `PS3` saved/shared codes.
  Cached public revisions work offline; missing revisions protect existing
  builds and autosaves. Original CSV/compressed imports stay supported.
- Catalog switching checks Soul-slot and race/class compatibility before
  rebuilding lists. Numeric IDs prevent a Legacy lexicographic weapon-reset
  bug; stale asynchronous share requests cannot replace a newer selection.

- English interface and game names can be overridden in column I of the same
  translation workbook. Russian remains in H; preserved English/JP/TW source
  columns and all prior Russian values remain intact. Empty overrides restore
  the original; JP/TW names are not replaced by an English override.
- Updated the beginner's upload/publish guide. Browser verification uses an
  actually edited workbook and checks unchanged game data and serialized builds.
- The Modern-only `IDDQD` entry now has an original green/beige DOS terminal,
  reduced-motion support and an accessible login dialog. It ignores editable
  fields and does not spend character points while typing the cheat code.
  Passwords are submitted by native HTTPS navigation to the Worker, never
  persisted in frontend storage. The Pages entry passed deployed acceptance;
  direct Worker-native form correction is tracked above.
- Secured Worker authentication is deployed and production-tested separately
  from Pages. A Modern-only equipment/Soul editor now has validated multilingual
  fields, numeric effects, private drafts, atomic publication, immutable history,
  conflict protection and rollback. Equipment/Soul engine integration is now
  published on Pages. Expanded existing class/active/passive/racial editors have
  since passed remote acceptance; additional mechanics remain in development.

## 2026.09.17 — Safe calculator code and riding controls

- Fixed Modern calculator Code Load accepting incomplete input and corrupting the current character before an exception. It now shares Build Manager's validated, rollback-capable import, accepts existing compressed/CSV codes, and does not touch Legacy File slots.
- Native Create/Load/Delete and riding controls support Enter/Space and phone-size targets. Code input has a visible programmatic label, paste/Enter support, focused inline validation and success/autosave-failure feedback.
- Riding and compressed code creation/clearing retain source callbacks; no game formula, source array, build format, museum file or translation-workbook cell changed. Skill min/max actions now share the existing translated min/max keys too.
- Added invalid/non-default/rollback, compressed/CSV, storage-failure, callback, keyboard, locale, missing-module and desktop/mobile regression/visual checks. Publication acceptance is recorded only after full CI and exact production gates.

## 2026.09.16 — Native skill allocation and explicit effects

- Full skill branch names replace four-letter abbreviations in the calculator. Approved workbook translations and original JP/EN/TW names remain display-only projections.
- Native −1/+1 actions distinguish Adeptness and Potential; one Larger steps toggle reveals ±10/min/max. All 240 callbacks stay engine-owned, with the original bar/value/indicator IDs retained. The separate potential-point pool has a readable label instead of ???.
- Effects switch deliberately by click, Enter or Space instead of pointer hover. Their values, percentage units and next-SPR hints wrap inside desktop/phone columns; source floats no longer squeeze an effect row to zero width.
- Extended the same translation workbook by five UI rows while preserving all 2,837 prior rows and 139 Russian values. Added two ordinary Russian interface instructions; game-adjacent labels remain English until reviewed. The beginner guide now matches 2,842 rows.
- Added exact callback-count/result parity for base and allocated states, keyboard, locale/load/reset/fallback and 320/390/768/1440px regression/visual checks. No engine formulas, museum source or build encoding changed.

## 2026.09.15 — Readable calculator and native character controls

- Corrected inherited Japanese bitmap/monospace fonts on calculator list/table descendants. Modern uses its system font; the museum route is unchanged.
- Reflowed character, skill-allocation and effect sections into viewport-sized columns, stacking them on phones instead of hiding the last sections beyond a 992px canvas. Dense source skill controls retain their own horizontal scrolling where needed.
- Added readable native level/attribute buttons, with 44px phone targets, that call retained Legacy handlers exactly once. Point costs, min/max, level 55, all classes, calculations and build encoding remain in the existing engine.
- Converted calculated statistics and character metadata into readable label/value pairs. Long approved labels wrap without hiding numeric values. Corrected the old float layout collapsing the build-code field.
- Made source reset/options actions keyboard-operable native buttons with current toggle state. Retained source nodes and callbacks, source-locale changes, load/reset/autosave/share compatibility and fallback when enhancement is unavailable.
- Added callback parity, boundaries, locale/load, long-label and 320/390/768/1440px regressions plus three-engine and visual checks. Legacy source/formulas and the translation workbook remain unchanged. Skill-allocation arrows and other dense Legacy controls are a separate usability follow-up.

## 2026.09.14 — Explicit item review survives automatic scrolling

- Fixed a late pointer-focus scroll event closing an explicitly opened desktop item card. The installed-app check exposed this after UI13 publication; focused explicit review now survives automatic scrolling, while manual wheel/touch/scrollbar/Page input still cancels floating cards.
- Clicking the info action pins an already opened hover card; a second click closes it. Reviewing still does not change equipment, Souls or builds. Legacy source and translations remain unchanged.

## 2026.09.13 — Compact Equipment dropdowns and quieter item rows

- Replaced the large Equipment selection modal with a compact dropdown anchored to the original field. It opens below or above according to available space, leaves the calculator visible, supports filtering/arrows/Enter and dismisses on Escape, outside click, anchor scrolling or focus moving away. The preserved native engine remains the fallback.
- Removed repeated Characteristics labels/arrows from Search and Equipment rows. A compact named information action remains for explicit review: shown on hover/focus on desktop, always available on touch. Viewing still never equips a candidate.
- Opening a dropdown reveals the currently worn item, as a native select does, without opening its card or changing the character.

- Fixed characteristic cards closing when keyboard focus automatically scrolls to an off-screen Equipment item. Keyboard review waits for that scroll to settle; manual wheel/touch input still cancels previews and never changes equipment.
- Added the off-screen keyboard regression to Chromium, Firefox and WebKit checks, plus a desktop visual capture. Pointer previews retain their 450 ms dwell, scroll cancellation and separate explicit touch disclosure.
- Fixed late focus-induced WebKit scroll events closing an already open keyboard card. Cancellation now follows actual wheel/touch/scrollbar/Page-key intent rather than assuming scrolling always finishes within two frames.
- Legacy source, formulas, serialized builds and the translation workbook remain unchanged.

## 2026.09.12 — Equipment selection and deliberate previews

- Added characteristic cards to the actual Equipment item and Soul selection lists, not only Search. Each picker is locked to its character slot; activation calls the preserved Legacy selector handler. Gem/enhancement fields and existing socket state remain in Equipment. Reviewing candidates never inserts Souls or changes the build.
- Pointer previews require 450 ms of dwell. Leaving the item, scrolling, wheel input, touch, closing or rerendering cancels pending previews; a stationary pointer does not reopen a card after scrolling. Keyboard review and the explicit Characteristics action do not require waiting. Pointer selection does not flash a focus preview.
- Reflowed the enhanced Equipment rows to remove fixed-height overlap, including full-width mobile item/Soul controls and ordinary modifier fields. Corrected an off-by-one Modern slot-label projection.
- Original engine selects, source arrays, formulas, build bytes and museum Legacy menus remain preserved; native fields stay available when the picker script is unavailable. The translation workbook is unchanged.
- Fixed Modern load/evaluation rollback retaining effects from previously equipped items: the adapter now rebuilds the Legacy equipment-effect cache using its original Equip handler before recalculating. No formula is duplicated or changed.
- Reflowed Equipment's bulk modifiers and reset action on phones. Reset is a native keyboard-operable button; bulk modifiers/reset also refresh the existing Legacy equipment-effect cache instead of leaving stale calculated bonuses.

## 2026.09.11 — Consistent controls, item previews and build links

- Replaced two language panels with one EN/RU/JP/TW group and exactly one selected language. RU uses English game-source fallback until the user supplies verified translations; JP/TW keep native game data with the English Modern shell.
- Fixed Legacy font leakage into the Compare table; increased table text and unified toolbar/install sizing. Autosave is a readable status, not a differently sized pseudo-button. Mobile actions are at least 44px high.
- Added read-only equipment/weapon/Soul cards to Modern search: adjacent desktop hover/focus popovers and a separate Details disclosure for touch. Socket rings distinguish empty/filled slots (up to three); an equipped item shows its actual Soul names, gem and enhancement. Other candidates remain base items. Literal base ATK/DEF and class flags come from Legacy data; conditional formulas are not reconstructed. Escape dismisses a preview before the dialog. Native Legacy select menus remain unchanged.
- Added Share build in Build Manager. The link carries the exact Legacy CSV and opens the character in another browser; a valid incoming link takes precedence over local autosave. Invalid links retain current data. Clipboard rejection exposes a selectable URL rather than claiming success. Link contents are public to anyone receiving it.
- Extended the same translation workbook to 2,837 rows, preserving all prior rows and Russian input. Legacy source, formulas and arrays are unchanged.

## 2026.09.10 — Release media and installation metadata

- Added real desktop/mobile screenshots to both player READMEs: compatible equipment search, example build comparison and mobile build management. They were captured from verified production UI 2026.09.9, not mockups or invented Russian game names.
- Added an absolute Open Graph image URL, descriptive unofficial-project metadata and a large-image sharing card. The image shows the real Modern calculator with the approved Pandora artwork; it is not required for the offline precache.
- Added opaque PNG exports of the existing PWA icons and a 180px Apple touch icon, keeping the vector sources and original design. Browser image decoding and exact dimensions are regression-tested.
- GitHub Pages remains free and static. The Legacy source, formulas and translation workbook are unchanged in this release.

## 2026.09.9 — On-site updates and keyboard-safe Modern dialogs

- Added an EN/RU What's new panel with current engine/UI versions, feature highlights, full changelog and report links.
- Search, Build Manager and Compare now use native modal dialogs: background controls are inert, Tab/Shift+Tab stays inside, Escape closes and returns focus to the opener. Focused stat help dismisses before its parent dialog.
- Added a first-focusable Skip to calculator link and platform-native keyboard focus indicators.
- Extended the translation workbook to 2,828 rows without changing any existing input. The 11 new interface strings include Russian copy; official game names remain user-owned.
- Added Chromium/Firefox/WebKit smoke gates for both Legacy/Modern compressed save/load and mobile Russian search.

## 2026.09.8 — Workbook translations throughout the Modern calculator

- Expanded the same workbook to 2,817 rows, preserving all 119 existing approved UI translations: 150 UI strings, 1,617 core game terms, 259 inherited labels, 158 hints and 633 skill-detail fields.
- Added Modern-only display adapters for race/class/racial skill, equipment/Soul lists, skill names, descriptions, requirements, calculator labels and hints. Blank Russian fields retain the chosen source language; no official Russian game translations were invented.
- Preserved Legacy arrays, formulas, selected values, compressed build bytes and existing help-node focus/listeners. The museum route and diagnostic Log output remain unchanged.
- Updated the beginner guide with the complete table workflow and current display coverage.

## 2026.09.7 — One Excel file for Russian translations

### Added
- A single editable `localization/translations.xlsx` with 1,764 rows: 147 Modern UI strings and 1,617 game terms, including all 211 actual skills. English, Japanese and Traditional Chinese source names sit beside the yellow Russian input column.
- A beginner's Russian guide covering download, editing, GitHub upload, automatic deployment and common errors without terminal commands.
- Approved Russian equipment and Soul names in Modern search, with matching by both source and Russian names. Other game terms are collected in the same workbook for subsequent display adapters.

### Reliability
- Every Pages build validates stable IDs, source columns, row coverage and UI placeholders before generating runtime catalogs. Invalid uploads leave the previously published site available.
- Translation-only changes now alter the service worker cache fingerprint automatically, so offline installations receive the updated catalogs without a manual app-version edit.
- English fallback, Legacy data, calculation formulas and serialized builds are preserved.

### Corrected after production inspection
- Recovered the original Base64 and DEFLATE libraries from the source-code tables inside the archived CodeRepos HTML pages. The Pages builder emits executable JavaScript for Modern and Legacy routes while retaining the archival repository files byte-for-byte.
- Restored the preserved compressed File save/load path and removed its three startup syntax errors. CI now gates browser parse errors, compressed save/load round-trips and generated codec syntax.

## 2026.09.6 — Versioned Legacy data projections

### Added
- Deterministic read-only JSON indexes for 44 equipment categories / 1,120 equipment records, 184 Souls and 25 categories / 211 actual skills.
- Exact mappings back to existing Legacy equipment selector values, Soul IDs and nested skill coordinates.
- Explicit schema, projection, Legacy engine and Remaked UI versions plus cross-platform SHA-256 fingerprints of every Legacy source file used by each index.
- Static Pages delivery under `data/generated/` for future search and tooling without a backend.

### Corrected
- The Russian terminology worksheet now contains 1,617 stable terms. It adds all 211 actual skill names as `skill_entry.*` while preserving the original skill-discipline and other term IDs.

### Reliability
- Feature and production CI regenerate all three indexes from the live Legacy runtime and reject stale committed output.
- Browser contracts fetch the published JSON and map representative records back to `EquipData`, `SoulData` and `Skill`.
- Legacy JavaScript remains the only calculation/data source of truth; generated JSON is not loaded as a calculator engine and `/legacy/` receives no Modern projection scripts.

## 2026.09.5 — Russian interface and terminology workflow

### Added
- A separate **EN / RU interface language** switch for Modern Mode. It does not change the preserved JP/EN/TW game-data language or character build bytes.
- Russian UI copy for the persistent shell, Equipment/Soul Search, Build Manager, Compare Builds, mobile controls and PWA install/update controls.
- English fallback for any Modern string that is not yet present in the Russian catalog.
- A reviewable terminology worksheet containing 1,406 stable Legacy terms: races, racial skills, jobs, skill lines, equipment categories, equipment and Souls.

### Translation safety
- Legacy game names remain unchanged until their official Russian-client equivalents are supplied and approved by the user.
- The terminology export keeps stable Legacy paths and JP/EN/TW source values; proposed and approved Russian game-term fields start empty.
- Deterministic export validation blocks stale worksheets, duplicate IDs and carrying an approved translation across a changed English source.
- UI locale persistence fails open when browser storage is unavailable and never blocks the calculator.

## 2026.09.4 — Mobile polish and offline PWA

### Added
- A compact sticky character summary on phone screens, sourced through the existing Legacy adapter.
- Collapsible legacy detail cards and mobile equipment rows that keep item and Soul selectors reachable without horizontal page overflow.
- Installable PWA metadata and root-scoped offline support for both Modern Mode and the preserved `/legacy/` route.
- A non-blocking `New version available — Reload` notice when a newly downloaded app version is ready.

### Reliability and local data
- The service worker precaches the calculator core and small interface assets while leaving external requests and the bulk item-icon library out of the required offline bundle.
- Updates activate only after the player chooses Reload; the existing Remaked autosave is flushed before the page changes.
- Offline reloads retain the serialized Legacy build in the current browser, and missing optional item icons do not prevent the calculator from starting.
- All autosaves, named builds and cached app files remain local to the browser. No account, backend or cross-device sync was added.
- Mobile, PWA, real offline, preservation and production-artifact contracts are gated in CI.

## 2026.09.3 — Compare Builds and safe diagnostics

### Added
- **Compare Builds** for selecting two named builds and viewing their legacy-calculated stats side by side.
- Neutral `Build B − Build A` deltas with explicit higher/lower/unchanged direction only; the UI does not claim that a larger or smaller number is inherently better.
- Accessible stat help controls in the comparison table with conservative definitions and the exact Legacy 2.00 output node used as their source.
- Desktop and 390px mobile visual QA captures for Compare Builds.

### Reliability
- Build comparison evaluates both serialized builds through the preserved legacy calculation path and restores the active character afterwards.
- Comparison is covered against the Legacy route with representative serialized-build differential fixtures.
- Comparing builds does not replace the legacy `localStorage.file`, named-build storage or autosave data.
- Empty, unavailable and non-numeric legacy outputs do not produce invented numeric deltas.
- Stat help deliberately avoids unverified formula decomposition; equipment, attribute and buff contributions are not claimed unless they are explicitly verified later.
- Feature and production CI gate the complete Phase-3 browser suite before release.

## 2026.09.2 — Search and local builds

### Added
- **Equipment Search** over the item options already considered compatible by the legacy simulator, with name and level filters.
- **Soul Search** for the Soul sockets and options currently exposed by the legacy simulator.
- Automatic local autosave with compatible-session recovery after refresh.
- **Build Manager** for saving, loading, renaming, duplicating and deleting multiple named builds.
- Import and export of the exact legacy serialized build code, without requiring a backend or account.
- Desktop and 390px mobile visual QA captures for the main Modern shell, Equipment Search and Build Manager.

### Reliability
- Added browser contracts for the legacy adapter, search behavior, local storage, autosave recovery, named-build CRUD and import/export.
- Feature and production CI now run the complete shipped Phase-2 browser suite before visual QA or Pages deployment.
- Legacy calculation files remain protected by preservation fingerprints and are not modified by these Modern features.

### Local data
- Autosave and named builds stay in this browser's `localStorage` in this phase.
- Remaked storage uses separate keys and does not replace or delete the legacy simulator's `localStorage.file` value.
- There are no cloud accounts, server-side build storage or cross-device sync in this release.

## 2026.09.1 — Modern foundation

### Added
- New **Modern Mode** as the primary GitHub Pages experience.
- Preserved **Legacy Mode** at `/legacy/` for the original simulator interface and behavior reference.
- Hybrid Light Modern visual shell inspired by the original green Pandora Saga Simulator.
- Responsive top navigation for desktop, ultrawide and mobile screens.
- English as the Modern Mode default while retaining JP/TW switching from the legacy calculator.
- Project, Updates and Legacy Mode navigation with dead historical links removed from the primary interface.
- Player-facing English and Russian repository pages.
- Preservation fingerprints and automated checks to detect accidental legacy-engine changes.
- Browser smoke tests for layout, language controls, legacy tabs and serialized build compatibility.

### Preserved
- Legacy calculation files and their existing game-data behavior remain the calculation source of truth.
- Historical attribution for the recovered Pandora Saga Simulator remains documented in `NOTICE.md`.

### Next
- Russian localization workflow with user-verified in-game terminology.
- Reproducible structured-data projections while retaining the Legacy calculation source of truth.
