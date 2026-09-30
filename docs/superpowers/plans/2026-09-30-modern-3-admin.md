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
`a786d50a-56e1-4868-8ca5-58cd1b248d85`. No application tables yet. GitHub has
`CLOUDFLARE_API_TOKEN` secret and `CLOUDFLARE_ACCOUNT_ID` variable. Credentials
were not printed or copied into the repository.
