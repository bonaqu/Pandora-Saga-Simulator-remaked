# Release media provenance

These PNGs show the real site, not proposed layouts.

- Source: https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/
- UI: `2026.09.9`, Legacy engine `2.00`, EN source data and EN Modern UI.
- Commit: `816e72f77cdab776bb27f2d06c24ce31ac384899` (PR #14).
- Verified production workflow/artifact: `36632481054`.
- Captured: 2026-09-30 (Europe/Moscow), Chromium/Playwright 1.63.0, device scale 1.
- Equipment search and comparison: captured at 1440×1000, focused on the real panel so labels remain readable at README width. Build Manager: full 390×844 viewport.
- Comparison/build names are explicitly marked examples. Only the race differs; the active character is restored. Browser storage was isolated from user data.
- `modern/social-preview.png`: 1200×630 real main-page capture from the same release. Original art/attribution boundaries in `NOTICE.md` still apply.

Recapture after a meaningful UI change:

```powershell
node scripts/capture_release_media.mjs https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/ EXPECTED_UI_VERSION
```

The PNG icon exports retain the existing `modern/icon-192.svg` and `modern/icon-512.svg` sources. Regenerate with `node scripts/export_brand_icons.mjs` after an intentional vector change. The PNG background is opaque beige for installation surfaces.
