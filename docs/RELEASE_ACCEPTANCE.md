# Release acceptance

## Modern 3.07 — current racial data, local acceptance only

Implementation is ready for PR/CI. No public acceptance or catalog update is
claimed yet: the production head was revision 2 at preflight. Deployment does
not automatically seed drafts or replace administrator data.

- Read-only source audit matches all 18 current public RU/EN names/descriptions
  and effect numbers from `skills.json`, `strings.en.json`, `racialPassives.json`.
  Owner's Acute Senses ё spelling is the only explicit spelling exception.
  Source hashes and checks are saved outside Git in
  `D:\CODEX\Tasks\pandora-admin-runtime\current-racial-source-audit.json`.
- All 74 backend checks pass, including independent exact text/effect fixtures,
  both ATK units, invalid/duplicate data rejection, normal draft/publish/history
  and immutable rollback. No auth, secrets, schema migrations or source identity
  changes. Existing old two-record correction payloads omit new optional fields.
- Chromium targeted group: 52/53 initially passed; failure correctly exposed the
  old expectation that all race translations were blank. Updated assertions
  require Human→Человек, unchanged unapproved class and exact native build bytes.
  All seven localization checks then pass. Three Python workbook tests likewise
  assumed an empty global dictionary; all ten updated workbook checks pass,
  requiring preservation of the other translations plus exact current 24 names.
  Other Python checks passed in the grouped run; CI still must establish the
  complete final suite result (now 65 tests), not infer it from these subsets.
- Render inspection caught the new JOB description outside the actual card:
  fixed to a semantic li inside its existing scroll surface, with boxed width,
  wrapping and independent DOM text updates. Actual PC 1440×900 and touch-sized
  390×844 screenshots were reviewed after repair. All 11 racial/panel checks pass,
  including actual outputs, source/old/current pins, passive and race removal,
  45 weapon boundaries, popup containment and all five panel close paths.
- Workbook changes exactly H/I rows 1322–1345 (48 cells). All other cell values,
  parsed styles/table, row/style IDs, widths and freeze panes match the source;
  original workbook backup and before/after rendered views are outside Git.
  Native Excel itself was not driven. Translation/data deterministic checks and
  Wrangler dry-run pass; retained 28 classes/6 races/18 passives/211 skills and
  1120 equipment/184 souls retain source fingerprints, only UI metadata is 3.07.

Limits: no modeled attack range, carrying bonus or fatal-hit survival. Source
BARE_HAND cannot justify an invented empty-slot bonus for Strong Arm; the owner's
two-handed scope and existing weapon categories are retained. Server class-skill
reconciliation is next, not complete. Browser plugin not available; used the
existing project Playwright workflow, not a new setup. Reports/screenshots and
synthetic sessions are outside Git; no real credentials in trace-enabled tests.
Current CI still repeats PR/Pages browser gates; its optimization is separate.

CI follow-up (still not publication): first Feature run `37167644279` passed
210 main checks but caught a historical/current naming equality assertion.
The corrected differential keeps exact numerical comparisons and explicitly
requires historical Harmony with Nature versus current Nature's Harmony.
Feature `37168385277` then passed all 211 main checks (zero skips/flaky/failures),
65 Python and catalog/editor/pinned-offline gates; WebKit caught immediate
opener-Escape failing for DEFENSE. That failure reproduced locally, not a
retry-only pass. A same-task click/Escape regression first confirmed stale
aria-expanded/hidden state before the 16ms observer timer. Modern click now
refreshes the panel synchronously and Escape checks native Flag[2], not delayed
ARIA. Seven focused panel checks and the affected scenario in all three engines
pass; PC/touch-sized DEFENSE screenshots were reviewed. Final CI for this actual
runtime fix remains required. No production records have been changed.

## Modern 3.06 — complete skill descriptions, published and verified

PR37 was squash-merged as `01258c6236856f2dbbdd8aa6744b8304f3defefa` and
accepted on 2026-10-04 (Europe/Moscow). Only the Modern description surface
changes: original `LearnSkill_*` nodes/IDs/text and DDM callbacks are reused in
the browser top layer, with a same-node body-portal fallback. No copied game
formulas, altered skill values, catalog publication or museum edits.

- Feature HEAD `3b56c972bd333c4179691bb72c09a477a516a268`: Feature CI
  `37156610968` and API verification `37156610992` succeeded. Main JSON report
  confirms 207 expected, zero skipped/unexpected/flaky results. All other
  configured desktop, catalog, private-editor, three-engine, visual and 64 Python
  gates passed. Locally, four focused and 42 related browser checks plus three
  targeted engine checks passed; the latter took 13.4s. The CI screenshot was reviewed.
- Before the change, the actual 3.05 site reproduced clipped descriptions on PC
  and a 390px touch-sized viewport. The fixture's mistaken skill ID was corrected
  before accepting RED evidence: Bash is `skill.0.15`, not `skill.0.6`.
- Pages `37157943717` and Worker `37157943710` succeeded. Pages tar SHA-256:
  `655103be19a728161a2909f52e5a7c93ba63f1a9c3348adf5b79cc98266e4b86`.
  All 23 sampled live files match the exact artifact. All 459 museum files and
  retained runtime match the accepted preservation artifact; private archive,
  admin source and credentials are absent. Cache:
  `pandora-remaked-3.06-eb49a7d9d5ce1828`. Workbook SHA-256 is still
  `9a0b1308dcfe5fa1c6e49779a470cdaa1ac3fc40cb5535674bea12eb44ae5969`.
