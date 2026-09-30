# Modern 3.00, editable EN and administrator catalog

The owner explicitly approved this scope on 2026-09-30. It supersedes UI17's
desktop layout direction, not its build-import safety fix. Branch:
`codex/modern-3-admin`, based on `99930ce`. Production currently remains UI16.

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
