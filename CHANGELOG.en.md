# Release history — English

Canonical source: [CHANGELOG.md](CHANGELOG.md). The site's What's New panel displays user entries only.

## Modern 4.29 — 2026-10-29

### For users

- **The catalog now includes 14 current fire weapons:** find and equip them in builds while retaining compatibility with existing items.
- Their stats and Fire Gem enhancement conditions are included. Spark Wand gains additional SPR from +7; its INT bonus stays unchanged.
- For weapons with Phoenix Flame, Attack → Special weapon effects shows the listed chance, base damage and cooldown. Final damage to a target is not calculated.

### Development and technical changes

- Publish 14 retained IDs in catalog revision 94; verify prior revisions, drafts, admin editing, and live calculations. Record reviewed server identity links to prevent duplicates.
- The source corrected Spark Wand refinement from INT to SPR, consistent with the owner's in-game observation.

## Modern 4.28 — 2026-10-29

### For users

- Melee and ranged attack range calculations include weapon, equipment, soul and racial bonuses when configured in the catalog. Unverified range remains marked as unknown.
- Equipment details show configured enhancement conditions and special weapon effects; build migration reports changes to enhancement rules when the catalog is updated.
- The Attack panel keeps a consistent height when switching pages and stays within a shorter browser window.

### Development and technical changes

- Add editable enhancement conditions, range and special effects, with catalog snapshot and saved-build compatibility checks. Prepare a guarded batch publication path for existing records, checking revisions, drafts and translations.
- Audit public game data and a D1 backup; retain unconfirmed identities and editorial changes for separate review. No automatic bulk replacement of the catalog.

## Modern 4.27 — 2026-10-21

### For users

- Internal technical improvements.

### Development and technical changes

- Fix stuck catalog/draft loading messages caused by late shell translations overwriting resolved states. Recheck late localization and RU/EN/JP/TW transitions.
- Add explicit per-section errors and in-place retry after partial API failures. Invalidate stale field-by-field draft comparisons immediately on editing.
- Fetch custom draft identities in batches and keep the rest of the queue readable if a historical draft payload is invalid. No content publications, legacy changes or gameplay formula changes; backed by regression tests.

## Modern 4.26 — 2026-10-21

### For users

- Internal technical improvements.

### Development and technical changes

- Admin catalog review now displays exact editable-field differences, including four locales, skills and calculation settings; the draft queue exposes real change counts.
- Reject saving or publishing existing entries with no effective changes, including atomic batch guards. Legacy no-op drafts remain visible for explicit cleanup.
- Add version-checked private draft discard for source or already-published entries, preserving public revisions, historical data, Legacy and formulas. Cover with API and browser regression tests.

## Modern 4.25 — 2026-10-13

### For users

- **HP and MP now use current in-game progression coefficients for all 28 classes** rather than historical values from the preserved calculator.
- Equipment percentage bonuses and the Sign of Life buff now scale the class base separately from flat HP/MP bonuses.

### Development and technical changes

- Generate the 28-class Modern-only current-source coefficients from the dated Pandora Saga OS class registry; leave the preserved Legacy 2.00 calculator and data unchanged.
- Add Cleric real-client vitals regression and correct the flat +50 MP Necklace #20001; Moonlight Wand (level 21, ID 2621) provides the final +2 gear SPR, completing all four equipped SPR points alongside pants +1 and High Soul +1. Race starting baselines remain to be verified separately.

## Modern 4.24 — 2026-10-13

### For users

- **All 14 Potion Effects names now display in Russian** when using the RU interface, with updated base-healing descriptions.
- Four legacy-only entries are clearly marked as unverified for the current game. Existing custom translations remain authoritative.

### Development and technical changes

- Seed 28 RU game-translation records through an additive D1 migration and approved fallback, preserving existing publications, reset tombstones and drafts. Cover editor-first precedence and user-facing labels in regression tests.
- Character formulas, frozen Legacy and saved builds are unchanged.

## Modern 4.23 — 2026-10-12

### For users

- **Corrected Hepatica healing:** the Modern calculator now uses 20 base HP rather than the older 10 HP.
- Potion Effects results now show full Russian/English names and base recovery in tooltips for confirmed current items. When an archived entry has no confirmed current item match, its tooltip clearly identifies the calculation as historical.

### Development and technical changes

- Preserved Legacy 2.00 and saved builds. Exactly ten of fourteen historic potion rows have verified current item identities; four remain explicitly unverified.
- Added read-only bilingual content coverage and stable healing identity checks. No automatic D1 publication or unverified gameplay formula changes.

## Modern 4.22 — 2026-10-12

### For users

- Fixed the **Potion Effects** tab: when **Use potion effects** is off, show only original potion recovery — base HP amounts for fixed potions and original percentages for percentage potions.
- For example, **Rest POT** shows **15%** while disabled, without applying **Potion Healing** bonuses. Enable the switch to see calculated HP recovery including the character's applicable potion bonus.
- Turning the switch off immediately restores the base values. Changing tabs never opts in to the calculation, and character builds and formulas are unchanged.

### Development and technical changes

- Correct the unintended Flag[6]-independent Modern potion preview introduced in 4.21. Display calculated HP only when the native switch is ON; otherwise show 10 flat source HP amounts and four original 5/15/30/18-percent labels.
- Preserve the native `floor(fixed*POT/100)` and `floor(LP*ceil(percent*POT)/10000)` order when enabled; avoid stale values when toggled off or when calculated inputs are invalid. Update Playwright coverage for 14 items, both toggle directions, 1–4 potion Souls and RU/EN/JP/TW.
- Frozen Legacy 2.00, `js/calc.js`, `js/create.js`, D1 publications and saved-build revision semantics remain unchanged.

## Modern 4.21 — 2026-10-12

### For users

- **Fixed the Potion Effects tab:** all 14 items now show calculated HP recovery instead of unavailable dashes, including flat and maximum-HP percentage potions.
- The preview appears even when the separate "Use potion effects" switch is off. Inspecting potion values never enables that switch or modifies your build.
- Values update when character stats, gear or Souls change. Potion and Skill Effects tabs also support clicking and keyboard navigation.

### Development and technical changes

- Add Modern-only display calculation of all 14 flat/percentage potion amounts using the preserved floor/ceil order, without changing Flag[6], gameplay formulas or archived Legacy 2.00.
- Regress against source Potion Soul `103018` (+8 POT) for 1/2/3/4-Soul combinations and Paladin melee-branch mastery 101. Illustrative values are not independent live-client parity claims.
- Independent server snapshot confirms **145** base HP for `50061` Mysterious Potion despite obsolete **175** historical tooltip; never overwrite owner-published D1 translations. Include browser checks of four locales, toggle and build integrity.

## Modern 4.20 — 2026-10-12

### For users

- Internal technical improvements.

### Development and technical changes

- Add a read-only `scripts/audit_pandora_os_live_weapon_ranges.mjs` audit of **164 stable weapon identities** (including 23 Modern UUID rows), comparing current public Pandora Saga OS item JSON or an explicitly supplied local source with the dated baseline.
- Two separately dated October 7 and October 11, 2026 source snapshots agree on all 164 base ranges, kinds and slots. Offline tests independently flag range, kind and slot drift, removed IDs, missing numbers and untrusted inputs; deterministic SHA-256, bounded examples and strict exit status support verification.
- Live HTTP failures never silently substitute the historical fixture. This does **not** calculate effective attack range with Riding, EquipOpt[40/41], skills or passives, or claim game-client parity. No changes to Legacy, Modern formulas, D1, auth or saved builds.

## Modern 4.19 — 2026-10-12

### For users

- Internal technical improvements.

### Development and technical changes