- Actual public PC/touch descriptions escape the list boundary, retain full
  source text and stay within the viewport. Moving/tapping into the text, Escape,
  keyboard reopening and panel-switch cleanup pass; native build and skill tables
  remain unchanged. The new module works after controlled offline reload.
  Three focused live checks passed; public PC and touch screenshots were inspected.
- The helper initially hit the retained `window.Set` settings array in
  Playwright's waitForFunction poller, then focused an offline icon before its
  panel was visible. Node-side bounded polling and explicit catalog/panel
  readiness corrected only the helper; no runtime globals or assertions changed.
  Offline diagnostics identified exactly two expected disconnected requests:
  the existing FC2 counter image and Worker public `/api/catalog`. Only those
  exact URLs/errors in deliberate offline mode are classified separately;
  all other console/page/network failures remain fatal. Zero unexpected errors.
- Worker `bd17a31e-6ae1-4019-99c0-86112e88abe3`: existing CI verified deployment
  and health; there were no migrations to apply. Auth implementation, credentials,
  sessions and game records were not changed or re-seeded. The unchanged private
  login was not repeated merely for this UI fix. No paid services were introduced.

Limits: touch context is not physical-phone acceptance; this focused offline
check is not another full installed-app audit. Current catalog remains revision 2;
the full current 18 racial effects/RU-EN skills, supplied banner and wider editor
mechanics remain queued. The owner's testing-efficiency question is recorded as
a proposal, not an implemented CI optimization. Feature and squash source trees
are identical, but the current Pages workflow still repeated the browser suites.
Acceptance documentation is kept locally for the next coherent change rather
than triggering another full docs-only deployment.

## Modern 3.05 — all five floating inspectors, published and verified

PR35 was squash-merged as `03233ce0881f0ac5799a42540b5c0577ed1004ec` and
accepted on 2026-10-04 (Europe/Moscow). Scope:
`superpowers/plans/2026-10-03-all-inspector-popups.md`. JOB/SKILL were examples:
ATTACK/DEFENSE/BUFF now also use the same opaque non-modal floating surface,
without shifting the workbench. Source fields, callbacks and formulas remain.

- Final feature HEAD `dbd34c969ea63032f9ff4d937329f7777895495c`: Feature CI
  `37152907424`, API `37152907467`. Passed 64 Python, 53 backend, 12 desktop,
  203 main browser, 31 catalog-wide, 15 private editor, 74 catalog/context,
  66 three-engine and 28 visual checks: 429 browser checks total. The three
  workspace/main/catalog JSON reports have zero skipped/flaky/unexpected results.
- The strengthened panel contract first failed on ATTACK's `role="region"`.
  The cause was the Modern `tab < 2` gate. Removed only that scope restriction;
  existing positioning, source tab callbacks and dismissal are reused for all five.
  Repeat-tab, Escape on the opener/in the panel, close-button focus restoration,
  one-open-panel switching, scrolling and 568px-height resize pass across engines.
  The full panel contract covers widths 320/390/768/1366/1440/1920.
- Pages `37153804413` and Worker `37153804418` succeeded. Pages tar SHA-256:
  `dc57c44454c882311ad4061bbdbee43a2535d5733ecbf6893f1bfefe0288effe`.
  All 22 checked live files match that artifact; all 459 museum files and retained
  runtime match the accepted preservation artifact byte-for-byte. Private archive,
  admin source and credentials are absent. Cache:
  `pandora-remaked-3.05-5fa3989b510d57f6`. Workbook remains unchanged at SHA-256
  `9a0b1308dcfe5fa1c6e49779a470cdaa1ac3fc40cb5535674bea12eb44ae5969`.
- Actual production passed all five PC/touch popups, repeat-close/Escape, opaque
  bounded surfaces, unchanged source build, four languages, seven bounded numeric
  controls/max messages, BUFF alignment, touch Equipment resize, delayed details,
  320px RU and exact C1 fresh/offline recipients. Final live script: 14 checks,
  zero runtime errors, no injection. The first live helper measured BUFF before
  its scheduled display and received a null rectangle. Waiting for visible panel
  and inputs and measuring pairs atomically fixed the helper; its >=28px height
  and <=1px alignment requirements remain strict. No runtime change was needed.
- Isolated installed Chromium launched Modern 3.05 and museum 2.00 online/offline.
  All five Modern tabs were exercised in both states; builds stayed unchanged.
  Eight checks, zero errors, own test installation removed, user profiles untouched.
  Actual public desktop BUFF and phone DEFENSE screenshots were inspected.
- Worker UUID `4eb12ea3-4cf4-490e-a1ff-18d8223d354c`: actual unchanged-private-
  password Chromium login, authorized catalog read, logout and logged-out reload
  passed, including slow initial-session loading. Secure/HttpOnly/SameSite=Lax
  cookie attributes passed. No credentials, tokens, traces or filled-password
  screenshots were emitted. No draft/game-data publication was performed.
- Annotated `v3.05` points to the accepted runtime squash commit above.
  PR34's documentation-only deployment `37152705635` was also byte-verified as
  unchanged UI 3.04 before this publication; it is not a separate runtime release.

