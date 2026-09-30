# Pandora Saga Simulator Remaked — Modernization Design Spec

**Date:** 2026-09-27  
**Status:** Approved by the user; historical requirements. Current implementation and acceptance evidence are tracked in the roadmap and release acceptance.
**Repository:** `bonaqu/Pandora-Saga-Simulator-remaked`  
**Target branch:** `bonaqu_projects`

---

## 1. Product goal

Turn the recovered 2011 Pandora Saga Simulator into a polished public game tool that ordinary Pandora Saga players can open, understand, and use immediately, while preserving the original simulator as a historical reference and keeping the legacy calculation behavior intact.

**User clarification, 2026-09-30:** Modern Mode targets the current Pandora Saga: Weapons of Balance server at https://pandorasaga-os.com/. Its skill wiki is an explicitly supplied reference. This does not authorize silently replacing Legacy 2.00 data/formulas: server compatibility must be mapped, documented and independently verified while `/legacy/` remains the museum baseline. The original Phases 0–7 below describe the completed modernization foundation, not a proof of current-server balance parity.

The project has two equally important goals:

1. **Preservation:** keep an accessible, faithful copy of the original simulator.
2. **Modern usability:** build a new 2026-facing interface around the same calculation logic so the tool is comfortable on desktop, tablet, and mobile.

The public repository should present the project as a player-facing tool, not as an infrastructure or development showcase.

---

## 2. Non-negotiable constraints

### 2.1 Calculation compatibility

- The legacy calculation behavior is the reference implementation.
- Modernization work must not silently change formulas.
- UI work, search, save slots, comparison, PWA, and localization must sit around the existing calculation state and functions wherever practical.
- Any future formula correction must be explicit, documented, and covered by tests.

### 2.2 Legacy preservation

- `/legacy/` must contain a near-museum copy of the recovered simulator.
- Legacy is not redesigned into Modern Mode.
- Legacy may receive only narrowly scoped fixes required to keep it runnable in modern browsers or to remove dead hosting dependencies.
- Historical provenance must remain documented.

### 2.3 Modern Mode

- `/` is the primary player-facing experience.
- Visual direction: **Hybrid Light Modern (Concept C)**.
- English is the default language.
- Russian is added as a first-class language when translation data is ready.
- Japanese and Traditional Chinese remain available where existing data supports them.

### 2.4 Hosting

- Remain deployable on free GitHub Pages.
- No database or Cloudflare dependency for the current roadmap.
- Cloud save is explicitly deferred until all local/offline features are complete and stable.

### 2.5 Ownership and licensing

- The restored legacy simulator must retain its original attribution and historical redistribution permission.
- New project-specific work authored for this repository — Modern Mode code, layout, styles, documentation, project branding, generated project assets, localization framework, build manager, comparison tools, and other additions — will be covered by a restrictive project license/terms notice.
- The repository must not falsely claim exclusive ownership of the original legacy simulator or original Pandora Saga game assets.

---

## 3. Information architecture

### 3.1 Routes

#### `/`
Primary Modern Mode.

Responsibilities:
- modern layout;
- modern navigation;
- responsive behavior;
- build manager;
- equipment/Soul search;
- comparison tools;
- modern localization shell;
- tooltips/explanations;
- changelog entry points;
- PWA installability.

#### `/legacy/`
Preserved historical simulator.

Responsibilities:
- provide a close representation of the recovered simulator;
- remain useful as a behavioral reference;
- provide a visible route back to Modern Mode.

### 3.2 Navigation

Modern Mode top navigation should replace the old float-based header.

Primary navigation:
- Simulator
- Job
- Skill
- Attack
- Defense
- Buff
- Log
- File / Builds

Utility navigation:
- Updates / Changelog
- Legacy Mode
- Report Issue
- Language
- Display mode / density if retained
- Install App when PWA criteria are met

The old links are reinterpreted as follows:
- `readme` → project information / repository link or compact About panel;
- `blog` → **Updates** or **Changelog**;
- `old version` → `/legacy/`.