- Safely recover the previously reviewed but unmerged PR #204 on top of deployed Modern 4.18, without reverting the parallel 4.17 JP/TW D1 audit. Add **60 D1-first EN/RU/JP/TW UI labels** for 33 numeric effect IDs, units, class LP/MP coefficient fields, accessible controls and dynamic review previews.
- Switching locale changes display-only labels and never selected stat IDs, numeric inputs, flat/percentage units, unpublished drafts or catalog revision. Unknown effects retain their original code; published D1 translations win.
- Add four-locale fallback tests and browser regressions. No numerical formulas, frozen Legacy 2.00, server auth, stored builds or published D1 entries change.

## Modern 4.18 — 2026-10-12

### For users

- Guild-skill keyboard navigation now keeps each tooltip synchronized with the selected level, instead of showing a previous option's text.
- Guild descriptions published through the administration console retain priority over built-in wording.

### Development and technical changes

- Add `scripts/audit_pandora_os_live_vitals.mjs`, a read-only comparison of all six HP/MP coefficients for 28 class identities against the dated 2026-10-11 fixture, replaying **672** independent class/level/STA/SPR vectors and reporting exact changes.
- Read the current public `classes.json` or an explicitly supplied local copy, never silently falling back to stale data on HTTP failure. Emit normalized SHA-256 hashes and bounded JSON examples, with strict non-zero exit on drift.
- Add deterministic offline tests for drift, invalid data and source integrity plus a required CI step. It does not modify game mechanics or prove equipped character/game-client parity; frozen Legacy 2.00, D1 and saved builds remain unchanged.
- Fix guild skill keyboard tooltips to explicitly refresh from the focused level after arrow navigation, honoring current D1-first text; Playwright asserts focused rows, bidirectional arrows and selection.

## Modern 4.17 — 2026-10-12

### For users

- Internal technical improvements.

### Development and technical changes

- Extend authorized effective-D1 JP/TW missing-translation export with shared and language-only identities per game and UI scope, using the already double-verified IDs. Abort if the same identity has inconsistent kind or catalog ownership.
- Add optional `jpTwComparison` (both / jpOnly / twOnly, counts and byKind grouping) to backward-compatible JSON schema version 1; no additional API reads. Display a D1-first RU/EN/JP/TW comparison summary after successful export.
- Keep the report strictly metadata-only and non-atomic, without draft or text exposure, automatic writes or unauthorized access. Add positive and corruption-fail-closed browser tests.
- Inventory five admin localization scripts for unregistered literal keys and validate all 454+ `adminShell.*` labels across four languages, placeholder parity and safe content. No Legacy 2.00, numerical formulas or authentication changes.

## Modern 4.16 — 2026-10-12

### For users

- Prevent a legacy global `Set` override from interfering with learned and unavailable skill icons after allocating skill points.
- Extend recalculated equipment-and-buff result layout tests to phone, tablet and wide-screen widths in all four locales, including four-digit values.

### Development and technical changes

- Strengthen authorized effective-D1 missing-ID export with a second read of all eight locale/scope groups, including initially empty groups. Detect same-count identity swaps, changed category/ownership and newly missing IDs; never download an incomplete report.
- Reports add `verificationPasses: 2` and `identitiesCompared: true`, explicitly retaining `atomic: false`. All requests remain GET-only, without changing published translations, D1, drafts, CSRF or credentials.
- Add race-condition tests and a 28-combination responsive calculation layout matrix (43 results, equipment, buffs, four-digit numbers). Guard all browser-facing scripts against the shadowed global `Set`. Frozen Legacy 2.00 and numeric game coefficients are unchanged.

## Modern 4.15 — 2026-10-12

### For users

- Internal technical improvements.

### Development and technical changes

- Add an explicit authorized JSON export in the unified translation console listing genuinely missing effective published IDs for all game/ui × RU/EN/JP/TW combinations. This uses current D1 and the published catalog, not old repository-only coverage.
- Paginated GET-only reads validate group totals, pages and unique IDs; abort on observed data drift and never download partial results. The report explicitly declares its non-atomic nature.
- Export IDs, category kinds and catalog ownership markers only—no translations, drafts, credentials, secrets, receipts, D1 writes or automatic publication. Preserve Legacy 2.00, game calculations, auth, and saved-build semantics.
- Add four D1-first RU/EN/JP/TW labels and positive/negative browser tests for downloaded content and incomplete responses.
- Expand the required admin browser suite with catalog localization, draft queue and export checks. Fix an actual frozen Legacy runtime collision with the global `Set`: draft selection, bulk editing and export deduplication now use compatible `Map`/null-prototype dictionaries, without changing inputs or published D1.

## Modern 4.14 — 2026-10-12

### For users

- Complete Russian help texts for **26 character attributes**, preserving the previously approved skill labels.
- Improve Russian build manager messages for automatically updated game data, Soul socket changes and incompatible saved entries.
- Keep the neutral Russian What's New notice for technical-only updates.

### Development and technical changes

- Approve 48 more Russian player-facing UI fallbacks while retaining established curated skill wording without collapsing the distinct frozen approved skill-help snapshot. D1 publications remain authoritative and game formulas remain unchanged.
- Add 14 D1-first RU/EN/JP/TW labels for bulk workflow conflicts, skipped catalog items and unconfirmed D1 receipts, with locale-switch refresh and no extra network request or write.
- Make four-language translation input accessibility and single-language cloud-draft reset hints switch live, retaining draft values, CSRF, optimistic concurrency and receipt-safe publication.
- Add locale-completeness tests, two Playwright failure/skip scenarios and source-only fallback inventory: 726 EN, 707 RU, 725 JP/TW. This is NOT published D1 coverage. Frozen Legacy 2.00 and numerical mechanics are untouched.

## Modern 4.13 — 2026-10-12

### For users

- Hovering over melee or ranged reach now explains that it shows **base weapon reach in raw game units**, not effective reach after skill, equipment or Riding modifiers.
- An unverified reach is clearly marked: an unavailable value does not mean the weapon has zero range.
- Hints support all four languages and accessible screen readers.

### Development and technical changes

- Introduce two D1-first UI keys marking verified base reach versus unavailable reach. Recalculation/locale updates refresh `title` and `aria-description` without rewriting `Status_40/41` or inferring effective range.
- Add browser coverage of the 115-unit verified sword, missing range and all four locales. Legacy 2.00, D1, game formulas, saved builds and mechanic revisions are unchanged.

## Modern 4.12 — 2026-10-12

### For users

- Internal technical improvements.

### Development and technical changes

- Add a 28-class × 6-race combined browser regression covering Astir armor refinement +0/+5/+10, universal Soul 42 and Providence. Verify their known +5 magic resistance, +1 defense and +25 magic resistance deltas, plus all 43 calculated result slots.
- Check repeated recalculation for no stacking and fully restored result rows and serialized build after unequipping and turning off buffs.
- Extend the dated audit with the independent-game-parity limitation. Legacy 2.00, gameplay coefficients, D1 and saved-build revision semantics are unchanged.

## Modern 4.11 — 2026-10-12

### For users

- Internal technical improvements.

### Development and technical changes

- Fix the language of published and reviewed catalog previews: equipment, skill, Soul and skill-profile names/descriptions now follow the selected admin RU/EN/JP/TW language with explicit fallback, rather than defaulting to RU. Switching language changes presentation only; it cannot copy data across catalog fields or publish to D1.
- Add 31 D1-editable EN/RU/JP/TW labels for level, Soul sockets, upgrades, MP and timing, learning requirements, weapon/shield/riding conditions, base weapon attack, unsupported source markers and informational-effect notices.
- Refresh derived locale labels without remounting editable fields or drafts. Composite labels recalculate nested locale-specific text on every language switch.
- Add four-language text-safety/placeholder tests and browser coverage of a published record switching all locales without data writes. Frozen Legacy 2.00, formulas, auth and published D1 data remain unchanged.

## Modern 4.10 — 2026-10-12

### For users

- Internal technical improvements.

### Development and technical changes