Limits: catalog remains revision 2, containing only the earlier two racial
corrections. The owner's corrected full 18-passive dataset (including Myrine +5%),
current RU/EN skill mapping, supplied banner/author link and character-editor
follow-ups remain unfinished in TASK_QUEUE.ru.md. Maximum remains 55; future
skills are retained. No claim of physical-phone/Safari/manual screen-reader
acceptance. Browser-plugin/skill absent: used the project Playwright workflow.
Only existing free Pages/Worker/D1; no R2/card/paid resources were introduced.

## Modern 3.04 — Hybrid C composition, published and verified

PR33 was squash-merged as `f4cd755664ce1c7156295f8631283ef45e7f8235` on
2026-10-03. Scope: `2026-10-03-hybrid-c-composition.md`. Compact Character /
Skills / Effects, floating JOB/SKILL, personalized input feedback, aligned BUFF
rows and responsive discovery retain all seven inputs, 80 native primary skill
controls, native results and first-screen Equipment. Source formulas/data are unchanged.

- Final feature HEAD `172e15b177978b4e5852e95545c79d0c973382b5`: Feature CI
  `37137877994`, API `37137878003`. Passed 64 Python, 53 backend, 12 desktop,
  203 main browser, 31 catalog-wide, 15 private editor, 74 catalog/context,
  63 three-engine and 28 visual checks: 426 browser checks in total.
  Workspace/main/catalog JSON reports contain zero skipped/flaky/unexpected results.
- RED/GREEN exposed inherited nowrap clipping phone SKILL/RU headings,
  transparent native popup surfaces and the narrow PC Potential budget caption.
  Natural wrapping, opaque cream surfaces and short label/value budget rows
  fix the causes. Responsive measurements wait for the same-node toolbar move
  and read BUFF pairs atomically; alignment/height/first-screen bounds were not relaxed.
- Pages `37138983439` and Worker `37138983447` succeeded. Exact Pages tar SHA-256:
  `2c8608541c466800abea714af48c10d943ee68b48782e95545a64218e3b11df5`.
  All 22 checked live files match that artifact; all 459 museum files and retained
  runtime are byte-identical to the previous accepted preservation artifact.
  No private archive/admin source/credentials were published.
  Cache: `pandora-remaked-3.04-7d8d84bcbec9c15c`.
- Workbook SHA-256:
  `9a0b1308dcfe5fa1c6e49779a470cdaa1ac3fc40cb5535674bea12eb44ae5969`.
  Eleven append-only EN/RU captions extend 2,882 data rows to 2,893 / 226 UI
  captions. Previous values, owner overrides, source cells and native formatting
  are preserved. Table range: A1:I2894. RU H / editable English I remain supported.
- Actual production passed four-language/source invariance, native allocation
  and synchronous load, all five inspectors, JOB/SKILL repeat-close/Escape and
  opaque/wrapped phone panels, all seven personalized EN/RU maximum errors,
  BUFF alignment, touch selection across keyboard-equivalent viewport resize,
  delayed characteristics and 320px RU. No duplicate FILE/LOG/import or runtime
  exceptions. Fresh C1 shared recipients restore exact calculation and context,
  including cached offline reload; nonmutating current-catalog adoption passed.
- An isolated real Chromium PWA launched Modern 3.04 and museum 2.00 online and
  offline, then was uninstalled. User profiles were untouched. Production desktop,
  first-screen phone, phone popup and BUFF screenshots were inspected.
- Worker UUID `4e06924a-af5e-4cb5-a881-7618c5633da5`: all four deployed assets
  match canonical Git blobs. Real unchanged-private-password Chromium login
  with 1,200 ms initial-session latency, authorized read, logout and logged-out
  reload passed. Actual Pages IDDQD entry passed with third-party cookies blocked;
  all six current-record displays and server previews passed on PC/phone with
  exact before/after item state unchanged. No draft/publication, credential logs,
  filled-password screenshots, traces, HAR or video were produced by acceptance.

Limits: production catalog is still revision 2 (only the earlier two racial
corrections). The owner's later exact current-server dataset, including Myrine
+5%, is new unfinished work, not covered by the prior +2 acceptance. Custom
learning, new classes, replacement of hardcoded class passives and active combat
remain unfinished. Future levels/skills stay available; physical phones/Safari
and manual screen-reader conformance are not claimed. Browser-plugin interaction
was unavailable, so rendered checks used the project's Playwright setup and real
URLs. Only existing free Worker/D1/Pages were used; no R2/card/paid service was added.

## Modern 3.03 — compact controls and clearer editing, published and verified

Scope: `superpowers/plans/2026-10-03-compact-inputs-and-review.md`. PR30
(`b55a0400f48a888cf8e23dcda25a6698f87bb444`) and PR31
(`311ad4123e6144b6b15c2774a4d09ebcf4fd0aaf`) were squash-merged on 2026-10-03.
Annotated `v3.03` points to the latter accepted code, not an unverified candidate.

- Final feature HEAD `7a94dfea29616082f4a3ac8c850a10ed99d3119b`: Feature CI
  `37128992142`, API verification `37128992137`. Passed: 63 Python, 53 backend,
  7 desktop workspace, 197 main browser, 15 private editor, 74 catalog/context,
  63 three-engine smoke, 31 catalog-wide and 28 rendered visual checks.
  Workspace/main/catalog JSON reports contain zero skipped/flaky/unexpected
  results. The earlier full local run passed 413; two added follow-up contracts
  and the related 85- and 16-test groups passed before final remote CI.