Dead external links must not remain in the primary UI.

---

## 4. Visual design direction

### 4.1 Concept

Use Concept C: a light modern interface that is clearly descended from the original Pandora Saga Simulator.

Characteristics:
- pale green / cream base;
- darker moss/olive green for structure and active states;
- restrained gold accent inspired by Pandora Saga artwork;
- clean cards and section borders;
- significantly improved spacing and typography;
- familiar dense information where appropriate, but not cramped;
- no generic SaaS look;
- no overly futuristic neon gaming dashboard.

### 4.2 Brand imagery

If banners, repository covers, Open Graph images, or hero artwork are used:
- they must visually reference the real Pandora Saga game;
- recognizable Pandora Saga locations, character silhouettes, armor language, architecture, atmosphere, and logo treatment should guide the composition;
- original screenshots/artwork should be consulted as visual references before creating new project assets;
- generated project art should be new composition rather than pretending to be an official original asset;
- project pages must continue to state that the project is unofficial and independent.

The user-provided Pandora Saga banner is an approved visual-direction reference.

### 4.3 Desktop layout

Target widths:
- 1080p;
- 1440p;
- ultrawide without stretching core content into unreadable horizontal space.

Recommended structure:
- centered/max-width application shell;
- sticky or semi-sticky top navigation;
- main working area split into responsive cards/columns;
- status summary visible without requiring excessive scrolling;
- equipment area capable of expanding wider than skill/status cards.

The specific old bug where tabs/CSS/language controls float far to the right on wide screens must disappear entirely in Modern Mode.

### 4.4 Mobile layout

Mobile is not a shrunken desktop page.

Behavior:
- single-column primary flow;
- horizontal scroll or compact segmented navigation for major tabs;
- touch targets at least approximately modern mobile sizing;
- sticky compact character summary;
- collapsible advanced sections;
- equipment rows stack intelligently;
- no permanently clipped content;
- no dependency on hover for essential actions.

---

## 5. Modern Mode technical architecture

### 5.1 Principle: adapter around legacy state

Do not rewrite the calculator engine first.

Modern Mode should communicate with the existing legacy state through a narrow adapter layer.

Proposed logical modules:

```text
legacy-engine/
  existing Status / Name / EquipData / Skill data
  existing CalcSet / Store / Expand / related functions

modern/
  adapter.js
  app-shell.js
  search.js
  builds.js
  compare.js
  localization.js
  tooltips.js
  pwa.js
  modern.css
```

Exact filenames may change during implementation, but responsibilities must remain separated.

### 5.2 Adapter responsibilities

The adapter is the single preferred entry point for new code.

It exposes stable operations such as:
- get current serialized build;
- load serialized build;
- recalculate;
- read current character metadata;
- read selected equipment;
- read selected Souls;
- read calculated summary stats;
- subscribe to or trigger modern UI refresh after legacy state changes.

Modern modules should avoid directly scattering writes to legacy global arrays across many files.

### 5.3 Preservation boundary

The legacy calculation/data files should be treated as compatibility code.

Changes there should be:
- rare;
- minimal;
- separately documented;
- regression-tested.

---

## 6. Equipment and Soul search

### 6.1 Goals

Replace painful browsing through large legacy `<select>` lists with fast discovery while preserving selection compatibility.

### 6.2 Search behavior

Equipment search supports:
- free-text name search;
- equipment slot filter;
- level range / minimum level filter where data permits;
- class compatibility filter;
- race compatibility filter where data permits;
- element filter where applicable;
- clear/reset filters;
- keyboard navigation on desktop;
- touch-friendly result selection on mobile.

Soul search supports:
- free-text name search;
- compatible slot filter;
- relevant effect/category filters where the source data can be mapped safely;
- clear/reset filters.

### 6.3 Integration rule

Search results must select the same underlying IDs that the legacy engine already understands. Search must not create a second competing equipment state model.