- Complete D1-first locale switching for conditional skill variants and catalog previews by adding 14 approved RU/EN/JP/TW keys.
- Localize learning conditions, branch explanations, variant names and counts, MP/timing values, empty editor states and publication review workflow.
- Fix a dynamic-update trap: once a variant is created or changed, switching locales cannot restore stale "no variants" copy or erase the current condition summary. Add regression coverage for preserving entered fields without D1 writes.
- Validate interpolation placeholders and disallow HTML in all approved copy; D1 remains authoritative over fallback. Server APIs, game mechanics, authentication, saved-build revisions and frozen Legacy 2.00 are unchanged.

## Modern 4.09 — 2026-10-12

### For users

- Internal technical improvements.

### Development and technical changes

- Add 35 D1-managed RU/EN/JP/TW localization keys covering live catalog status, draft counters and filters, search labels, catalog types, bulk-editor accessibility names and saved-draft markers.
- Locale switching refreshes display-only nodes without losing search values, selected drafts, editable data or publication-version guards. D1 overrides remain authoritative; actual catalog text and raw server errors are never automatically translated.
- Extend the browser regression matrix across 28 classes and 6 races, 43 calculated slots, Linen Robe and combined Providence/Lapis Medio effects, stable repeated calculations and exact build restoration. Add catalog language-switch and bulk accessible-label regression tests.
- Validate all 35 keys for complete locale coverage, matching interpolation tokens and safe text. Game mechanics remain unchanged; independent current-client gameplay parity is not asserted. Legacy 2.00 and published D1 records are unaffected.

## Modern 4.08 — 2026-10-12

### For users

- Internal technical improvements.

### Development and technical changes

- Offline source localization report now lists the exact stable IDs with missing Japanese (48) or Traditional Chinese (60) historical text out of 2,678 entries.
- Add sorted missing-source ID lists per category, with automated reconciliation of totals, uniqueness and report determinism.
- Document the difference between historical source gaps and effective published D1 translations. No catalog data, drafts, game formulas or Legacy changes.

## Modern 4.07 — 2026-10-12

### For users

- Internal technical improvements.

### Development and technical changes

- Restore the agreed What's New behavior: technical-only deployments show the current version and the neutral "Internal technical improvements." message, not older gameplay changes.
- Restore neutral RU/EN player notices in archived technical-only releases; implementation details remain confined to the separate development section and never enter the popup.
- Verify both locales, current release version, absence of older gameplay details and unchanged builds. Game formulas, Legacy 2.00 and D1 remain untouched.

## Modern 4.06 — 2026-10-12

### For users

- Internal technical improvements.

### Development and technical changes

- Expand browser regression checks for all 43 visible calculated outputs to 15 widths from 320 to 1920 px in RU/EN/JP/TW.
- Cover 620/621, 860/861 and 1365/1366 px transitions: untruncated single-line labels, locale-identical geometry and no label/value collisions.
- WebKit's ten-cycle popup smoke test now separates total scenario time from per-click timeout so slow CI runs remain distinguishable from stuck interactions.
- This is an interface audit, not independent numerical gameplay validation. Legacy, D1, items and saved builds are unchanged.

## Modern 4.05 — 2026-10-12

### For users

- What's New now displays the most recent actual player-facing changes, even after admin-only releases.
- The installed version stays current; technical notes remain in the full history, separate from player updates.

### Development and technical changes

- Remove synthesized player notes for admin-only releases; choose the latest genuine release-notes:user entry.
- Technical-only releases now have only technical sections in localized archives. Add Python and Playwright audience regression tests.
- Gameplay formulas, Legacy, D1 and drafts unchanged.

## Modern 4.04 — 2026-10-12

### For users

- Skill Adeptness and Potential headings now stay on one line at 861–1365px desktop widths.
- RU/EN/JP/TW use identical heading geometry without making Character wider or squeezing the Skills panel.

### Development and technical changes

- Added 861/1024/1200/1365px × RU/EN/JP/TW browser checks for one-line headings, equal geometry, no text collision and 4-digit result displays.
- Browser test modifies only temporary DOM copy, not formulas, published D1, saved builds or Legacy.

## Modern 4.03 — 2026-10-12

### For users

- Internal technical improvements.

### Development and technical changes

- Add per-category effective translation coverage to the authenticated D1 report in RU/EN/JP/TW: skills, equipment, souls, classes, races, stats and other.
- Derive counts from the same published rows as the existing summary, honoring D1 overrides and reset tombstones; no additional queries or writes.
- Add collapsible category breakdowns and drill-down into missing records, with responsive layout and API/browser regressions.

## Modern 4.02 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Make 17 additional bulk translation preview counters, validation states, prompts and confirmation messages D1-editable in RU/EN/JP/TW.
- Locale updates change only display text and example placeholder, preserving typed values, selections, manual edits, optimistic concurrency and atomic publication.
- Keep uncertain transaction outcomes and raw server errors unchanged to avoid unsafe retry messaging.

## Modern 4.01 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Localize 18 catalog editor feedback messages in RU/EN/JP/TW through existing D1-first admin copy, covering review, draft, successful publication and rollback feedback.
- Language changes refresh only the current status leaf, never resubmitting catalog operations or changing draft values, revisions or calculations.
- Leave unconfirmed batch publication outcomes and raw server errors unchanged to preserve safety-critical behavior.

## Modern 4.00 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Add 28-class × 6-race all-43-result Modern regression matrix checking missing/invalid output and repeatable recalculation.
- Exercise armor and magic resistance effects and their exact reversibility in six representative classes; leave legacy formulas, published D1 catalog and saved builds untouched.
- This is runtime regression coverage, not a claim of validated current-game numerical parity.

## Modern 3.99 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Add on-demand, eight-request read-only effective RU/EN/JP/TW coverage audit for authenticated admin translation center, including published D1 overrides and catalog records.
- The UI explains that the results are sequential observations, not an atomic snapshot, and allows drilling into missing entries by locale and scope.
- Never write D1, modify unsaved drafts, touch game formulas or alter Legacy; add focused browser and static regressions.

## Modern 3.98 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Translate seven safety-critical catalog confirmation dialogs into RU/EN/JP/TW using D1-first keys: unsaved edits, variant deletion, publication, Astir cleanup and revision rollback.
- Keep action guards unchanged; safely interpolate names and counts, falling back to approved wording for invalid placeholders.
- Remove stale fixed key-count guidance from localization docs. No changes to catalog records, calculations or Legacy.

## Modern 3.97 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Make 36 additional translation-center messages D1-editable in RU/EN/JP/TW: dynamic counts, comparison, publication, draft feedback, catalog provenance and errors.
- Locale changes refresh only leaf text nodes without replacing inputs or unsaved drafts; variable values are safely inserted as plain text.
- Add four-language fallback and browser regressions. No changes to game formulas, D1 records or Legacy.

## Modern 3.96 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Add reproducible, read-only baseline coverage inventory for RU/EN/JP/TW UI and historical game identities.
- Distinguish static source gaps from effective D1 publications; the report never overwrites or claims to enumerate live catalog translations.

## Modern 3.95 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Register 21 D1-editable, four-language UI captions for translation-center record kinds, provenance badges, original/effective text headings, comparison and catalog editing.
- Display-only localization preserves IDs, record values, unsaved drafts, published revisions and calculation formulas. Remove outdated spreadsheet guidance from the public roadmap.

## Modern 3.94 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Register 30 new catalog form captions for skills, classes, racial abilities, equipment and Souls through the existing four-language D1 registry; reuse the existing extra-language caption.
- Update label/legend child spans only, preserving form elements, unsaved data and drafts. D1 remains authoritative. Game formulas and Legacy are unchanged.

## Modern 3.93 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- 47 explicitly whitelisted static catalog editor headings and help messages now use the editable RU/EN/JP/TW D1 translation registry.
- Scope is presentation-only; never translate record names, typed values, formula data, versions, auth/CSRF tokens, drafts or catalog writes.
- Provide four-language fallbacks and source-coverage checks. Existing D1 publications retain priority.