- Source-wide differential checks cover all 1,560 available records in valid
  native contexts: 1,120 gear, 183 eligible souls, 28 classes, 18 racial selections
  and 211 actually learned skills. Stigmata Soul has no permitted source slot and
  is reported unavailable, not assigned invented compatibility. These are not
  all combinations or proof of Weapons of Balance's complete current balance.
- Silver Wand's recovery-array lookup and Waist Belt's unresolved `-7` marker
  are explicit Modern adapter fixes. Edited Waist Belt keeps confirmed numeric
  bonuses and warns about the unmodeled conditional effect; no MP penalty is
  guessed. Native caches/source rows restore in finally, including exceptions.
  Original calculator formulas and museum files are unchanged.
- Final Pages `37129818426` and Worker `37129818509` succeeded at PR31. Exact
  Pages tar SHA-256:
  `7b693136c4db09a676e2955e62eb6a52b11760d54745f1e8373d7484abfadc9c`.
  All 22 checked live files match that artifact. All 459 museum files and the
  retained runtime are byte-identical to the earlier accepted preservation
  artifact. Private archives/admin sources/credentials are absent.
  Cache: `pandora-remaked-3.03-bb3b5a673ecfdea6`.
- Workbook SHA-256:
  `12318ef0d4d381f1ef2e927b5329554e1a37e8c7d333977bd16c431e43f14921`.
  All previous 2,875 rows and translator input/styles are preserved; seven UI
  captions extend the table to 2,882 rows / 215 UI captions. Editable RU and EN
  overrides remain separate from source cells and game calculation data.
- Real final production passed four-language/source invariance, seven bounded
  numeric controls/native allocation, synchronous focused-field load, first-screen
  weapon, all five bounded inline inspectors, touch Equipment across viewport
  resize, delayed anchored characteristics, 320px RU, no duplicate FILE/LOG and
  nonmutating current-catalog adoption. A fresh C1 shared recipient restores
  exact calculation/state, also after cached offline reload. No runtime exceptions.
- A real isolated Chromium PWA launched Modern 3.03 and museum 2.00 online and
  offline after the final deployment, then was uninstalled. User profiles and
  installed apps were not touched; this is not physical-phone acceptance.
- Worker UUID `234042bc-0b8e-45a6-b244-91ad391fc69e`: all four deployed assets
  match canonical Git blobs. Real unchanged-private-password login, authorized
  1,561-record catalog, logout revocation and logged-out reload passed Chromium,
  Firefox and Windows WebKit. Chromium also entered the password before a real
  delayed initial session response at 1,200 ms simulated network latency: no
  erasure, successful native redirect. No request routing or cookie injection.
- Actual production Pages IDDQD entry passed with third-party cookies blocked.
  All six current-record displays and server previews worked on PC/390px;
  exact before/after item state proves no draft/publication was created by those
  checks. Passwords, session cookies and tokens were not logged; no credential
  traces, HAR, video or filled-password screenshots were captured.
- Owner-approved production catalog revision 2 contains only the Stone Skin and
  Magic Resistance corrections. All 18 real racial selections match revision 0
  except those two -2 critical adjustments; native -10 physical/magic protection
  and Myrine's bonus remain intact. An old C1 link remains pinned to revision 0
  until the explicit Update current build action. Real Compare hides/reveals
  exactly equal rows without changing the active build. No fabricated balance
  records or sample variants were published.

Limits: custom learning rules, new classes, replacement of hardcoded class
passives and active combat damage are not shipped. Unknown source effects are
identified rather than presented as zero. Windows WebKit's existing cookie
observer limitation is documented in 3.02; physical Safari/phones and manual
screen-reader conformance remain unverified. Only existing free Worker/D1 and
GitHub Pages were used; no R2, card requirement or paid service was added.

## Modern 3.02 — native-gated skill additions, published and verified

Scope: `superpowers/plans/2026-10-03-skill-catalog-additions.md`. PR28 was
squash-merged as `6af7bc5294c1d5691ea88e309f783e7453ccbabe` on 2026-10-03.
New source-template active/passive identities, declared conditional bonuses,
private editor duplication and non-overlapping keyboard details are released.
Original intrinsic mechanics are not copied into new passives. Custom learning,
new classes and new combat damage remain unfinished separate blocks.

- Exact feature HEAD `8a1bcf2657c6536e2853530a0f00526869cf5444`: Feature CI
  `37082164957`, API `37082164962`. Passed: 63 Python, 50 backend, 5 workspace,
  182 main browser, 10 private editor, 74 catalog/context, 60 three-engine smoke
  and 28 visual checks. Workspace/main/catalog JSON reports contain zero skipped,
  flaky or unexpected results. Linux and Windows PC/320/390 views were reviewed.
- Pages `37083172767` and Worker `37083172764` succeeded at that merge. Additive
  migration `0003_skill_variants.sql` passed without rebuilding existing tables.
  Worker UUID: `3d1b1713-6491-4cd6-9379-2285bf1898cd`.
