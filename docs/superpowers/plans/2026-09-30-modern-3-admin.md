# Modern 3.00, editable EN and administrator catalog

The owner explicitly approved this scope on 2026-09-30. It supersedes UI17's
desktop layout direction, not its build-import safety fix. Branch:
`codex/modern-3-admin`, based on `99930ce`. Production was UI16 at planning time.
PR24 published the initial Modern 3.00 scope on 2026-10-01; the current release
ledger is `docs/RELEASE_ACCEPTANCE.md`. Direct Worker-native login and the owner's
new desktop compactness feedback are follow-up work, not a reason to repeat the
completed blocks.

## Invariants

- GitHub Pages remains the free public frontend; `/legacy/` and its source/data
  stay museum Legacy 2.00. Modern calculator release becomes 3.00 only after QA.
- No duplicated game formulas. Modern catalog extensions feed existing engine
  data through an explicit adapter, not changes to preserved files.
- Desktop compactness is the primary layout target; mobile remains functional.
- Admin credentials and sessions never enter Git, client storage or logs.
- Never upgrade a Cloudflare subscription or create unrelated resources.

## Blocks and acceptance

1. **Editable EN workbook.** Add column I for optional English overrides;
   preserve A:H and all existing RU values. Compile UI and game labels from the
   workbook, validate placeholders and stable IDs. Empty cells restore original
   labels. Verify actual edited XLSX in a browser, EN/RU/JP/TW switching,
   unchanged engine arrays/build, cache invalidation and beginner instructions.
2. **Worker auth.** Reuse worker
   `pandora-saga-simulator-remaked-admin-api` and D1
   `pandora-saga-simulator-remaked-admin-db` (binding `DB`). Resolve runtime KDF
   support against current Cloudflare limits, not local Node alone. One admin,
   salted password hash plus Cloudflare-only pepper, hashed expiring server
   sessions, prepared statements, atomic login limits, CSRF, strict origin
   rules, secure HttpOnly cookies and no public bootstrap endpoint. Create the
   initial credentials in a private local file outside the repository. Test
   positive and negative auth paths, session expiry/revocation, abuse and CORS.
3. **Catalog CMS.** Separate Modern-only validated catalog, draft/revision
   workflow, multilingual names/descriptions, equipment/Soul types and numeric
   effects. No arbitrary code/HTML/SQL/effect expressions. Publish through the
   retained engine adapter. Verify an edited and a new item changes actual
   calculated stats, compatible saved/shared builds and offline fallback.
   Owner expanded scope on 2026-09-30 to include character classes, active
   skills, character passives and racial passives, not just gear/Souls. Audit
   each engine table/conditional before defining editable fields. Numerical
   edits must affect the retained simulation; descriptions alone must never
   be presented as implemented mechanics. IDs stay stable. Unsupported new
   mechanics need an explicit capability boundary, not arbitrary CMS code.
4. **IDDQD interface.** Ignore editable fields, modifiers and key repetition;
   original restrained CRT effect with reduced-motion support, authenticating
   form and Doom-inspired green/beige CMS without copyrighted game assets.
   Prefer a first-party Worker-origin admin surface to avoid third-party-cookie
   failures between github.io and workers.dev. The code only reveals a UI;
   every private operation requires server authorization.
5. **Compact calculator 3.00.** Align desktop character/skills/equipment/summary
   into a compact workspace. Remove Modern LOG and old FILE navigation, replace
   with one segmented Builds / Compare control; consolidate export/import and
   sharing in Builds. Preserve import safety and Legacy file compatibility.
   Replace misleading inherited density/theme actions with meaningful layout
   behavior or remove them. Verify keyboard, hover delay, scrolling, sockets,
   keyboard/mobile previews, numeric parity and no duplicate actions.
6. **Release.** Logical commits, feature CI plus backend security/runtime tests,
   desktop/mobile visual review against production, exact deployed Worker and
   Pages artifact, real sharing recipient and installed offline PWA. Supersede
   PR23 only once the replacement includes its safety fixes. Document behavior,
   operational recovery, known limitations and next roadmap work honestly.

