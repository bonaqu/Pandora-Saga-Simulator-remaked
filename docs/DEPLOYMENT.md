# How project updates reach the live site

## Hosting

The public simulator is published to GitHub Pages:

https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/

The project keeps two user-facing modes:

- **Modern** — the actively maintained interface and PWA.
- **Legacy** — the preserved Pandora Saga Simulator 2.00 museum route.

## Release flow

A normal user-facing change is developed on a branch, validated by Feature CI and merged into `bonaqu_projects`. GitHub Actions then builds the static Pages artifact and publishes it.

Deployment uses a fail-closed change policy rather than one validation path for every push:

- **Release notes only** — if everything since the last successful Pages deployment is allowlisted documentation and includes `CHANGELOG.md`, the workflow runs focused changelog/build tests, rebuilds the site, validates the generated **What’s new** payload and deploys without installing browsers.
- **Documentation only** — documentation that does not affect the public Pages artifact skips the Pages build entirely; Wiki inputs can still synchronize independently.
- **Validated runtime** — runtime commits that are all traceable to merged PR heads with successful Feature CI reuse that validation and run the smaller production smoke gate. This also covers a documentation follow-up that cancels an in-progress deploy after an already validated merge.
- **Full fallback** — direct runtime pushes, unknown history, failed provenance checks, manual runs and deployment/build infrastructure changes run the complete validation matrix.

The classifier is deny-by-default. A mixed documentation/runtime change cannot enter the documentation fast path, and deployment-sensitive files are checked before the repository-owned classifier is executed.

Deployments check out the exact triggering commit and never import or push source material from inside the publication job. This keeps the artifact deterministic and avoids recursive or race-prone deployment pushes.

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

Translations are edited through the protected four-language admin console, not a spreadsheet. Pages builds validate `localization/approved-translations.v1.json` and generate immutable runtime catalogs; Cloudflare D1 publishes per-ID edits without a Pages release. The old spreadsheet is absent from the repository tree and recoverable only through Git history.

Administrator-only workflows are documented privately and are not published in this repository.

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