### 6.4 Empty and unavailable states

- Show a clear `No matching items` state.
- If a filter cannot be supported by trustworthy legacy data, do not fake it.
- Unsupported filters should be omitted rather than inferred unreliably.

---

## 7. Autosave and named build slots

### 7.1 Existing capability

The legacy simulator already serializes complete character state through `Store()` and restores it through `Expand()`, with localStorage already used by the old file system.

Modern Mode should build on this representation rather than invent a new character schema immediately.

### 7.2 Modern build store

Use a new namespaced storage area, for example:

```text
pandora-remaked.builds.v1
pandora-remaked.autosave.v1
pandora-remaked.settings.v1
```

Avoid overwriting the legacy `localStorage.file` format.

### 7.3 Features

- automatic draft save after meaningful state changes;
- recovery of last session;
- named builds;
- rename;
- duplicate;
- overwrite confirmation;
- delete confirmation;
- timestamp of last modification;
- optional short note/tag later if useful;
- import/export serialized build text where safe.

### 7.4 Migration/versioning

Each Modern Mode saved-build record has a schema version and engine compatibility metadata so future migrations are possible.

Example conceptual shape:

```json
{
  "schema": 1,
  "name": "PvP Horseman",
  "updatedAt": "ISO_DATE",
  "engine": "legacy-2.00",
  "payload": "<Store() output>"
}
```

---

## 8. Compare Builds

### 8.1 Purpose

Let users evaluate trade-offs between two saved configurations without manually writing numbers down.

### 8.2 Flow

1. Choose Build A.
2. Choose Build B.
3. Display both summaries plus delta.

### 8.3 Initial comparison fields

Where reliable values can be read from the calculated UI/state:
- LP / HP;
- MP;
- physical attack;
- magic attack;
- defense;
- physical/magic resist fields;
- accuracy;
- dodge;
- crit;
- crit resistance;
- attack speed;
- cast speed/time;
- movement-related values;
- other existing summary fields exposed by the simulator.

### 8.4 Delta presentation

Example:

```text
ATK      241 → 278   +37
HP       336 → 224   -112
Crit      13 → 15    +2
```

Positive/negative styling must be neutral: a higher value is not always objectively better if another stat was sacrificed.

### 8.5 Calculation safety

Comparison should load/compute each build using the same legacy calculation path used by the simulator, not reproduce formulas in a new compare module.

---

## 9. Localization

### 9.1 Repository language switch

Repository home:
- `README.md` = English primary;
- `README.ru.md` = Russian;
- visible top switcher: `English | Русский`.

Both should be written for ordinary users.

Main README content:
- what the simulator is;
- live site button;
- screenshots/GIFs;
- major features;
- Modern vs Legacy;
- supported languages;
- current status;
- issue/report link;
- brief provenance/unofficial notice.

Developer-focused details move out of the main README into Wiki/docs.

### 9.2 Site languages

Target language options:
- EN — default;
- RU — new;
- JP — retained;
- TW — retained.

### 9.3 Russian translation workflow

The user is the source of truth for official Russian-client terminology.

Implementation must therefore include a translation extraction workflow.

Deliverables:
- machine-readable English source strings;
- a human-editable RU translation worksheet/file;
- every translatable UI label;
- every translatable race/class/skill/equipment/Soul label that can be mapped safely;
- a proposed Russian translation column only where useful as a draft;
- a final user-approved Russian column.

The project must not present guessed game-client terminology as authoritative.

### 9.4 Translation staging

Stage 1:
- translate Modern Mode UI shell;
- build extraction lists.

Stage 2:
- user supplies/corrects official Russian game terms.

Stage 3:
- integrate full Russian game-data names.

---

## 10. Tooltips: “why this stat?”

### 10.1 Goal

Explain calculated values where the engine exposes enough intermediate information to do so accurately.

### 10.2 Safety rule

Do not reverse-engineer and display a fake decomposition if the engine does not expose reliable components.

### 10.3 Progressive implementation