## Verified starting infrastructure

Wrangler 4.144.0 OAuth has Workers/D1 write permission. Existing database UUID:
`a786d50a-56e1-4868-8ca5-58cd1b248d85`. GitHub has
`CLOUDFLARE_API_TOKEN` secret and `CLOUDFLARE_ACCOUNT_ID` variable. Credentials
were not printed or copied into the repository.

## Progress, 2026-09-30

- Editable EN workbook implemented; all 2842 rows/141 RU values preserved.
  Python suite (62) and focused Chromium localization suite (19) passed.
- Authentication deployed and accepted on Worker version
  `9e4a3266-46ee-4a51-ad8d-525bd62e0a74`: migration 0001, single administrator,
  private local credentials, Cloudflare-only pepper and revocable server
  sessions. Twenty backend tests and ten real production checks passed,
  including native Pages-origin login with third-party cookies blocked,
  CSRF rejection, logout revocation and desktop/mobile visual inspection.
- Existing Cloudflare deployment uses OAuth; GitHub PR verification passed.
  The deploy job using the owner's GitHub token is still a release gate.
- Catalog block is in development: additive migration 0002, validated typed
  data codec, private drafts, immutable revisions, optimistic concurrency and
  rollback. No catalog changes have been published on the main site yet.
  Initial equipment/Soul editor supports four languages, compatibility, slots
  and numeric effects. All 1304 original effect strings round-trip exactly;
  33 backend tests and three synthetic-session browser workflows passed.
  Equipment/Soul engine integration and pinned `PS3` build codes are now
  implemented locally, including a real fresh-recipient offline reload test,
  protected unavailable autosaves, compatibility preflight and stale-share
  request protection. See `docs/CATALOG_COMPATIBILITY.md`.
  Remaining scope includes classes/active/passive/racial skills and remote CMS
  acceptance; these are not presented as completed mechanics.
- PR24 is a draft. Main Pages production remains UI16. IDDQD public entry,
  expanded catalog acceptance and compact Modern 3.00 remain required work.
- IDDQD entry is implemented locally: matching prefixes do not execute Legacy
  Q/D shortcuts, editable fields/modifiers/repeats/composition are ignored,
  native modal focus and password clearing are tested, reduced motion disables
  the original one-shot CRT startup. Five Chromium checks and desktop/mobile
  visual inspection passed. Authentication uses native HTTPS navigation to the
  Worker first-party surface, not browser-stored bearer tokens.
- Initial equipment/Soul CMS deployed on Worker version
  `e1d50807-85d4-410d-aa10-c39065002ae6`, remote migration 0002 applied.
  Ten auth/security checks passed again against the exact deployed version.
  An additional real IDDQD-to-Worker check with blocked third-party cookies
  verified authorized source catalog reads, desktop/mobile and logout. The
  entry script was locally injected on the production Pages origin, not
  shipped to Pages; public catalog remains revision 0 without test edits.
- First class increment implemented locally: 28 source slots, four-language
  labels/description and six typed native LP/MP progression parameters. Source
  projection verifies 28 classes, 6 races and 18 racial passives; it does not
  extract or copy formulas. Class lineage/new slots/caps remain unavailable.
  38 backend checks and 15 catalog/admin browser checks passed, including native
  LP delta, pinned-code restoration, invalid coefficients/fingerprint rejection,
  private draft/publication and desktop/mobile UI. Not deployed to Worker/Pages.
  The last committed IDDQD block also passed GitHub Feature CI and API verify.
- The class increment `6f5cf37` passed local full browser CI (159), Python (62),
  preservation validation, deterministic data projection and GitHub Feature CI
  plus API verify. No remote class data was published.
- Racial editor increment implemented locally for all 18 existing slots:
  explicit preserve/add/replace, typed options through retained `Calc`, native
  conditional bypass only for an explicit replacement, temporary state restored
  even on errors. Native parity across all 18, repeated-calculation/code-load,
  malformed-input and three-engine checks passed. Admin search invalidates old
  results immediately; stale detail replies cannot replace a newer choice and
  saves freeze controls to prevent losing typing. Remaining active/class passive
  and compact 3.00 work is not declared complete.