- Exact Pages tar SHA-256:
  `6de4d6a7efc327808e2bffccbe9c46f286042d1ed70727f46b1a0316895ae138`.
  Seventeen live files match this artifact. All 459 museum files and retained
  runtime files remain byte-identical to the previously accepted source.
  Workbook SHA-256: `c03e73cc4db2a8be9a461814a0f70043331fe40dff969ea1530382cb28d539d5`.
  All 2866 prior workbook rows, translations and styles are preserved; ten new
  captions extend the existing table. Cache: `pandora-remaked-3.02-937fcb3781195554`.
- Actual production passed four languages with unchanged source state, full
  compact desktop controls/first-screen weapon, the Skill List below the entire
  calculator, anchored delayed Equipment cards, no duplicate FILE/LOG/import,
  320px RU, nonmutating current revision adoption and zero runtime exceptions.
  A clean shared-link recipient restores exact C1 state/calculation, also offline.
- A real Chromium PWA in a temporary isolated profile launched Modern 3.02 and
  museum 2.00 online/offline. It was uninstalled; user profiles were untouched.
- Direct native Worker login with the unchanged private-file password, real
  authorization/catalog read, logout revocation and logged-out reload passed
  Chromium, Firefox and Windows WebKit. Actual Pages IDDQD entry also passed
  with third-party cookies blocked, including read-only PC/phone editors and
  the real active/passive creation controls. Four Worker assets match canonical
  Git blobs exactly; Windows checkout CRLF conversion is not a deploy difference.
  No credential trace, filled-password screenshot, auth-token storage, sample
  game draft or publication was created. Public game revision remains 0.

Limits: 256 additional skills total, immutable source-template learning/type,
active text/MP/timing metadata rather than combat actions. All variant creation,
calculation, comparison, adoption, rollback and pinned/offline tests use isolated
fixtures rather than fabricated production balance records. Windows WebKit's
cookie-observer limitation still applies; physical Safari/phones and manual
screen-reader conformance are not asserted. The preserved global Set also
requires isolated locator polling in Playwright; the source was not rewritten.

## Modern 3.01 — compact PC workspace, published and verified

Scope: `superpowers/plans/2026-10-01-desktop-workspace.md`. Source engine/data,
translation workbook and all security restrictions are unchanged. Wide PC
presentation retains complete controls with two skill columns and compact
character/settings/results; narrow layouts retain touch targets. PR26 was
squash-merged as `8c5def5d53a62030fb09cdb7f337d9bfd9508bee` and published on
2026-10-03 Moscow time (2026-10-02 UTC). Annotated tag `v3.01` was pushed only
after the following gates passed:

- Exact feature head `c6c8403578022e4127c04e2da76fd2ea6f9768ff`: Feature CI
  `37075143411`, API verification `37075143351`. Five early workspace and 182
  main contracts have zero skipped/flaky/unexpected results. Also passed:
  eight private editor, 63 related, 57 cross-engine, 28 rendered visual,
  62 Python and 43 backend tests. Both Linux default workspace screenshots and
  PC/phone QA were inspected; controls and assertions were not reduced.
- Pages `37075816244` and Worker `37075816303` succeeded at that exact merge.
  Worker version: `0644546a-050a-40ae-ab93-078ca1d95335`.
- Exact Pages tar SHA-256:
  `22309b0a5ea700826d012cf14d3b8d57ef94ec009102b5889dee0865ade3363d`.
  Seventeen live files match the artifact, including all three source-data
  projections. All 459 museum files and the recovered retained runtime match
  the previous accepted artifact. Workbook SHA-256 remains
  `65a9334af29e1d614288ef692a1be8f982f75158f8e2f12cd24efda7f3fc8ce3`.
  Private archives, admin sources and credentials are absent from the artifact.
  Cache: `pandora-remaked-3.01-ab36e6d566f0ee74`.
- Actual production passed four-language/source-state checks, complete default
  desktop character/skills and first-screen weapon, no duplicate FILE/LOG/import,
  anchored Equipment picker with delayed characteristics, 320px RU layout and
  live revision 0 adoption without mutation. A clean recipient restores exact
  C1 context/calculation from the shared URL and after cached offline reload;
  the museum boots as engine 2.00. No page runtime exceptions were observed.
- Actual installed Chromium PWA, using only a temporary isolated profile,
  launches Modern 3.01 and museum 2.00 online/offline with identical source
  build data. The verification app was uninstalled; user profiles were untouched.
- Direct native `/admin` navigation, the unchanged private-file password,
  authorized read of 1561 records, logout revocation and logged-out reload
  passed again in Chromium, Firefox and Windows WebKit on the deployed Worker.
  No routes, fabricated Origin, injected auth cookies, credential traces or
  filled-password screenshots. Public game revision remains 0; no test drafts
  or game data were published. The prior Windows WebKit cookie-observer
  limitation still applies; physical Safari is not asserted.

The layout is a complete PC refinement, not a claim that every UI issue is
gone. Long labels may grow naturally, and physical phones/manual screen-reader
conformance remain unverified. New skill/class mechanics are the next catalog
block; they were not included in this release.

## Modern 3.00

Status: PR24 was squash-merged as `7b94428e86c1e187436039fd383089c16f2e9310`
and published on Pages on 2026-10-01. The approved scope is
`superpowers/plans/2026-09-30-modern-3-admin.md`. The subsequently reported
direct Worker-native login was corrected and verified in PR25; acceptance
is recorded at the published PR25 merge, not the original incomplete gate.