## Modern 3.92 — 2026-10-11

### For users

- Add 94 Japanese and Traditional Chinese UI translations covering skill learning, build migration, safety messages, changelog controls and other interface areas.
- Replace obsolete workbook and Legacy-only descriptions with accurate current admin, catalog and calculator guidance.

### Development and technical changes

- Provide JP/TW static fallback coverage for 442/443 common UI entries, reserving test.englishOnly for intentional English-fallback testing. Verify placeholder parity.
- Correct three outdated English/Russian source descriptions; any newer published D1 strings remain authoritative.
- No gameplay formula, equipment stat, calculator geometry, persisted build or Legacy behavior changes. Admin-only and catalog-managed text coverage remain separately tracked.

## Modern 3.91 — 2026-10-11

### For users

- Add 63 Japanese and Traditional Chinese translations for Build Comparison, calculated-stat tooltips and character attribute inputs.

### Development and technical changes

- Baseline-only text additions: published D1 overrides retain priority, with no changes to character stats, formulas or saves.

## Modern 3.90 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- 26 catalog-editor action buttons now use RU/EN/JP/TW D1-managed captions: drafting, review, publishing, variants, rules, navigation and history. Item names and form input remain untouched.
- Translate exact authored button captions only; preserve draft state, D1 versions, CSRF and editor context on locale changes. No gameplay or Legacy modifications.

## Modern 3.89 — 2026-10-11

### For users

- Add 58 Japanese and Traditional Chinese translations for Build Manager: save/load, import/export, sharing, error and recovery messages.

### Development and technical changes

- These are baseline localization values only; existing D1 overrides keep priority. No changes to calculations, persisted builds, import/export mechanics, equipment or Legacy.
- Fix Cloudflare Admin API path filters so baseline translation sources (`ui.en`, approved and curated fallbacks) trigger a Worker redeploy; avoid mismatched admin D1 fallback indexes versus the published site.

## Modern 3.88 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Localize 28 editable D1-backed RU/EN/JP/TW captions and dynamic messages in the four-language admin card: draft states, validation, actions, errors, publication receipts and placeholders.
- Switching admin locale refreshes a mounted card's captions without resetting unsaved translations, D1 versions, drafts or optimistic-concurrency safeguards.
- Leave authentication, catalog writes, game mechanics and Legacy unchanged.

## Modern 3.87 — 2026-10-11

### For users

- Mounted mode now explains why the retained calculator shows DEF as `---`. Dismount to display numeric defense again, without losing equipped items or bonuses.

### Development and technical changes

- Add one D1-editable RU/EN/JP/TW status note for the retained engine's intentionally unavailable mounted DEF field; preserve all source calculations and builds.
- Add strict numeric-output and repeated-buff regression coverage for 11 defense/resistance scalar results, including reversible mount state.

## Modern 3.86 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Localize 34 D1-editable RU/EN/JP/TW draft-queue and history captions: search, filters, selection, deletion, publication receipts, revision history and restoration.
- Update visible labels and interpolated counts in place on language change, retaining filters, focused search text, selected drafts and all optimistic publication safeguards.
- Preserve login, CSRF, permissions, D1 history, batch atomicity, Legacy and game calculations. The dynamic catalog editor remains a separate localization task.

## Modern 3.85 — 2026-10-11

### For users

- Translate 54 frequently used character-builder UI labels into Japanese and Traditional Chinese, covering language controls, panels, equipment/Soul search and mobile navigation.
- These language changes do not affect equipment statistics, calculations or saved builds.

### Development and technical changes

- Add 54 reviewed JP/TW static UI baselines to the existing D1-override-aware registry, keeping source placeholders intact and without adding a second data source.
- Verify both locale catalogs in browser tests and that switching languages does not mutate builds. Other untranslated UI labels remain to be reviewed.
- This does not modify Legacy mechanics or calculation formulas.

## Modern 3.84 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Make 16 bulk-replacement labels D1-editable and translated in RU/EN/JP/TW: header, guidance, inputs, preview, selection, edit and publish actions.
- Switching interface languages updates visible controls without clearing the search, replacement, selected rows or unsaved editor contents.
- Preserve protected D1 publication, CSRF, login, game catalog, calculations and Legacy. Dynamic bulk status messages, drafts queue and catalog editor remain separate work.

## Modern 3.83 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Register 30 additional D1-editable admin console labels for RU/EN/JP/TW: headings, explanations, filters, groups, search controls and pagination.
- Update translated DOM controls in place, retaining search queries, unsaved editor text, selected filters and existing authentication/publishing contracts.
- Reuse the existing public read-only admin-localization projection and guarded D1 precedence; create no new data source.
- Dynamic catalog, bulk editor and draft-queue messages remain for a separate review.
- No game formulas, numerical data or Legacy changes.

## Modern 3.82 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Add a RU/EN/JP/TW language selector for secure admin login, session state, navigation and help copy. Register 31 independently editable D1 UI keys, preserving versioned override/reset precedence.
- Keep the read-only shell locale endpoint restricted to published UI strings; never expose authentication tokens or drafts. An unavailable translation API leaves the original English login functional.
- Preserve CSRF, HttpOnly cookie validation, game formulas, equipment and Legacy. Add API/browser regression tests for all locales and offline fallback. The remaining dynamic catalog/editor chrome needs further review.

## Modern 3.81 — 2026-10-11

### For users

- Melee and ranged results now display the equipped weapon's verified base reach instead of a permanent dash.
- Values are verified for 164 weapons in original game-reference units (no unverified meter conversion).
- Unarmed or unsupported weapons remain unavailable; unverified skill-based range changes are not silently applied.

### Development and technical changes

- Freeze a read-only 164-weapon current-server source map with unambiguous Russian names; runtime validates immutable Japanese engineKey and melee/ranged type before displaying the raw `range` field.
- Fail closed for unknown or modified identities; do not fabricate conversion units or blend unverified Legacy reach modifiers.
- Add offline source-map and Playwright test coverage; leave Legacy formulas, catalog mechanics and saved builds unchanged.

## Modern 3.80 — 2026-10-11

### For users

- Providence now applies its documented +25 Magic Resistance bonus in the Modern calculator, without accumulating it on repeated recalculation.
- Add regression coverage for real armor DEF and Magic Resistance effects, Lapis Medio and the source engine's mounted-defense display.

### Development and technical changes

- Preserve the original Legacy engine. Modern applies verified historical Providence +25 via its non-accumulating `Calc('RESMagic')` wrapper, without changing saved builds.
- Contract tests use native Linen Robe equipment with `49=8_145=3` to verify DEF and magic resistance changes, buff stacking, reset and mount-mode display.
- Parity with the current game remains an independent open audit; do not extrapolate this historical Providence coefficient to unverified gameplay.

## Modern 3.79 — 2026-10-11

### For users

- Dresses that occupy both chest and pants now clearly show why the pants and Soul slots are unavailable.
- A dedicated Unequip dress button frees the slot without resetting other equipment; ordinary robes remain single-slot equipment.

### Development and technical changes

- Identify exactly nine verified double-slot dress identities by their canonical Japanese source names, matching preserved EquipCheck; no translated-name heuristics or duplicate stat bonuses.
- Guard Modern equipment and Soul choices for the occupied pants slot, while keeping the native engine and persisted builds unchanged.
- Register an editable four-locale D1 message and regression tests for equip/unequip, ordinary robes and responsive UI.

## Modern 3.78 — 2026-10-11

### For users

- Restore the five approved compact resistance captions and all 13 approved Russian Honor names and tooltips, including when the localization API is temporarily unavailable.
- Prevent three-digit character totals from overlapping the point-cost badge.

### Development and technical changes

- Keep D1 publications authoritative, bundle the 26 approved Honor strings as offline-safe fallback and prefer five explicitly approved resistance names over stale catalog copy only when D1 is unavailable.
- Migrate the exact old lightning wording through a versioned, draft-safe D1 update, without touching mechanics or Legacy.
- Verify localization precedence, recovery, SQL history and three-digit stat geometry.