Phase A:
- tooltip definition/explanation for stat meaning;
- source references such as selected equipment/buffs that affect it when reliably detectable.

Phase B:
- numeric decomposition only for formulas that are explicitly verified against legacy calculations and covered by tests.

Example target:

```text
Attack 241
Base / attributes: 77
Weapon contribution: 112
Equipment / options: 34
Active buffs: 18
```

Only ship this exact type of breakdown when verified.

---

## 11. Automated testing strategy

### 11.1 Preserve current checks

Continue:
- required file validation;
- local asset reference validation;
- core JavaScript syntax checks;
- GitHub Pages deployment validation;
- default EN build validation.

### 11.2 Add behavioral regression fixtures

Create a set of known builds and expected outputs.

Fixtures should cover:
- multiple races;
- multiple jobs/classes;
- naked/basic character;
- equipment-heavy character;
- skill-heavy character;
- mounted/horsemanship scenario;
- Souls/options;
- edge levels / stat caps where relevant.

For each fixture:
1. load known serialized payload;
2. run normal calculator initialization/recalculation;
3. assert expected summary outputs.

### 11.3 UI tests

Smoke flows:
- Modern Mode loads;
- Legacy Mode loads;
- EN is default;
- language switches work;
- build save/load round-trip;
- autosave recovery;
- equipment search selects expected item ID;
- compare view produces expected deltas;
- mobile navigation is usable;
- PWA manifest/service worker are valid.

### 11.4 Differential testing

Where practical, run the same serialized build through Legacy and Modern surfaces and verify that the resulting calculation summary is identical.

This is a key protection against UI refactors changing game math.

---

## 12. PWA / Offline

### 12.1 Goals

Allow installation on desktop/mobile and operation without network after assets are cached.

### 12.2 Components

- `manifest.webmanifest`;
- service worker;
- install icons;
- theme/background metadata;
- offline cache strategy.

### 12.3 Cache strategy

Versioned cache of:
- Modern Mode shell;
- legacy calculator JS/data required by Modern Mode;
- CSS;
- icons/images necessary for calculator operation;
- `/legacy/` core assets where storage impact remains reasonable.

Do not permanently cache GitHub API or external web content.

### 12.4 Update UX

When a new app version is deployed:
- download updated static assets;
- show a small non-blocking `New version available — Reload` notice rather than unexpectedly reloading the user mid-build.

---

## 13. Project branding

### 13.1 Assets

Target:
- favicon;
- PWA icons;
- repository cover;
- Open Graph image;
- optional site hero/header art;
- concise project logo/wordmark treatment.

### 13.2 Name

Keep repository identity recognizable as:

**Pandora Saga Simulator Remaked**

User-facing copy may use a cleaner display title such as:

**Pandora Saga Simulator — Remaked**

Do not imply official game ownership or publisher affiliation.

### 13.3 README media

Prefer real UI captures/GIFs demonstrating:
- class selection;
- changing stats;
- searching equipment;
- saving a build;
- comparing builds;
- mobile view.

Decorative game art may accompany these but must not replace proof of the actual application.

---

## 14. Data modernization / versioning

### 14.1 Do not migrate everything first

`item.js`, `skill.js`, and related large legacy files should not be rewritten before Modern Mode works.

### 14.2 Gradual extraction

Introduce adapters/export scripts that can convert legacy data into structured read-only JSON for Modern Mode features such as search.

Potential outputs:

```text
data/generated/equipment.v1.json
data/generated/souls.v1.json
data/generated/skills.v1.json
```

### 14.3 Source of truth during transition

Until explicitly changed:
- legacy JS data remains calculation source of truth;
- generated JSON is a searchable projection;
- generation must be reproducible;
- IDs must map back to legacy IDs.

### 14.4 Future option

Only after differential tests are mature may a later project consider making structured data the canonical source.

That is outside the current implementation scope.

---

## 15. Changelog and project history

### 15.1 User-facing site

Add a compact version indicator, for example:

