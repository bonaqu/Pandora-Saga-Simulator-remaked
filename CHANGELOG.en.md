# Release history — English

Canonical source: [CHANGELOG.md](CHANGELOG.md). The site's What's New panel displays user entries only.

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