## Modern 3.77 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Show RU/EN/JP/TW translation fields together in each admin card. Search spans all four locales; the language filter controls translation status and coverage, not which languages can be edited.
- Publish multiple changed locales for one identity in a single atomic, optimistic-concurrency-checked D1 batch; retain per-locale publication, drafts, reset and history.
- Preserve catalog ownership for new equipment, Souls and skills, without a competing localization write path. No game formulas, stats or Legacy calculations were modified.
- Add tests for four-locale API views, isolated versioned changes, reset semantics and UI editing.

## Modern 3.76 — 2026-10-11

### For users

- Fixed a typo in the level 1 tooltip for the Combat guild skill. Other descriptions and character stats are unchanged.

### Development and technical changes

- Correct one approved Russian tooltip fallback; update only the exact previously published typo in D1 while preserving custom translations, drafts, revision history and all mechanics.
- Add migration idempotency and editor-safety regression coverage.

## Modern 3.75 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Audit visible Modern UI strings and introduce automatic registered-key and hard-coded-text detection.
- Move build-manager copy from embedded JavaScript dictionaries into the unified localization registry, preserving established RU/EN/JP/TW text and protecting existing D1 edits/drafts.
- Register additional UI captions and secure admin-entry strings as editable localization keys.
- Run browser and calculation regression checks without modifying Legacy, item mechanics, formulas, or catalog rules. Independent live-game validation remains a separate task.
- Reclassify Modern 3.74 administration notes as development-only, preventing technical internals from appearing as player-facing changes.

## Modern 3.74 — 2026-10-11

### For users

- Internal technical improvements.

### Development and technical changes

- Remove browser-side transformations of published translations; add lazy four-locale comparison endpoint, guarded D1 migration protecting custom edits and drafts, and regression tests for precedence, reset and history. Keep calculations, catalog ownership and Legacy unchanged.

## Modern 3.73 — 2026-10-11

### For users

- Guild skill dropdowns now show compact hover/focus tooltips next to the selected option rather than a full-width preview panel.
- Guild/Honor rows and dropdown chevrons are aligned, resistance names remain compact without wrapping, and passive descriptions no longer have redundant prefixes.
- Standard Modern hover titles now use a site-styled tooltip rather than the browser default.

### Development and technical changes

- Modern-only presentation and approved guild description baseline update; preserve D1 override precedence, original selects, calculations, saves and Legacy. Add checks for compact hover/focus help, old published full-length resistance names, keyboard and mobile layout.

## Modern 3.72 — 2026-10-11

### For users

- All 11 guild enhancements now show level-specific Russian and English descriptions when browsing their dropdown options by mouse or keyboard, before applying the chosen level.

### Development and technical changes

- Register 44 approved EN/RU descriptions in the unified translation editor, respecting existing published D1 precedence. Keep source selects and handlers, calculations, saved builds and Legacy untouched, with keyboard/mobile regression tests.

## Modern 3.71 — 2026-10-10

### For users

- Enhancement and Honor rank names now sit centered in their buttons, both vertically and horizontally.

### Development and technical changes

- Override legacy fixed label height and top padding, with RU/EN and mobile/desktop browser regression coverage. Leave calculations, translations, Admin and Legacy unchanged.

## Modern 3.70 — 2026-10-10

### For users

- All 13 Honor skills in Enhancements now have approved Russian names and Russian hover descriptions.

### Development and technical changes

- Publish 26 scoped texts through conflict-guarded D1 localization; expose Honor terms in the Admin Skills category. Keep English, Legacy calculations and unrelated translations unchanged.

## Modern 3.69 — 2026-10-10

### For users

- Fixed enhancement bonuses and upgrade thresholds for original and white Astir coats, dresses and trousers.

### Development and technical changes

- Audit 56 unique Astir items with no duplicate catalog entries or basic-stat drift; correct six outdated native per-item refinement paths.
- Keep Legacy, catalog revisions and base item IDs untouched; guard Modern replacements against double application.

## Modern 3.68 — 2026-10-10

### For users

- Internal technical improvements.

### Development and technical changes

- Reuse verified exact-head pull request CI, including its required aggregate job, for Pages publication instead of rerunning the entire browser matrix after merge, even for build and CI/CD infrastructure edits.
- Retain the full fail-closed production validation path for unverified/direct changes; a successful workflow banner alone is not enough.
- Scope CSS/image-only PR validation to visual and Chromium/Firefox/WebKit checks, removing unrelated gameplay, data and build-code suites.

## Modern 3.67 — 2026-10-10

### For users

- Internal technical improvements.

### Development and technical changes

- Add admin preview and explicit confirmation for archived Astir outfit notes across 16 stable item IDs and four locales. Unknown text and unpublished drafts block publication.
- Cleanup creates an immutable D1 revision without changing mechanics or impactRevision. Scoped restoration restores only matching archived notes without rolling back unrelated item edits.
- Share one verified Modern Astir rules registry across the admin backend, generated site and build exclusions; retained Legacy remains unchanged.
- Show admin-only releases in What's New under the current version with a neutral public summary; detailed changes remain in development notes.
- Increase the Pages full-validation time budget to prevent the last successful browser checks from being cancelled before publication.

## Modern 3.66 — 2026-10-10

### For users

- Internal technical improvements.

### Development and technical changes

- Narrow archived Astir outfit-note detection so ordinary Chinese words for equipment and equipping no longer hide valid new descriptions.
- Preserve suppression of all 16 obsolete outfit notes and add a regression for a valid replacement note.

## Modern 3.65 — 2026-10-10

### For users

- Improved line breaks in English equipment descriptions: base stats, refinement conditions and bonuses now display on separate, readable lines.

### Development and technical changes

- Extend presentation-only English text boundaries for refinement milestones and adjacent effects without editing canonical catalog strings, D1 data, item identities or calculation rules.
- Cover representative Astir items and enforce content preservation and idempotent formatting.

## Modern 3.64 — 2026-10-10

### For users

- Internal technical improvements.

### Development and technical changes

- Scope obsolete full-outfit Astir note filtering to the 16 affected item IDs, independently for each locale.
- Preserve new valid admin-authored translations even while an older language still contains historical set notes.
- Restore visibility of genuine unrelated equipment-set notes (including the Golden Cuirass); calculations and D1 records remain unchanged.
- Add comprehensive per-locale and revision-update regression coverage.

## Modern 3.63 — 2026-10-10

### For users

- Astir equipment no longer gains obsolete full-outfit set bonuses. Only each piece's own attributes and refinement effects apply.
- Outdated full-set bonus notes are hidden from Astir item descriptions across site languages.
- Removed the redundant Legacy 2.00 footer from all equipment, weapon, accessory and Soul detail previews.

### Development and technical changes

- Modern packaging excludes the 16 outdated Astir outfit conditions while keeping the archived Legacy engine byte-identical and retaining unrelated set/refinement rules.
- Hide stale localized Astir set notes at presentation time without deleting published D1 data. Add precise per-piece vs complete-outfit tests and tooltip regressions.

## Modern 3.62 — 2026-10-10

### For users

- Fixed gear refinement bonuses, including Astir sets: bonuses earned at +2, +4 and other milestones now remain active at intermediate refinement levels.
- Recalculating the build preserves the latest reached milestone without double-counting effects.

### Development and technical changes

- Treat server Forth milestone rows as complete active snapshots and retain the nearest reached snapshot when an intermediate enhancement level has no row; explicit empty snapshots still clear previous bonuses.
- Keep the D1 catalog, Legacy formulas and item identities untouched. Cover all +0…+10 levels across multiple Astir items, including idempotent recalculation.

## Modern 3.61 — 2026-10-09

### For users

