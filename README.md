<p align="center">
  <strong>English</strong> · <a href="README.ru.md">Русский</a>
</p>

<p align="center">
  <img src="docs/assets/cover.svg" alt="Pandora Saga Simulator Remaked" width="100%" />
</p>

<h1 align="center">Pandora Saga Simulator — Remaked</h1>

<p align="center">
  A restored and modernized character simulator for <strong>Pandora Saga</strong>, preserving the behavior of the legacy 2.00 calculator while making it easier to use on current browsers and screens.
</p>

<p align="center">
  <a href="https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/"><img src="https://img.shields.io/badge/OPEN_SIMULATOR-6c9b3f?style=for-the-badge" alt="Open Simulator"></a>
  <a href="https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/legacy/"><img src="https://img.shields.io/badge/LEGACY_MODE-7b846f?style=for-the-badge" alt="Legacy Mode"></a>
</p>

## 🎮 About

**Pandora Saga Simulator Remaked** brings the old browser-based Pandora Saga character calculator back to life and gradually modernizes the experience without replacing its original calculation logic.

The project is made for players who want to experiment with classes, attributes, skills, equipment and other character settings without depending on the long-dead original FC2 page.

Modern uses a continuously refreshed current game-data catalog on top of the preserved Legacy 2.00 calculation path. Saved Modern builds keep the player's choices but are migrated forward to current data; Legacy Mode remains the untouched historical reference.

## ✨ Modern Mode

The main site opens in **Modern Mode**:

- refreshed Hybrid Light interface inspired by the original green simulator;
- English interface by default;
- Japanese and Traditional Chinese legacy data remain available;
- responsive application shell for desktop, ultrawide, tablet and phone screens;
- **searchable Equipment selection** directly inside each weapon/armor/accessory picker, with compatibility filtering, name/level search, item/Soul characteristics, deliberate desktop hover and a separate touch info action; review never equips a candidate;
- **searchable Soul selection** directly inside each visible Soul socket, limited to compatible options;
- automatic local autosave with recovery after refresh;
- **Build Manager** for named local builds: save, load, rename, duplicate and delete;
- import/export using the simulator's existing serialized build code;
- **Compare Builds** for side-by-side stats from two saved builds, including neutral `Build B − Build A` deltas;
- keyboard-accessible stat help that explains what a displayed value represents and identifies its exact Legacy 2.00 output node;
- a keyboard skip link and native modal dialogs that keep focus inside and return it to the opener on Escape;
- an on-site **Updates** panel with separate Legacy/UI versions, release highlights and the full changelog;
- a compact sticky character summary and collapsible detail cards on phone screens;
- online-only delivery with retired install/offline caches, keeping the calculator on one current web version;
- automatic live release checks that wait for a short idle moment, flush autosave and reload fresh Modern assets without normally requiring Ctrl+F5;
- one EN/RU/JP/TW language panel: RU with English fallback, or original JP/TW game data with the English Modern shell;
- read-only item/Soul details in Modern search and a Share build link that restores the character in another browser;
- all Remaked autosaves and named builds stay local to the current browser in this release.

Compare Builds does not replace the calculator formulas. Both sides are evaluated through the preserved legacy calculation path, and the current active character is restored afterwards. Stat help intentionally does **not** invent detailed attribute/equipment/buff formula breakdowns where those components have not been verified.

**Open Modern Mode:**  
https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/

## In use

The screenshots below are real Modern Mode captures and remain representative of the interface; the live site may contain newer visual polish. Names and calculations shown in them come from the preserved engine.

<img src="docs/assets/screenshots/equipment-search-desktop.png" alt="Equipment Search on desktop: compatible items with name and level filters" width="720" />

<details>
<summary>Compare Builds and mobile Build Manager</summary>

<img src="docs/assets/screenshots/compare-builds-desktop.png" alt="Two example builds compared with stat values and neutral Build B minus Build A differences" width="880" />

<img src="docs/assets/screenshots/build-manager-mobile.png" alt="Build Manager at a 390-pixel phone width with two named example builds and import/export controls" width="390" />

</details>

## 🕰️ Legacy Mode

Want the old simulator exactly the way longtime users remember it? The preserved **Legacy Mode** remains available separately as a historical reference and compatibility baseline.

**Open Legacy Mode:**  
https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/legacy/

## 🌐 Languages

| Language | Status |
|---|---|
| English | Default |
| 日本語 | Available through the legacy data |
| 繁體中文 | Available through the legacy data |
| Русский | Modern interface available; game names await verification against the Russian client |

The protected localization center is the only editor for Russian, English, Japanese and Traditional Chinese. Previously approved translations have been preserved in versioned `localization/approved-translations.v1.json`, and new publications live in Cloudflare D1 with revision checks. The legacy Excel file has been retired; its last verified copy is recoverable from the Git history. Approved translations appear throughout the Modern calculator, lists, search and skill descriptions. Blank game fields retain the selected source language; Legacy Mode stays unchanged.

Modern **3.51** unifies approved translations into the four-language admin console and introduces a saved catalog-draft queue: review and publish selected changes from different items as one guarded catalog revision. Historical translations and published game data remain intact.

Modern checks a small no-cache release manifest on startup, when returning to the tab, after reconnecting and periodically while visible. A newer release waits for a short idle moment, commits the active field, flushes autosave and reloads versioned assets. The site is intentionally online-only; no manual cache or cookie cleanup should normally be needed.

The on-site **Updates / What’s new** dialog is generated from the latest release in [CHANGELOG.md](CHANGELOG.md), and the visible Remaked UI version is derived from the same release during build. The visible version, short release notes and full changelog therefore share one source of truth.

Public documentation focuses on player help, project architecture, history, release behavior and roadmap. Private catalog-administration credentials and maintainer-only operating instructions are intentionally kept out of the public documentation set.

## 🚧 What's coming next

Current directions include:

- continued verification of current equipment, Souls, classes and skills against confirmed sources;
- more verified Russian game terminology;
- broader supported learning/effect data without inventing mechanics missing from the Legacy engine;
- continued visual, touch, keyboard and cross-browser polish;
- preserving old saved choices and links while recalculating them against current catalog data.

See [CHANGELOG.md](CHANGELOG.md) for released changes and the [public roadmap](docs/TASK_QUEUE.ru.md) for current and future work.

## 🐛 Report a problem

Found an incorrect stat, broken control, missing item, bad translation or browser issue? **Report it through GitHub Issues** and include the shortest steps that reproduce the problem.

[Open a bug report](https://github.com/bonaqu/Pandora-Saga-Simulator-remaked/issues/new?template=bug_report.yml)

## 📌 Project status

- **Legacy engine:** Pandora Saga Simulator 2.00
- **Remaked UI:** Modern 3.51
- **Hosting:** GitHub Pages
- **Project:** community preservation / modernization project

> This is an independent, unofficial project. It is not affiliated with the original Pandora Saga publisher or operators. Original Pandora Saga names, imagery and game assets belong to their respective rights holders. The recovered legacy simulator retains its historical attribution and permissions; new Remaked additions are covered separately by this repository's [LICENSE](LICENSE) and [NOTICE](NOTICE.md).

---

<p align="center"><sub>A useful Pandora Saga tool should not disappear just because its old host did.</sub></p>