The initial release includes editable EN/RU workbook, secure Worker/D1 administration,
initial gear/Soul/class/active/passive/racial editors, version-pinned catalog
and complete C1 build context, compact desktop controls, one Builds/Compare
header group, consolidated Code operations, explicit Legacy FILE recovery and
safe opt-in published-catalog adoption for the current character.
The 459 preserved source files stay unchanged. All 2842 pre-extension workbook
rows remain intact; twenty-three new bilingual UI rows bring the total to 2865.

Feature head `9fe91fe4d4d31765192aba76e21d7bddf86628d4` passed Feature CI
`36799272772` and API verification `36799272886`: 182 main browser contracts,
62 related, 51 cross-engine, 28 visual, 62 Python and 42 backend tests. The
main report has no skipped, flaky or unexpected results.

Published release evidence:

- Pages run `36800046613`; GitHub-token Worker run `36800046623`, deployed
  version `cae28ebe-2658-431e-8eb8-3786b316923c`. Real API security and actual
  Pages IDDQD authentication with third-party cookies blocked passed; all 1561
  records and the four expanded editor views were inspected read-only, and
  logout revoked the session. Public revision remains 0; no test data published.
- Exact Pages tar SHA-256:
  `03e2e5e22d29cad497e75cca512aa729f6e2c81b3e7353dc57db2c960e6e3f72`.
  All 459 preserved files and recovered museum runtime match the prior accepted
  artifact; workbook SHA-256 is
  `65a9334af29e1d614288ef692a1be8f982f75158f8e2f12cd24efda7f3fc8ce3`.
  Thirteen live assets match the exact artifact. Cache:
  `pandora-remaked-3.00-eabab34105cea48d`.
- Public checks covered four languages, unchanged source arrays/build data,
  Equipment delay/dropdown, 320px RU layout, live published head and a fresh C1
  recipient with identical context/summary, plus offline Modern and museum boot.
  Installed Chromium PWA ran Modern/Legacy online and offline in an isolated
  profile. No user browser profiles or catalog data were changed.

## Direct Worker-native login follow-up — published and verified

The owner reported that `/admin` rejected the existing private-file password.
An unmodified production browser reproduced `Referrer-Policy: no-referrer`,
native form `Origin: null`, HTTP 403. The password was not the cause. Initial
Pages-entry acceptance had missed this different native navigation path.

The correction changes that policy to `same-origin`, keeps null/missing/foreign
origins rejected, redirects denied native forms to an intelligible retry page,
and sends localhost IDDQD to first-party login without collecting credentials.
Password, hash, pepper, CORS and session restrictions are unchanged.
Local checks passed 43 backend, 14 entry/editor and 54 cross-engine tests.
The native regression uses actual Worker routing and SQLite; its explicit
test-only redirect boundary does not substitute for real production navigation.

PR25 passed exact-head Feature CI `36803582316` and API verification
`36803582405`, then squash-merged as `e589398a5d5895fdefd2186074d60d4e9257679c`.
CI: 182 main (zero skipped/flaky/unexpected), 8 private editor, 63 related,
54 cross-engine, 28 visual, 62 Python and 43 backend tests.
Pages `36804053399` and Worker `36804053403` succeeded. Worker version:
`e763688c-275c-447e-aa6e-6e58e29a04dc`.

Actual direct `/admin` form navigation with the unchanged private-file password
passed Chromium, Firefox and Windows WebKit, without routes, fabricated origin,
cookie injection, tracing or filled-password artifacts: browser-generated own
origin, real 303/authorized page, read-only 1561-record metadata, empty password,
no client auth storage, logout revocation and logged-out reload. Ten additional
real API/security checks and deployed Pages IDDQD with third-party cookies
blocked passed; all six catalog kinds were read without publishing game data.

