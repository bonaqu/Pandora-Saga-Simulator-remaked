# How project updates reach the live site

## Hosting

The public simulator is published to GitHub Pages:

https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/

The project keeps two user-facing modes:

- **Modern** — the actively maintained interface and PWA.
- **Legacy** — the preserved Pandora Saga Simulator 2.00 museum route.

## Release flow

A normal user-facing change is developed on a branch, validated by Feature CI and merged into `bonaqu_projects`. GitHub Actions then builds the static Pages artifact and publishes it.

For an exact merge whose PR head already passed Feature CI, deployment reuses that successful validation and runs a smaller production smoke gate. Direct pushes, manual runs and any case that cannot prove the exact successful PR head automatically use the full fallback validation path.

This keeps normal releases fast without turning off the safety checks needed for unusual publication paths.

## What is validated

Depending on the change, validation includes:

- preserved Legacy source and calculation compatibility;
- Python/Node data and projection checks;
- Chromium browser contracts;
- focused Chromium/Firefox/WebKit compatibility smoke;
- PWA/offline behavior;
- generated localization and structured data;
- Modern/Legacy routing and production artifact checks.

The public release pipeline does not intentionally weaken formulas or silently rewrite old saved builds to make a test pass.

## Cache and PWA updates

Modern uses a content-fingerprinted Service Worker for offline use. Since Modern 3.11:

- the Service Worker script is checked without reusing its HTTP cache;
- a newly installed version can activate automatically;
- fresh navigation HTML can bridge clients still controlled by an older cached runtime;
- returning to the tab or network can trigger another update check;
- one controlled reload switches to the fresh cache;
- first install is kept separate from a real update.

As a result, users should not normally need Ctrl+F5 after a release. An already-open untouched tab cannot receive a GitHub Pages push event by itself, so the update is picked up on normal navigation, refresh, visibility/online checks or the next visit.

## Translation releases

The editable translation workbook is `localization/translations.xlsx`. Its structure is validated before publication and the runtime localization files are generated during the Pages build.

See [the Russian translation guide](LOCALIZATION_FOR_BEGINNERS.ru.md).

## Version and changelog

The latest dated `## Modern X.Y — ...` entry in [CHANGELOG.md](../CHANGELOG.md) is the canonical public release record. During build, the site derives from it:

- the visible Remaked UI version;
- the PWA cache version prefix;
- the RU/EN highlights shown in the on-site **What’s new / Что нового** dialog.

That prevents the visible version, popup and full changelog from drifting apart.

## Wiki synchronization

After a successful Pages deploy, the workflow performs a best-effort synchronization of the public documentation into the GitHub Wiki. A Wiki failure does not block the simulator itself.

## Backend boundary

The public calculator is still delivered as a static GitHub Pages application. A separate backend may provide versioned catalog data used by Modern, but maintainer credentials, secrets, administrator login instructions and recovery procedures are intentionally not part of the public documentation.