- Racial increment `c34ff0e` passed GitHub Feature CI and API verify. Local full
  browser CI passed 159/159 with two workers after a concurrent heavy auth run
  caused three 30-second timeouts; focused reruns passed with unchanged assertions
  and time limits. No unrelated user processes were stopped.
- Initial skill editor implemented locally for 178 active and 33 passive source
  slots. Active MP/timing metadata projects into the native learned-skill view;
  passive additional bonuses use retained learning checks, explicit equipment
  requirements and native recalculation callbacks. Six focused simulation tests
  and the private draft/publication workflow passed; desktop/mobile editor views
  were inspected. Full browser CI (159), focused catalog/entry/skill tests (25),
  private admin workflows (7), three-engine smoke tests (39), backend tests (42),
  Python tests (62), preservation validation, deterministic data/translation
  generation and Worker dry-run passed. GitHub CI is the next gate for this
  increment. Native passive replacement/new slots remain unfinished.
  Riding and effect-switch persistence is a known release gate because the
  original CSV and current `PS3` envelope do not serialize these switches.
- Skill increment `5c30e08` passed GitHub Feature CI and API verify. Expanded
  CMS deployed on Worker `c488e6d9-9403-4285-94e0-37b427a72888`: ten auth checks
  and real authenticated reads of 1561 entries passed. All four expanded editors
  were rendered and visually inspected on desktop/mobile without creating drafts
  or publishing test data; public revision remains 0. One production probe used
  the wrong passive-field selector; correcting it to the existing `shieldRequired`
  field made the check pass. No app assertion or authorization was relaxed.
- Build context C1 implemented locally after RED tests demonstrated lost riding/
  effects and clan reset during language switching. Modern-only typed envelope
  pins those values alongside revision; old CSV/compressed codes load defaults.
  Six context tests, seven skill tests, related adapter/code checks (39 combined)
  and 42 three-engine smoke tests passed. Full browser CI passed 159/159 with
  unchanged assertions and time limits. GitHub CI is the next gate for this
  increment. The compact calculator block follows below.
- Context increment `3a85db7` passed GitHub Feature CI and API verify. No frontend
  Pages publication was performed.
- Wyss Belt source `equipment.42.32` reproduced a native `EquipOpt[-7].push`
  failure. A Modern-only exact identity/code guard presents confirmed STA +1 to
  retained equipment calculation, restores the original source row in `finally`
  and warns that the unresolved conditional trigger is not simulated. Five
  regression checks passed, including real exception propagation and 390/1440
  warning layouts. Source content and preservation hashes remain unchanged.
- Compact candidate removes Modern FILE/LOG and inherited theme controls, moves
  the existing Builds/Compare actions into one header group and keeps them
  visible at phone widths. Desktop character attributes/results sit alongside
  each other, branch actions use aligned compact rows, and the Hybrid C banner
  is shorter. Phone primary targets remain 44px. Skill allocation explanation
  now opens deliberately by keyboard/click, not by immediate hover.
- Legacy FILE recovery is explicit, copies original CSV slots atomically into
  named builds, skips duplicate codes and never changes originals, character or
  autosave. Malformed input/corrupt Modern collections/quota errors are tested.
  Four bilingual recovery labels were appended to the nine-column workbook;
  all 2842 previous rows, including RU/EN overrides, were preserved.
- Initial full compact-candidate run found five obsolete LOG/toolbar test
  expectations. Tests now assert the new locations and retained invariants.
  Visual inspection then found the Builds group clipped by horizontal phone
  navigation; a dedicated RED test exposed it and the phone row was corrected.
  An overlapping local test invocation later removed another run's trace files;
  subsequent verification is sequential, with no changed timeout/assertions.
  Full browser CI then passed 172/172, Python passed 62/62 and three-engine
  smoke results reported passed (45 scenarios). Additional catalog/context/
  skill/entry/admin workflows passed 39/39. Preservation validation still
  verifies all 459 source files; generated data and workbook checks pass.
  Visual capture passed 27 scenarios; the last old LOG navigation capture was
  changed to JOB and its focused rerun passed. Desktop/mobile images were
  inspected. GitHub CI is the next gate for this increment. Code-form duplication,
  arbitrary new class/skill mechanics and final Modern 3.00 release remain open.