- Item descriptions now separate sentences, stats and enhancement conditions into readable lines without changing numerical values or canonical item names.
- Hover cards for equipment, weapons, jewelry and Souls have an in-game-inspired dark layout with legible metadata and distinguishable empty/filled Soul sockets.
- Mouse, keyboard and mobile previews retain their existing behavior.

### Development and technical changes

- Add a non-publishing live multilingual catalog tooltip preview for items and Soul slots; preserve separate server validation for numeric effects.
- Pin Astir source equipment IDs, native refinement milestone behavior and torso-plus-legs Astir Dress handling in UI regressions.
- Keep canonical calculation data and original game item names unchanged.

## Modern 3.60 — 2026-10-09

### For users

- Share Build now creates genuinely short links with a 12-character code instead of embedding the entire build in the URL.
- The recipient can open the build in a fresh browser; legacy links remain supported. If the short-link service is offline, sharing provides a working longer fallback link with an explicit warning.

### Development and technical changes

- Add isolated D1-backed SHA-256-deduplicated short-code storage with explicit collision, content size, origin and anonymous rate-limit checks.
- No admin credentials, catalog revision or build representation is changed. Backend and browser regression tests cover the API and backward compatibility.

## Modern 3.59 — 2026-10-09

### For users

- Internal technical improvements.

### Development and technical changes

- Technical-only releases now show a neutral localized summary in What's New without disclosing administrative implementation details.
- Preserve the last actual user-facing release version separately and cover both locales in the regression test.

## Modern 3.58 — 2026-10-09

### Development and technical changes

- Project published catalog item/skill text into the unified admin search without exposing unpublished drafts.
- Catalog-managed entries are read-only in localization and excluded from independent bulk translation writes; the catalog remains the only writer.
- Guarded in-page navigation preserves unsaved form changes; publishing refreshes the search index. No D1 migration, calculation changes or ID rewrites.
- Server and browser regression checks cover the single-writer boundary.

## Modern 3.57 — 2026-10-09

### For users

- What's New now says “Latest changes for users” instead of the narrower “player update”.
- Russian and English release histories use consistent “For users” and “Development and technical changes” sections.
- Historical releases remain available with separate user-facing and technical change records.

### Development and technical changes

- Require `release-notes:user:ru/en` for new releases, while keeping historical player-tagged notes readable.
- Reject incomplete localized user releases and obsolete markers for new versions during builds.
- Audited legacy draft PR #123; its outdated base must not be merged over newer implementations without isolating remaining work.

## Modern 3.56 — 2026-10-09

### For users

- The full release history now has separate Russian and English editions, with player changes and technical updates clearly labeled.
- What's New shows the latest player-facing release independently of the overall UI version and links to the matching language.
- The Report a Problem link now opens the current GitHub issue form.

### Development and technical changes

- Skill creation from an existing active/passive template is accessible from the catalog toolbar; new classes and racial slots remain unsupported.
- Added four-language field coverage hints, direct admin section navigation, and Ctrl+S draft saving.
- RU/EN release archives are derived deterministically from one canonical CHANGELOG.md and checked in regression tests.

## Modern 3.55 — 2026-10-09

### Development and technical changes

- Filter D1 translation lookups by selected locale/scope and catalog draft lookups by kind.
- Add searchable and keyboard-stable draft queues for translations and catalog entries.
- Make catalog batch publication recoverable by durable operation receipts after network timeouts.

## Modern 3.54 — 2026-10-09

### For users

- Custom numeric equipment enhancement bonuses now contribute to character calculations at configured refinement milestones, such as every +2 levels.
- Existing equipment mechanics remain intact; the new bonuses do not claim to simulate unimplemented combat procs.

### Development and technical changes

- Exposes the existing stable numeric engine ID for all items and supports numeric search.
- Supports guarded per-item numeric refinement rules; catalog impact revision changes only when calculations change.

## Modern 3.53 — 2026-10-09

### Development and technical changes

- Persisted four-language translation drafts, per-entry history and safe recovery of prior wording.
- Atomic multi-row translation publishing with conflict guards, receipts and uncertain-network reconciliation.
- Compact localization progress and consolidated public translation reads; simulator calculations remain unchanged.

## Modern 3.52 — 2026-10-09

### Development and technical changes

- Separated public player update notes from private administration releases while retaining a deployment-aligned UI version.
- Removed private administrator operating guides from the public repository.

## Modern 3.51 — 2026-10-09

### Development and technical changes

- Removed duplicate legacy translation editors from the admin UI. Approved calculator captions and interface strings remain accessible in the unified four-language localization console.
- The catalog now provides a cross-category saved-draft queue, counts and highlighting, open-item navigation and guarded one-revision publication of up to 50 selected drafts.
- Historical published translations and compatibility APIs are retained; existing game mechanics, build impact rules and earlier revisions remain intact.

## Modern 3.50 — 2026-10-09

### Development and technical changes

- Fixed the admin translation editor restoring stale drafts after resetting published entries. Reset now immediately shows the persisted baseline and clear feedback, including after the next edit or page reload.
- Added consecutive equipment-reset and conflict-safety regression tests. English source strings, game mechanics, and saved builds remain unchanged.

## Modern 3.49 — 2026-10-09

### Development and technical changes

- Bulk translation preview now supports a small inline pencil editor for reviewing and correcting individual proposed strings before publishing.
- Added revert-to-suggestion, select-all/none and a manual-edit counter. Approved writes retain the existing version and effective-text conflict guards.

## Modern 3.48 — 2026-10-09

### Development and technical changes

- Added carefully reviewed whole-word mass localization in the protected admin panel, with complete paginated search, dry-run diff, row selection and conflict checks.
- Existing translations, language sources, catalog mechanics and Legacy calculations are preserved.

## Modern 3.47 — 2026-10-09

### For users

- Fixed Soul description field ordering so editing one text no longer replaces unrelated text fields.

### Development and technical changes

- Added translation coverage markers, filters and previously approved labels to the admin editor.

## Modern 3.46 — 2026-10-09

### Development and technical changes

- Retired the legacy XLSX file and editing scripts in favor of the approved 2,920-entry JSON snapshot and protected four-language admin revisions.
- Preserved the final spreadsheet in repository Git history for disaster recovery; it is no longer shipped or required for builds.
- Replaced spreadsheet mutation tests with stable ID, placeholder and language coverage checks; calculator mechanics are unchanged.

## Modern 3.45 — 2026-10-09

### For users

- Introduced one four-locale translation editor for game and UI text, with legacy approved wording visible and safe versioned updates.
- Localized Russian learned-skill tooltip labels and mastery prerequisites, and restored line breaks in glued equipment effects.
- Preserved existing approved translations and made them available in the new editor without affecting game mechanics.

## Modern 3.44 — 2026-10-09

### For users

- Synchronized seven approved Russian translations directly into the Excel workbook.
- Preserved unsaved Modern UI translation drafts across search, locale and pagination changes with clear dirty-state indicators.
- Kept text visible after conflicts or network failures, with explicit discard/reload controls; improved calculated-label draft status.

## Modern 3.43 — 2026-10-09

### For users

- Stabilized the three Enhancement parameter/input positions across all four languages and made popup layout responsive to actual panel width.
- Fixed Honor selection highlighting: none selected by default, one at a time, and click again to clear.
- Clarified Russian resistance labels and removed misleading Legacy strikethroughs from selectable Modern enhancements without changing damage formulas.
- Added a searchable, version-safe RU/EN editor for 242 Modern UI texts, with conflict detection and reset to workbook. The 43 calculated-stat captions editor remains separate.

## Modern 3.42 — 2026-10-09

### For users

- Fit full Blessing and Hymn labels on one line with smaller numeric fields and a compact Russian spirit caption.
- Localized guild bonus names and level choices for Russian.
- Restored guild physical and magical incoming-damage reduction at 3% and 6%, respectively, in the Modern calculator.
- Preserved source Legacy behavior and other-language build compatibility.

## Modern 3.41 — 2026-10-09

