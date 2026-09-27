# Modern Mode Visual Completion Pass

**Goal:** Finish the approved Hybrid C visual direction before Phase 2 feature UI lands, so search/builds are added onto the intended Pandora Saga presentation rather than onto a temporary foundation shell.

**Reference:** the approved comparison mockup `C — Hybrid (Light Modern)`: light green/beige surfaces, a real hero/banner region, Pandora Saga atmosphere, compact utility bar above the hero, green simulator tabs below it, and the legacy calculator contained inside the Modern shell.

## Constraints

- Keep `/legacy/` byte-preservation behavior unchanged.
- Do not change legacy calculator formulas/data or source `index.html`, `js/**`, `css/**`, `image/**`.
- Modern Mode remains English-first with JP/TW controls.
- The banner currently uses the previously generated fan header prepared for this project; it must be described as unofficial artwork rather than an official screenshot.
- The hero source is stored as ordered Base64 text chunks under `modern/pandora-hero.parts/` and reconstructed during the deterministic Pages build. Missing chunk numbers are a hard build failure, and the transport chunks are removed from the public `_site` after reconstruction.
- The layout must remain usable at 1920×1080, 2560×1440, 1365×768, and 390×844.
- No body-level horizontal overflow on mobile.
- The dense legacy calculator may remain in its scrollable work area until the later mobile redesign phase.

## Task 0 — Finish the Hybrid C shell

- [ ] Add a dedicated Modern hero/banner asset under `modern/`.
- [ ] Add `[data-remaked-hero]` between the utility row and simulator navigation.
- [ ] Hero visibly communicates `Pandora Saga Simulator` and `Remaked`, with legacy/UI version metadata.
- [ ] Rework the utility row to feel like the mockup top strip rather than a standalone app toolbar.
- [ ] Remove the oversized sticky-header behavior once the hero is present; keep page composition stable during scroll.
- [ ] Keep green tabs immediately below the hero.
- [ ] Refine shell/background/radii/shadows so the top region reads as one cohesive fantasy-tool header rather than separate floating widgets.
- [ ] Desktop hero height approximately 160–210 px; mobile hero approximately 105–145 px.
- [ ] Add Playwright assertions for hero presence, title, asset load, desktop/mobile height, and existing overflow/nav guarantees.
- [ ] Capture fresh 1440px and 390px screenshots and visually compare with the approved Hybrid C reference.

## Release Gate

This visual pass is part of the `feature/search-builds` branch and must be green before adapter/search/storage implementation continues. The final Phase 2 PR should therefore show the completed header plus Equipment/Soul search and build storage together.