## Progress, 2026-10-01

- Compact increment `22fde2f` passed API verification but Feature CI reported
  two layout failures on Linux. Its report showed a 45.375px skill row and
  Equipment pushed to y=1483.234375. A local Verdana fallback reproduced the
  exact +1 wrap: its 28px button had only 18px of text room. Nonwrapping signed
  steps and 2px inline padding fix the cause; assertions/targets stay intact.
- Builds now contains the actual retained Code field and one export/import/
  clear set, rather than a second textarea with duplicate handlers. Source
  exports remain exactly native-compressed; PS3/C1 retains complete context.
  Clear changes only the field. Validation stays next to the field when sharing
  and reopening; malformed imports preserve current context and all storage.
  The shared safe import handler also prevents unvalidated native CodeLoad if
  the calculator enhancement fails to load. Missing Builds fails closed.
- Appending the Clear code label preserved all 2846 prior workbook rows and
  their EN/RU cells. Workbook/data/preservation checks pass: 2847 rows, 146 RU
  UI strings, no fabricated game terms or new EN overrides, 459 source files.
- Local full UI CI passed 179 scenarios, Python passed 62, related catalog/
  context/entry/translation/layout checks passed 53, and three-engine smoke
  passed 45. Final focused import/export/fallback/context checks passed 25;
  the CI selection now contains 180 tests. Latest GitHub verification remains
  required. All 28 visual captures passed and
  desktop/mobile images were inspected. A missing-enhancement export RED test
  exposed loss of C1 riding state; the retained Create callback now wraps PS3
  itself. Another RED covered successful native compression followed by failed
  context export; prior text is restored on either failure. Pages and Worker were not redeployed
  for these frontend-only edits.
- Next release block is explicit public-catalog adoption for existing builds,
  without silently changing their pinned revision or losing unavailable saves.

## Catalog adoption increment, 2026-10-01

- `bb54363` passed GitHub Feature CI `36779196230` (180 main contracts,
  zero unexpected/flaky/skipped) and API verification `36779196238`.
  Pages remains accepted UI16; backend remains the previously verified version.
- Added a deliberate current-build update in Builds, showing the active pin.
  It checks the live public head, never promotes an offline cached head to
  "latest", preflights class/race equipment flags and occupied Soul sockets
  without mutation, and loads through the retained adapter with full C1.
  Named pins are untouched. Closing the manager or changing the character/link
  cancels an in-flight response. Protected unavailable autosave blocks adoption.
- A transient native failure restores catalog, context, displayed calculation
  and storage. A persistent failure previously claimed success despite failed
  rollback; its RED test now passes with honest error and paused autosave until
  successful recovery. Quota failure preserves the old save and reports the
  current adopted character as unsaved.
- A second RED found that successful explicit import retained an obsolete
  `#build=` URL and reload could undo the import. Adoption/import/named loading
  now detach only this fragment after success; invalid import leaves it intact.
- All 18 adoption/sharing/recovery scenarios passed, including a fresh recipient
  and cached offline reload. The related catalog/class/racial/passive/context/
  IDDQD group passed 50 tests. Python passed 62 after updating exact workbook
  row/table/docs counts for the newly appended labels, without weakening checks.
  Desktop and 320px RU manager images were inspected. Workbook now has 2863
  rows/162 RU UI labels; every preceding row/EN/RU value was preserved.
- Full local UI exposed a Windows test-artifact preparation timeout before any
  browser context existed. Instrumented trace measured copying 960 published
  files at 24.75s and real workbook compilation at 9.60s. The fixture now lives
  on the existing test-output volume, reuses read-only static files by bounded
  hard links (copy fallback), and independently copies all three generated locale/
  worker files. New SHA checks prove the shared site's generated files unchanged.
  Browser assertions and the 30s limit remain intact. Full main UI then passed
  180/180, zero unexpected/flaky/skipped; real edited-workbook and PWA-update
  scenarios took 21.89s and 14.20s. No frontend release is claimed.
