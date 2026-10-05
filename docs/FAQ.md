# FAQ

## What is this project?

**Pandora Saga Simulator Remaked** restores the old Pandora Saga browser calculator and keeps the original 2.00 calculation engine available while adding a maintained Modern interface.

## Is it official?

No. This is an independent, unofficial preservation and modernization project. It is not affiliated with the original publisher or game operators.

## What is the difference between Modern and Legacy?

- **Modern** is the actively maintained interface: responsive layout, equipment/Soul pickers, build management, comparison, localization and PWA/offline support.
- **Legacy** is the preserved museum route. It exists so the original calculator behavior can still be inspected and compared.

Modern additions are guarded so that improving the interface does not silently rewrite the preserved Legacy source.

## What version is current?

The current published interface is **Modern 3.11**. The preserved calculation engine remains **Legacy 2.00**.

The site now derives its visible Remaked version from the latest dated Modern release in `CHANGELOG.md`.

## Why did I previously need Ctrl+F5 after an update?

The PWA Service Worker cached CSS/JavaScript for offline use and older clients could keep serving the previous asset set after a deployment.

Modern 3.11 changes the update lifecycle:

- the worker script is checked without reusing its HTTP cache;
- a newly installed update can activate automatically;
- fresh navigation HTML can upgrade clients still controlled by the older cached runtime;
- returning to the tab or network performs another update check.

A completely untouched open tab cannot receive a push notification from static GitHub Pages by itself, but normal navigation/F5/returning to the tab should no longer require Ctrl+F5.

## Does the project work offline?

After a successful online load, Modern and Legacy can be available through the PWA cache. Offline use does not mean cloud storage: builds are primarily stored in the current browser.

## Where is Equipment/Soul search?

Search is integrated into the normal slot-selection flow. Open the relevant weapon, shield, armor or accessory slot to search compatible equipment; open a visible Soul socket to search compatible Souls.

The old duplicate top-level Equipment Search and Soul Search actions were removed in Modern 3.11.

## Are old saved builds automatically changed by catalog updates?

No. Versioned catalog context is kept so an old build or shared link does not silently change its result. Updating a current build to a newer published catalog is an explicit action.

## Which languages are supported?

The preserved source contains English, Japanese and Traditional Chinese game data. Modern also provides a Russian interface and an editable translation workflow.

See [LOCALIZATION_FOR_BEGINNERS.ru.md](LOCALIZATION_FOR_BEGINNERS.ru.md).

## Does the site need a backend?

The public calculator itself is delivered as static GitHub Pages. Modern can also read versioned catalog data from a separate backend, but player builds do not require an account or cloud save.

Private administrator credentials and operating procedures are intentionally outside the public documentation.

## How are releases tested?

The project combines data/static checks with Chromium regression coverage and focused Chromium/Firefox/WebKit compatibility smoke. PWA/offline changes receive browser-specific tests.

Normal merges can reuse the exact successful PR validation; unusual/direct/manual publication paths retain the full fallback validation.

See [Deployment](DEPLOYMENT.md) and [Architecture](ARCHITECTURE.md).

## Where can I see recent and planned changes?

- [CHANGELOG.md](../CHANGELOG.md) — published releases.
- [Public roadmap](TASK_QUEUE.ru.md) — current directions and future work.
- [History](HISTORY.md) — preservation/project provenance.

## How do I report a problem?

Open a GitHub Issue and include the shortest reproducible sequence you can:

- browser and version;
- selected language;
- relevant class/build values;
- what you clicked;
- expected result;
- actual result;
- screenshot or console error when useful.

A small reproducible example is more useful than a long description without steps.