### For users

- Completed the Russian skills allocation help text.
- Localized Enhancement parameter labels, skill names and hover descriptions in Russian.
- Kept language switching, calculations and existing builds unchanged.

## Modern 3.40 — 2026-10-08

### For users

- Restored the readable Effects tab spacing and original panel width across all languages.
- Kept the balanced Character/Skills layout and complete result labels unchanged.

## Modern 3.39 — 2026-10-08

### For users

- Reduced empty space between calculated result names and values.
- Allocated more room to skill headings so learned and potential captions stay on one line.
- Identical panel geometry across languages; result captions remain complete.

## Modern 3.38 — 2026-10-08

### For users

- Calculated result names are shown in full on a single line, without ellipses.
- The workbench provides enough room for result labels while keeping skill inputs readable.
- All languages use the same responsive panel layout.

## Modern 3.37 — 2026-10-08

### For users

- Russian calculated-result names now match the project's approved translations.
- Long captions stay on one line without resizing the result grid, with full names preserved for accessibility.
- The admin console can edit result labels and restore their original workbook values.

## Modern 3.36 — 2026-10-08

### For users

- Clearer Russian result labels distinguish closely related stats.
- Result columns retain consistent tracks across languages; longer labels wrap without shrinking the skills panel.
- Out-of-range attribute and skill edits now clamp to their allowed bounds.
- Fixed unavailable mounted attack-speed display and regeneration effect bonuses.

## Modern 3.35 — 2026-10-08

### For users

- Skill and potion effect buttons now share readable, consistent text sizing across languages.
- Both buttons retain their existing compact dimensions.

## Modern 3.34 — 2026-10-08

### For users

- Riding toggle matches the adjacent stat field on wider screens in every language; larger mobile touch targets remain.

## Modern 3.33 — 2026-10-08

### For users

- Shorter Russian labels fit on one line when the available width allows.
- Calculator actions use evenly sized columns and consistent button dimensions across languages.

## Modern 3.32 — 2026-10-08

### For users

- Calculator action buttons now use consistent size, placement and typography across every language.
- The original compact 3×2 layout remains stable with longer translated labels.

## Modern 3.31 — 2026-10-08

### For users

- Rebalanced the Russian calculator action buttons for a compact but readable size, avoiding both oversized controls and tiny text.

## Modern 3.30 — 2026-10-08

### For users

- Restored locale-consistent compact sizing for Russian calculator action buttons while keeping the translated labels readable.

## Modern 3.29 — 2026-10-08

### For users

- Polished the Russian calculator action area into an even 3×2 grid with equal button heights and balanced columns.

## Modern 3.28 — 2026-10-07

### For users

- Added the requested Russian labels for calculator action, reset and riding controls without changing their mechanics.

## Modern 3.27 — 2026-10-07

### For users

- Clarified the Russian skill-column labels while keeping the underlying skill mechanics unchanged.
- Renamed the Russian effect tabs and adjusted their compact layout so both labels remain on one line.

## Modern 3.26 — 2026-10-07

### For users

- Modern now detects a newly published release automatically. After a short idle moment it commits the active field, flushes the current build and reloads fresh versioned assets; manual cache/cookie cleanup or Ctrl+F5 should not normally be necessary.
- The Character-level Potential budget row is hidden because the supported level range never awards those separate points and it always displayed 0/0. Skill-branch Potential remains available and unchanged.
- Decorative-only items are removed from Modern equipment and calculations. If an old build selected one, normal build migration clears that unavailable item without changing unrelated choices.
- Remaining unused install/offline assets were removed; Legacy Mode is unchanged.

## Modern 3.25 — 2026-10-07

### For users

- Saved Modern builds now use current game data. Renamed items stay selected; unavailable or incompatible items, Souls and skills are removed individually. A compact report explains removals and stat changes.
- Removed outdated badges and visible backup builds. Autosave also saves the last changes when leaving the page.
- Build links are much shorter; existing links remain readable.
- Restored ascending equipment-level sorting and description line breaks, reconciled the confirmed cosmetic Golden Mantle duplicate while preserving old choices, and clarified Russian character labels and Soul slots.
- Removed app installation and offline mode. Previously installed versions safely finish updating while preserving saved builds. Legacy remains unchanged.

## Modern 3.24 — 2026-10-07

### For users

- Fixed item effects that depend on enhancement level: calculations now include both base bonuses and stat changes at specific enhancement thresholds.
- Audited all **148 items with enhancement mechanics** and **1,136 enhancement-level effects**. Missing calculations were added for 118 items, while 30 existing Legacy implementations remain single-counted.
- Fixed the War Crossbow family: **War Crossbow D/A** now gain the attack-speed steps (+2/+4/+6/+8/+10) and the +7 AGI bonus; **War Crossbow S** gains its +2 AGI threshold at +7.
- Added the current set-bonus mechanics (3 sets), including combinations that contain Modern-only item identities.
- Separately verified the two Souls whose effects depend on the host item's enhancement: **Soul of the Parade** (+25 weakness resistance at +8) and **Soul of the Mirror** (reflection 3% → 5% at +8) were already handled correctly by retained Legacy logic, so Modern does not duplicate them.
- Restored calculable base effects that were previously omitted: Bullseye Cap accuracy, Novice's Cloak EXP/town movement speed, Priest's Earring aura damage, and the six new race-damage reduction Souls.
- Historical catalog revisions below 85 are unchanged; these mechanics are enabled only for updated revisions 85+.

## Modern 3.23 — 2026-10-07

### For users

- Fixed automatic game-data adoption for an existing current autosave: an open build should no longer remain silently pinned to an old catalog solely because Soul slot rules changed.
- When a newer catalog reduces Soul slots or makes an equipped Soul incompatible with its slot, Modern **first stores a separate backup of the old build**, then clears only the conflicting Souls and moves the current autosave to the latest catalog.
- More destructive conflicts — a missing equipped item or new race/class incompatibility — are still never guessed away: automatic adoption stops, keeps the build unchanged and shows an explicit warning.
- If the backup, recalculation or autosave write fails, the current build is left/restored unchanged instead of persisting a partial migration.
- Regression coverage now includes stale autosaves with reduced Soul slots, backup-write failure and hard equipment incompatibility.

## Modern 3.22 — 2026-10-07

### For users

- Astir equipment in Modern now uses current **RU/EN names and descriptions** on retained simulator identities wherever the match is verified.
- Older Astian/Asutian entries with outdated or distorted English names are reconciled instead of being shown alongside duplicate Modern records.
- The complete Modern catalog still covers **599 records**: 488 equipment/weapon/accessory records and 111 Souls, including unavailable and future-ready entries.
- Legacy remains unchanged, and historical catalog revision 84 is preserved for pinned saved builds.
- Newly added Souls no longer invent an equipment-name prefix from the full Soul name; when no verified prefix exists, it stays empty.

## Modern 3.21 — 2026-10-07

### For users

- The Modern equippable-item and Soul catalog is now fully refreshed: **599 records** — 488 equipment/weapon/accessory records and 111 Souls.
- 368 existing simulator identities are updated in place, while 231 previously missing records receive separate stable Modern identities. The Legacy catalog and existing save-code identities remain unchanged.
- Previously missing equipment variants are now included, including the complete Astir equipment set with EN/RU names and descriptions.
- Records that are currently unavailable or belong to decorative/future content are also retained in Modern instead of being discarded solely because of availability status.
- EN/RU names/descriptions, levels, Soul slots, W/AC and supported mechanics are refreshed. Conditional or unsupported mechanics are not guessed into calculation fields and remain descriptive until the engine has a dedicated representation.
- Legacy untranslated English names wrapped only in unnecessary outer parentheses are normalized in the Admin baseline and in the Modern presentation layer; preserved Legacy arrays remain unchanged.
- PEN, Range, base Attack Speed and Block are not guessed into unrelated simulator fields because the current item model has no dedicated calculated fields for them.