- WebKit's new API smoke hit the real backend instead of its page-route mock
  because a service worker intercepted the request; the trace showed the correct
  production CORS rejection of localhost. The synthetic network contract is now
  scoped to a blocked-worker context as documented by Playwright; offline/PWA
  tests remain enabled. Read-only production-origin/public-API verification with
  active workers then passed in Chromium, Firefox and WebKit: public GET 200,
  exact `https://bonaqu.github.io` ACAO, UI16/revision 0. No auth/data writes.
  All 48 cross-engine smoke tests passed. The read-only verifier polls from Node
  because the museum's `Set` data object shadows a native constructor used by
  Playwright's main-world wait helper. Production CORS was not weakened.
- Next: final capability/async-load review, version 3.00 and complete release
  gates from the block above. Arbitrary new class/skill mechanics remain explicitly
  unsupported rather than silently emulated by text edits.
- Final local visual capture passed 28 scenarios. Current Builds layout was
  inspected at desktop and 320px RU phone widths; the catalog action is a
  separate deliberate section, not another code/share interface. Feature and
  API GitHub verification of the new commit remains the next gate.

## Final load/capability review, 2026-10-01

- Adoption commit `b2b5c82` passed Feature CI `36794954075` and API verification
  `36794954117`. Downloaded browser artifact confirms 180 expected and zero
  unexpected/flaky/skipped; backend deployment is unchanged.
- New RED cases reproduced delayed explicit/named loads overwriting a newer
  character or import. A shared monotonic load intent now guards preparation,
  payload/hash equality and field/record validity before any runtime/save write.
  Editing back to the same value still invalidates the old intent. Closing
  Builds, editing Code and deleting a pending named record cancel stale work;
  stale feedback cannot steal focus or replace a newer message. Twelve new
  cases passed. Snapshot validation also rejects pins beyond the PS3 format.
- Full local main UI passed 180/180, no flaky/skipped/unexpected; catalog/context/
  load/entry group passed 62; Python passed 62; three-engine smoke passed 51.
  All 459 source files/static references verify and the production source diff
  remains empty. No timeouts or assertions were weakened.
- Workbook append preserved all preceding 2863 rows and EN/RU values. Current
  table contains 2865 rows/164 RU UI labels; game RU and EN overrides remain zero.
- Reviewed all six implemented editor schemas/UI/projections and their explicit
  source/mechanic boundaries against the current tests. The administrator guide
  now maps every kind to actual calculations versus skill-view metadata. New
  class/skill slots, hardcoded class-passive replacement and active combat remain
  honest limitations, not features implied by editable description fields.
- Next: identify Modern as release 3.00, validate its rendered/PWA version and
  final feature/API CI, then proceed through the authorized publication gates.

## Modern 3.00 release label, 2026-10-01

- Modern runtime/UI now reports `3.00`. Its calculator heading projects that
  version in every source language without changing `Ver` or `Name.Title`.
  Museum runtime/heading remain `2.00`; the native browser title has always
  been unversioned, so the test checks its actual title and `Ver` separately.
- A rendered RED exposed the retained calculator heading still showing 2.00
  after the header bump. The Modern-only presentation adapter fixes it after
  source `TextSet`, including EN/RU/JP/TW switches; all source title values are
  asserted unchanged. Foundation and installed/offline/update PWA group passed
  20 tests. Full final feature/API CI and publication gates remain required.
- Feature CI `36796818836` passed 181 main UI contracts, the related 62 and
  three-engine 51 checks, then correctly rejected generated projection metadata
  still labeled UI17. Local `npm run test:data` reproduced it. The штатный
  standard extractor changed only `metadata.remaked_ui` in the three read-only projection
  files; records and source fingerprints are untouched. Exact Python version
  expectation is updated to 3.00. The focused browser projection check also
  exposed its stale explicit UI17 expectation, now changed to exact 3.00 without
  altering schema/source/count assertions. Full CI is rerun, not bypassed.
