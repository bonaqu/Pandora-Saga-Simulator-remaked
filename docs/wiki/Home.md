# Pandora Saga Simulator Remaked — Wiki

Welcome to the public project wiki for **Pandora Saga Simulator Remaked**.

## Quick links

- **Live simulator:** https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/
- **Repository:** https://github.com/bonaqu/Pandora-Saga-Simulator-remaked/
- **Current version:** shown in the live simulator's Updates panel
- **Release history:** [English](https://github.com/bonaqu/Pandora-Saga-Simulator-remaked/blob/bonaqu_projects/CHANGELOG.en.md) · [Русский](https://github.com/bonaqu/Pandora-Saga-Simulator-remaked/blob/bonaqu_projects/CHANGELOG.ru.md)
- **Roadmap:** [[Roadmap]]
- **FAQ:** [[FAQ]]
- **Architecture:** [[Architecture]]
- **How releases reach the site:** [[Deployment]]
- **History & provenance:** [[History]]

## Project goal

Keep the original Pandora Saga Simulator 2.00 calculation behavior available while making the tool practical on current browsers, monitors and phones.

The project deliberately separates two modes:

- **Modern** — maintained UI, search, builds, comparison, localization and offline/PWA support.
- **Legacy** — preserved museum route for the original calculator behavior and comparison.

## Current update behavior

The public UI version reflects the latest deployment, while the on-site **What’s new** panel shows only the most recent changelog section explicitly marked for users. Its full history link follows the interface language (RU/EN) and marks user-facing and development notes separately. Administration-only releases are never used as user update highlights.

The PWA uses a content-fingerprinted cache for offline use, but new deployments are now detected and activated automatically. Users should normally not need Ctrl+F5: normal navigation/refresh, returning to the tab or coming back online can adopt the fresh version.

## Documentation scope

Public documentation is intentionally written for players, translators and people interested in the project itself. Architecture and release behavior remain documented, while private administrator credentials and maintainer-only operating instructions are not published in the Wiki.