## Modern 3.20 — 2026-10-06

### For users

- Synchronized **180 existing simulator records**: 111 weapons/equipment items and 69 Souls.
- Updated Russian and English names/descriptions for the matched records.
- Corrected mechanics that the current simulator actually represents, including 103 Soul-socket counts, Heavy Crossbow level/W, Bounty Lance STR, selected wand/staff Magic ATK, Iron Staff stun chance, and Soul of Cerberus Dodge.
- Mechanical changes are released as game-data revision 79, preserving revision 78 as a real historical snapshot for saved builds.
- Healer Soul was not created because no unambiguous existing Soul with the same effect was found.
- PEN, Range, base Attack Speed and Block were not mapped onto unrelated stats because the current item engine has no dedicated per-item fields for them.

## Modern 3.19 — 2026-10-06

### For users

- Removed the manual “Update current build” control because catalog updates are automatic.
- The Builds manager now uses a player-friendly automatic game-data status and a plain-language hint instead of internal catalog/revision terminology.
- Catalog publication revision and build-impact revision are tracked separately, so names, descriptions and translations update normally without falsely marking saved builds stale.
- The stale warning is reserved for changes that can affect calculations or compatibility.

## Modern 3.18 — 2026-10-06

### For users

- Open pages now check automatically for new app versions and published catalog revisions; normal use no longer depends on manually reloading or pressing “Update current build”.
- Current progress is flushed before automatic PWA activation. If saving fails, the update is not activated.
- Every open tab saves its own state before a service-worker controller reload.
- Published admin changes to equipment, Souls, classes, racial data and skills are adopted automatically by the active character.
- Named builds pinned to an older catalog are highlighted as possibly outdated and are safely upgraded when loaded; incompatible builds retain their historical revision.
- Saved-build comparison uses the current published catalog online and cached pinned revisions offline.

## Modern 3.17 — 2026-10-06

### For users

- The Equipment reset caption is now centered without changing its size or behavior.
- PWA updates now keep HTML and static assets on one cache generation until the new service worker is activated.
- Service workers read only from their own versioned cache, preventing active/waiting cache cross-contamination.
- New precaches revalidate assets past the browser HTTP cache, and worker-only logic changes now rotate the cache generation too.
- A stalled worker activation re-enables Reload so the user can retry safely.

## Modern 3.16 — 2026-10-06

### For users

- Equipment reset now has a safe locale fallback and can no longer expose the raw `equipment.reset` key during a mixed PWA-cache update.
- Desktop/tablet Equipment slot-label width is tightened from 80px to 76px while keeping long RU labels visible.
- Corrected the RU anomalous-spirit resistance abbreviation.
- Newly added calculated-result hints now match the existing solid Legacy help underline.

## Modern 3.15 — 2026-10-06

### For users

- Refined several RU calculated-result resistance labels and added hover help for seven compact stats.
- Updated RU character and calculator-navigation terminology.
- Renamed several RU equipment labels and shortened the reset action in all four UI locales.
- Three-digit derived base-stat totals and longer equipment slot labels now fit without clipping.

## Modern 3.14 — 2026-10-06

### For users

- Russian base-stat abbreviations no longer clip beside their numeric fields.
- RU calculated-result and effect labels received the requested shorter, more consistent terminology.
- The Equipment area now has Russian slot, modifier, element, Soul, reset and equipment-category labels.
- Equipment picker category headings and filters use the same translated category names.

## Modern 3.13 — 2026-10-06

### For users

- Base attributes now use the requested compact Russian abbreviations in RU mode.
- Calculated results have reviewed Russian labels for combat, defense, evasion, range, speed, elemental resistance and utility stats.
- Compact labels can now carry independent translated hover help, so explanatory Russian text does not have to be baked into the visible abbreviation.
- All 25 skill branches and four qualified Enchantment / Sage's Song effect labels now have reviewed Russian display text.

## Modern 3.12 — 2026-10-05

### For users

- Search no longer leaves an unexplained blank area: zero-result states show a clear message, an underlined `Reset filter` action and the current compatible/result count.
- Equipment picker now renders the Legacy weapon/equipment type separators as clear visual group headings, with a compact `All types` filter when more than one type is available.
- Picker keyboard UX is explicitly preserved and covered: arrows move between results, Enter selects the focused item, and a single Escape closes the picker even when an item preview is open.

- Fixed picker search width: when the current slot has no type filter, the search field now uses the full available width instead of staying in a shortened grid column.
- Recent Modern strings are back in the single translation source: `Reset filter`, `All types`, `Filter by type` and `Autosave enabled` now live in `translations.xlsx` with EN / RU / JP / TW values; untranslated JP/TW Modern strings safely fall back to English.
- Using the supplied RU/EN skill list, Russian names and descriptions were added for 205 confidently matched Legacy skills, and 198 English descriptions were normalized to the supplied text. Requirements, MP, timing, formulas, effects and skill IDs were not changed.

## Modern 3.11 — 2026-10-05

### For users

- Equipment no longer shows duplicate top-level Equipment Search and Soul Search actions. Search is still available where it belongs: inside every equipment picker and every visible Soul socket.
- The soft translucent 2P/3P stat-cost treatment is restored, compact character/riding/skill alignment is polished, and an item-preview hover race caused by automatic picker scrolling is fixed.
- Fresh deployments now discover and activate the new Service Worker automatically. Normal navigation, F5, returning to the tab or coming back online can adopt the new cache without requiring Ctrl+F5; autosave and offline behavior are preserved.
- The on-site “What’s new” panel and Remaked UI version are now generated from the latest CHANGELOG release, so release notes and the visible version no longer need separate manual synchronization.
- Delivery is substantially faster without dropping test coverage: browser work is sharded, WebKit and Firefox use a pinned Playwright image, headless Chromium avoids the unnecessary full browser download, and trusted merges reuse the exact successful PR validation instead of repeating it.
- The header now uses one joined two-part version badge: a prominent `REMAKED UI` segment and a quieter `Legacy Engine` segment. Both values come from shared release metadata, and the duplicate version text in the top-right controls is removed.
- The header received a final light polish: the Legacy version segment is softer and slightly greener, autosave is separated from navigation as a compact status indicator, language/install controls are a little tighter, and the temporary hero-art attribution caption is removed.
- Header layout is stable across language switches: top controls, lower navigation, Builds/Compare and autosave no longer resize from translated label length. Autosave now uses the interface's regular corner radius, `LEGACY ENGINE` is uppercase, and the version badge sits 2 px lower.
- Autosave is now a flat integrated status cell without a separate border: after recovery it briefly shows `Restored autosave`, then automatically settles to the persistent `Autosave enabled` state without resizing the lower bar.

## Modern 3.09 — 2026-10-04

Legacy entry without audience classification. See the [source changelog](CHANGELOG.md).

## Modern 3.08 — 2026-10-04

Legacy entry without audience classification. See the [source changelog](CHANGELOG.md).

## Modern 3.07 — 2026-10-04

Legacy entry without audience classification. See the [source changelog](CHANGELOG.md).

## Modern 3.06 — 2026-10-04

Legacy entry without audience classification. See the [source changelog](CHANGELOG.md).

## Modern 3.05 — 2026-10-04

Legacy entry without audience classification. See the [source changelog](CHANGELOG.md).

## Modern 3.04 — 2026-10-03

Legacy entry without audience classification. See the [source changelog](CHANGELOG.md).

## Modern 3.03 — 2026-10-03

Legacy entry without audience classification. See the [source changelog](CHANGELOG.md).

## Modern 3.02 — 2026-10-03

Legacy entry without audience classification. See the [source changelog](CHANGELOG.md).

## Modern 3.01 — 2026-10-03

Legacy entry without audience classification. See the [source changelog](CHANGELOG.md).

## Modern 3.00 — 2026-10-01

Legacy entry without audience classification. See the [source changelog](CHANGELOG.md).