```text
Legacy engine: 2.00
Remaked UI: 2026.09.x
```

Provide:
- `What's new` / Updates panel;
- link to full changelog;
- link to report incorrect data/calculation.

### 15.2 Repository

Maintain `CHANGELOG.md` with user-visible changes.

Developer/internal historical details can remain in docs/wiki rather than the README home page.

---

## 16. README and repository presentation

### 16.1 Main README audience

Ordinary players.

Do include:
- clear title and cover;
- language switch;
- Open Simulator button;
- short explanation;
- screenshots/GIFs;
- features;
- Modern / Legacy distinction;
- supported languages;
- current status;
- reporting issues;
- concise unofficial/preservation attribution.

Do not include on the main page:
- Cloudflare/database design discussion;
- local development instructions;
- deployment internals;
- project architecture trees;
- restoration automation internals;
- lengthy technical integrity details.

Those move to Wiki/docs.

### 16.2 Wiki/docs

Keep detailed material:
- FAQ;
- History;
- Architecture;
- Deployment;
- Translation guide;
- Data provenance;
- Developer/testing notes.

---

## 17. Licensing strategy

### 17.1 Required separation

The license notice must distinguish:

**Legacy/recovered material**
- subject to its historical attribution and permissions;
- not claimed as exclusively authored by this repository owner.

**New Remaked material**
- restrictive copyright notice;
- no redistribution of new project code/assets as a competing project without permission;
- no commercial reuse of the new project-specific material without permission;
- no claiming project branding/new additions as another party's work;
- normal end-user use of the hosted simulator is allowed.

### 17.2 Clarity

Because the repository is public, source visibility cannot technically prevent copying. The license can establish permission terms; it cannot make public files impossible to download.

### 17.3 Game IP

The project must avoid implying ownership over Pandora Saga trademarks, official logos, characters, or original game art.

---

## 18. Cloud save — deferred

Cloud save is intentionally not part of the current implementation phases.

It may be considered later after:
- Modern Mode stable;
- local autosave stable;
- named builds stable;
- compare stable;
- RU localization workflow stable;
- PWA stable;
- regression tests established.

Potential future architecture may use Cloudflare Workers + D1/KV or another free-tier backend for:
- accounts;
- cross-device saved builds;
- public build links;
- server-backed sharing.

No current feature may require this backend.

---

## 19. Delivery phases

### Phase 0 — preservation baseline

- snapshot current working state;
- ensure Legacy route can be produced exactly and repeatedly;
- strengthen existing smoke validation;
- establish differential test harness foundation.

### Phase 1 — Modern Mode foundation

- create `/legacy/` route;
- move primary route to modern shell;
- implement Concept C visual system;
- rebuild top navigation;
- fix wide-screen layout issue;
- responsive desktop/mobile grid;
- meaningful `Updates` and `Legacy Mode` links;
- EN default retained;
- README EN/RU player-facing rewrite;
- license/NOTICE separation;
- initial branding assets.

### Phase 2 — search and build workflow

- equipment search;
- Soul search;
- filters backed only by reliable data;
- autosave;
- named build slots;
- build duplicate/rename/delete;
- recovery behavior;
- user-facing error states.

### Phase 3 — compare and diagnostics

- Compare Builds;
- summary delta table;
- initial safe tooltips;
- expanded regression fixture set;
- Modern vs Legacy differential tests.

### Phase 4 — mobile polish and PWA

- mobile-specific interaction review;
- sticky summary;
- collapsible sections;
- PWA manifest/icons;
- service worker/offline behavior;
- update notification UX.

### Phase 5 — Russian localization framework

- extract Modern UI strings;
- extract legacy game terminology into translation files;
- create user translation worksheet;
- add RU switch with UI-shell translation first;
- integrate user-verified game terms later.

### Phase 6 — structured data projections

- reproducible legacy-data export scripts;
- generated equipment/Soul/skill JSON for search/tooling;
- explicit version metadata;
- no replacement of calculation source of truth yet.