The browser observer initially failed its Windows WebKit SameSite assertion.
Upstream explicitly marks Lax/Strict cookie reporting there as an expected
failure: [Playwright cookie tests](https://github.com/microsoft/playwright/blob/main/tests/library/browsercontext-cookies.spec.ts#L122).
This port also omitted the native redirect Set-Cookie from its response API.
Actual server `Secure; HttpOnly; SameSite=Lax` was independently observed in
Chromium/Firefox; no server restriction was relaxed. WebKit functional login
is not physical Safari cookie-policy acceptance.

Updated exact artifact SHA-256:
`f08d2a8de1eca14e9496d3f36f8e1f0d6853fd4f596851ec581481b6abd00a63`.
459 preserved files/recovered runtime and workbook remain unchanged; thirteen
live assets match. Cache: `pandora-remaked-3.00-ca3c7937912e201e`.
Public four-language/state, dropdown delay, 320px RU, fresh C1 recipient/offline
and isolated installed Modern/Legacy online/offline PWA gates passed again.
The owner's additional desktop compactness block was subsequently published
and verified as Modern 3.01, recorded at the top of this ledger.

New arbitrary class/skill slots, native class-passive replacement, active combat
damage simulation, physical phones and manual screen-reader conformance are
not implemented or asserted. Numeric editor fields must affect the retained
engine or be explicitly scoped to native skill metadata, never invented rules.

## Superseded standalone candidate — Calculator code UI 2026.09.17

Scope: `superpowers/plans/2026-09-30-calculator-code-safety.md`. Safe shared
Modern import, native code/riding actions and existing min/max translation
targets. Acceptance requires feature CI, exact Pages artifact/live verification
and isolated installed-PWA online/offline checks. Annotated **`v2026.09.17`** is
created only after these gates pass and records exact runs and fingerprints.

All 459 published Legacy files and the entire workbook must remain identical
to accepted UI16. Physical phones, screen-reader acceptance and complete WoB
balance parity are not asserted. Unenhanced museum Code Load remains preserved;
safe Modern import is an intentional boundary, not a Legacy source rewrite.

## Historical skill allocation — UI16

Scope: `superpowers/plans/2026-09-30-skill-allocation-ux.md`. Full branch names,
source-delegating skill controls and deliberate effects switching. Acceptance
requires feature CI, exact Pages artifact/live verification and isolated
installed-PWA online/offline checks. Annotated **`v2026.09.16`** is created only
after these gates pass and records exact runs and fingerprints.

All 459 published Legacy files must remain byte-identical to UI15. All 2,837
prior workbook rows and 139 Russian values must remain identical, with five
new rows only. Physical phones, screen-reader acceptance and complete WoB
balance parity are not asserted. Horse and other dense secondary source
controls remain a separate usability follow-up.

## Historical calculator readability — UI15

UI15's scope is recorded in
`superpowers/plans/2026-09-30-calculator-readability.md`. It corrects calculator
descendant fonts, adds source-delegating native character controls and reflows
primary sections. Publication is accepted only after feature CI, Pages exact
artifact/live verification and isolated installed-PWA online/offline checks.
Annotated **`v2026.09.15`** records the successful runs and fingerprints when
those gates pass; absence of that tag means acceptance is still pending.

The translation workbook and all Legacy files must remain identical to UI14.
Physical iOS/Android devices, screen-reader acceptance and complete WoB balance
parity are not asserted. Dense skill-allocation arrows, horse/effect controls
and some secondary source panels remain a separate usability follow-up.

## Historical Equipment follow-up — UI14

UI12 shipped in PR #17, feature HEAD `12fffd4dd3a28877d66ac0eab5c631415149d911`,
feature CI `36658390600`, squash `edfb202d58b9f8e0e1b7866e15c73d4aaf443559`
and Pages `36658979809`. Passed: 57 Python, 119 Chromium, 18 three-engine and
21 visual checks; exact artifact and live Equipment/hover/load/share/offline
acceptance. All 459 Legacy files and the translation workbook remain unchanged.
Artifact SHA-256: `396b919cf3c8d82513d3e0b2e7d423debdb14f6e4e8c8528493f84d5d1781ff1`;
cache: `pandora-remaked-2026.09.12-c14cb1612004a7bc`.

Additional keyboard QA found automatic scrolling could close an off-screen
item's focused card. Further user feedback requested compact anchored dropdowns
instead of Equipment modals and removal of repeated Characteristics rows. UI13
addresses these together; gates are tracked in
`superpowers/plans/2026-09-30-equipment-picker-followup.md`. Final acceptance is
recorded by annotated **`v2026.09.14`**, created only after exact feature CI,
Pages artifact, live-site and isolated installed-PWA verification. Its message
records those run IDs and fingerprints. If the tag does not exist, these final
gates are not complete. Earlier releases do not substitute for UI14 gates.

UI13 published through PRs #18/#19, final feature CI `36687313590` and Pages
`36687944657` (squash `e0371ff4caad94610642b27ce8220703a7b2453a`). Its 126
Chromium/57 Python/21 three-engine/22 visual checks and live site acceptance
passed; all 459 Legacy files stayed identical. Final installed-app acceptance
then exposed a late pointer-focus scroll closing an explicitly opened card.
No `v2026.09.13` acceptance tag was created. UI14 corrects that event-ordering
defect and the hover-to-explicit pinning behavior; it must pass the same gates.

## Historical UI11 release record

This is the completion boundary for the approved Phases 0–7. Cloud save/backend is a later, separately designed project; GitHub Pages stays free/static. Official Russian game translations remain user input through the workbook.

## Immutable publication record

The annotated Git tag **`v2026.09.11`** is created only after all gates below pass. Its message records the exact feature CI run, squash merge commit, production workflow, artifact/cache/workbook fingerprints and live acceptance. It is the immutable final publication record, not a claim made before deployment. Inspect it with `git show v2026.09.11` or the repository Tags page. Final acceptance was deferred to include the user's UI, item-preview and sharing requests.

The preceding keyboard/localization block shipped in PR #14 (`816e72f`), feature CI `36631948186`, production workflow `36632481054`. Its exact artifact and live UI 2026.09.9 passed workbook equality, all four native dialogs/background inertness/opener restoration, non-empty search Escape, Legacy globals/source display isolation, both offline routes and both compressed save/load paths, with no browser errors.

## Final gates

**Passed:** PR #16 (`e0ee03d90e5ba20ee83ce774a87c75bf3ff5f3ad`), feature HEAD
`54af919c9c43d9925464771eef95d6f72a0cc730`, feature CI `36653977707`, Pages
workflow `36654352147`, exact artifact/live acceptance. Annotated `v2026.09.11`
exists and records fingerprints/results. All 459 Legacy files match UI10.
Real isolated desktop PWA install, both routes standalone online/offline and
uninstall also passed for production UI11. These are historical automated
release results, not acceptance of every requested interaction: subsequent user
feedback identified immediate hover previews and missing characteristics in the
actual Equipment selectors. UI12 corrected that gap; UI13 covers the later
off-screen keyboard regression described above. Current-server
complete balance parity is not claimed.

- Exact Git archive static validation and original Legacy preservation manifest; no original `index.html`, `js/`, `css/`, `image/` or preservation-source edits.
- 57 Python tests; deterministic 2,667 Legacy terms, 2,837 translation rows, 1,120 equipment, 184 Souls, 211 skills. All prior translator input is preserved; nine new interface translations were appended.
- 109 Chromium contracts including Modern/Legacy differential, build round trips, storage corruption/quota behavior, localization, native dialogs, image decoding, item descriptions/socket rings/upgrades, fresh-browser sharing, clipboard denial and offline routes. A successful shared-character load must not hide an autosave quota warning.
- 15 bounded Chromium/Firefox/WebKit smoke checks; 19 desktop/mobile visual captures including the changed surfaces. Real source-language release images and icon exports manually viewed; README image/link/alt audit.
- PR CI green for the exact feature HEAD, squash merge, Pages workflow success; download and inspect that run's artifact, not a local approximation.
- Live UI version, workbook SHA-256, OG PNG dimensions/URL/MIME, installer icons, Chrome manifest/installability diagnostics, calculation/state isolation, keyboard dialogs, offline routes and compressed saves; zero startup/runtime HTTP errors.

## Honest limits

- Browser accessibility role/name/focus evidence is not a full WCAG or manual screen-reader conformance claim. The inherited calculator is not completely semantically remediated.
- Real isolated desktop Chromium installations of production UI 2026.09.10 and UI 2026.09.11 passed standalone Modern and Legacy launches, both online and offline; they were then uninstalled without touching the user's browser/profile. This is not physical iOS/Android device acceptance. The SVG/PNG/touch icon files are real, decode and have verified dimensions.
- Social metadata is verified from the actual public response; third-party messenger preview caches/refresh timing are not controlled by the project.
- Named builds remain local to the current browser. Export important builds before clearing browser storage, or use Share build to send the current character to another browser. Anyone with the URL can read that build; this is not private/cloud storage.
- Item previews show source descriptions, not calculated stat deltas. Modern Equipment item/Soul selectors now offer read-only cards with deliberate hover, keyboard review and explicit touch disclosures. Search also provides cards but is not a new socket editor. Original native selects remain the script-unavailable fallback; museum menus stay unchanged.
- Russian game names are not guessed. Empty workbook translations use source-language fallback; the museum route, diagnostic Log and image lettering are not Russian text surfaces.
- The user clarified that Modern targets Weapons of Balance. Phases 0–7 prove the modernization against Legacy 2.00, not parity with this server's current balance. Server-specific data/formulas require a separately visible and tested compatibility layer, never a silent museum-source rewrite.

## Approved spec success-criteria audit

The 15 criteria in section 23 of the approved spec map to these maintained
contracts and evidence. Publication gates above must pass for the final tag.

| Criterion | Evidence and boundary |
|---|---|
| 1. Main desktop layout | Foundation contracts and actual desktop captures; no original floating header in Modern. |
| 2. Preserved museum | Static source manifest, self-contained `/legacy/`, byte comparison of production Legacy files. |
| 3. Matching calculations | `compare-differential.spec.mjs` and summary/adapter contracts use the same preserved engine. This is Legacy parity, not current-server parity. |
| 4. Real item/Soul IDs | Adapter/search contracts compare direct Legacy selection, exact serialized state and unchanged source arrays. |
| 5. Refresh recovery | Build Manager autosave/reload and invalid/quota handling; share load must retain write-failure warnings. |
| 6. Multiple named builds | Save/load/rename/duplicate/delete, corrupt-sibling and local-storage boundaries. |
| 7. Clear comparison | Neutral B−A deltas, projection restore, missing/corrupt build states, rendered desktop/mobile table. |
| 8. Practical mobile | 320/390/768px contracts, 44px primary touch actions, collapsible cards and explicit non-equipping item details. |
| 9. Installed/offline app | Both cached routes and update contracts; isolated real desktop Chromium install/standalone online/offline/uninstall acceptance. Physical iOS/Android remain unverified. |
| 10. EN/RU workflow | Unified language control; workbook publisher, translation-only update, edited-workbook display isolation and source fallback. User's client terms retained for future verification. |
| 11. Player READMEs | EN/RU player-facing doc tests, actual panel PNGs/provenance, reference/alt audit and rendered GitHub image check. |
| 12. Ownership boundary | Restrictive new-material LICENSE, original author's permission in NOTICE, existing art clearly unofficial. |
| 13. Visible updates | Localized Updates native dialog, version badge and full changelog link. |
| 14. Deployment gates | Feature CI and Pages workflows run static/Python/browser/data/translation checks before publishing. |
| 15. Deferred cloud | Local browser storage and URL sharing only; no accounts/backend/Cloudflare changes. |

Translation instructions for ordinary users: [Russian beginner guide](LOCALIZATION_FOR_BEGINNERS.ru.md).