### Phase 7 — finish/polish

- richer changelog on site;
- final screenshots/GIFs in README;
- accessibility and keyboard review;
- cross-browser smoke pass;
- documentation cleanup;
- release tag.

### Later — cloud save

Separate future design/spec only after the local roadmap is finished.

---

## 20. Error handling and resilience

### Storage

If localStorage is unavailable/full/corrupt:
- simulator remains usable;
- build manager shows a clear warning;
- do not destroy current in-memory build;
- provide export/copy fallback where possible.

### Invalid saved payload

- do not call `Expand()` blindly on malformed records;
- validate record shape/version first;
- isolate broken slots rather than breaking all saves.

### PWA cache

- cache failure must not block online operation;
- service worker errors must fail open.

### Search index generation

- if generated search data is missing/outdated, deploy should fail rather than serve inconsistent IDs.

### Translation

- missing RU strings fall back to English;
- missing official game-term translations are visibly treated as untranslated rather than guessed silently.

---

## 21. Accessibility and usability

Modern Mode should improve:
- readable contrast;
- keyboard focus visibility;
- labels for icon-only controls;
- non-hover access to essential information;
- reasonable touch target size;
- semantic buttons rather than clickable anonymous blocks where practical;
- reduced dependence on tiny fixed-width text.

Legacy Mode is exempt from full redesign but should remain operable.

---

## 22. Performance

The application should remain lightweight.

Guidelines:
- no heavy framework required unless implementation proves it provides clear benefit;
- prefer plain modern JS/CSS modules around legacy code;
- lazy-load nonessential decorative media;
- do not load every large item image eagerly;
- search indexes should be compact and local;
- PWA cache size should be monitored.

---

## 23. Success criteria

The modernization is successful when:

1. Opening `/` at 1080p/1440p no longer shows the broken floating header/layout seen in the user screenshot.
2. `/legacy/` remains available as the preserved old simulator.
3. Modern and Legacy produce matching calculation summaries for regression fixtures.
4. Equipment and Soul search can select real legacy IDs without changing engine semantics.
5. The current build survives refresh through autosave.
6. Users can maintain multiple named build slots.
7. Two saved builds can be compared with clear numeric deltas.
8. Mobile use is practical without desktop-only hover/micro-controls.
9. The app can be installed and reopened offline after caching.
10. EN remains default; RU infrastructure exists and accepts user-verified terminology.
11. README is useful to ordinary players in EN and RU and does not foreground developer infrastructure.
12. New project material has a clear restrictive license boundary while legacy attribution remains accurate.
13. Changelog/version information is visible from the site.
14. GitHub Actions blocks deployment if core static/regression checks fail.
15. Cloud save remains optional and deferred.

---

## 24. Explicitly out of scope for the current implementation plan

- rewriting the entire legacy calculator engine;
- replacing all formulas with a new calculation engine;
- server accounts;
- Cloudflare D1/Workers deployment;
- cloud sync;
- claiming exclusive copyright in original Pandora Saga assets;
- inventing official Russian game terminology without user verification;
- replacing legacy data as source of truth before differential tests are mature.

---

## 25. Decision summary

Approved direction:
- **Modern UI:** Concept C / Hybrid Light Modern;
- **Default language:** English;
- **Legacy:** preserved at `/legacy/`;
- **Modern route:** `/`;
- **Repository:** player-facing EN + RU README;
- **Blog:** replaced by Updates/Changelog;
- **Storage:** local-first, no backend;
- **Build format:** reuse `Store()`/`Expand()` through an adapter;
- **Search:** indexed projection mapping to legacy IDs;
- **Compare:** same legacy engine path, not duplicated formulas;
- **Russian:** user-verified translation workflow;
- **PWA:** yes;
- **Cloud save:** later, separate project;
- **Branding:** authentic Pandora Saga-inspired visual references, clearly unofficial;
- **License:** restrictive for new Remaked material, accurate attribution for legacy/original material.
