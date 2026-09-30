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

The target server is [Pandora Saga: Weapons of Balance](https://pandorasaga-os.com/). Current calculations still use the preserved Legacy 2.00 engine; matching this server's current balance is a separate verification task, not an accuracy claim for every server-specific mechanic.

## ✨ Modern Mode

The main site opens in **Modern Mode**:

- refreshed Hybrid Light interface inspired by the original green simulator;
- English interface by default;
- Japanese and Traditional Chinese legacy data remain available;
- responsive application shell for desktop, ultrawide, tablet and phone screens;
- **Equipment Search** with name and level filters over the current compatible legacy options;
- **Equipment selection** in compact dropdowns beside the original fields, with item/Soul characteristics, deliberate desktop hover and a separate touch info action; review never equips a candidate;
- **Soul Search** for currently available sockets and compatible legacy Soul options;
- automatic local autosave with recovery after refresh;
- **Build Manager** for named local builds: save, load, rename, duplicate and delete;
- import/export using the simulator's existing serialized build code;
- **Compare Builds** for side-by-side stats from two saved builds, including neutral `Build B − Build A` deltas;
- keyboard-accessible stat help that explains what a displayed value represents and identifies its exact Legacy 2.00 output node;
- a keyboard skip link and native modal dialogs that keep focus inside and return it to the opener on Escape;
- an on-site **Updates** panel with separate Legacy/UI versions, release highlights and the full changelog;
- a compact sticky character summary and collapsible detail cards on phone screens;
- an installable PWA shell with reliable offline boot for both Modern and Legacy routes;
- a non-blocking update notice that lets you finish or save work before reloading;
- one EN/RU/JP/TW language panel: RU with English fallback, or original JP/TW game data with the English Modern shell;
- read-only item/Soul details in Modern search and a Share build link that restores the character in another browser;
- all Remaked autosaves and named builds stay local to the current browser in this release.

Compare Builds does not replace the calculator formulas. Both sides are evaluated through the preserved legacy calculation path, and the current active character is restored afterwards. Stat help intentionally does **not** invent detailed attribute/equipment/buff formula breakdowns where those components have not been verified.

**Open Modern Mode:**  
https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/

## In use

Real Modern Mode screens from UI `2026.09.11`, captured from the release candidate published with this update. The comparison uses two example builds with different races; names and calculations come from the preserved engine.

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

Translations are maintained in one [Excel workbook](localization/translations.xlsx): H (yellow) is Russian, I (green) is an editable English override. The original source columns stay read-only. See the [step-by-step Russian guide](docs/LOCALIZATION_FOR_BEGINNERS.ru.md). Approved translations appear throughout the Modern calculator, lists, search and skill descriptions. Blank game fields retain the selected source language; Legacy Mode stays unchanged.

The expanded workbook and Modern 3.00 are currently a draft branch, not a Pages release. Do not upload this branch's workbook alone to the old production code. After the matching code is merged, Pages validates and publishes workbook updates automatically.

## 🚧 What's coming next

The modernization roadmap includes:

- user-verified Russian game terminology;
- secure catalog administration for equipment, Souls, classes and character skills;
- compact desktop workflow and non-destructive Legacy FILE recovery;
- final visual, accessibility and cross-browser polish.

See [CHANGELOG.md](CHANGELOG.md) for released changes and current progress.

## 🐛 Report a problem

Found an incorrect stat, broken control, missing item, bad translation or browser issue? **Report it through GitHub Issues** and include the shortest steps that reproduce the problem.

[Open a bug report](https://github.com/bonaqu/Pandora-Saga-Simulator-remaked/issues/new?template=bug_report.yml)

## 📌 Project status

- **Legacy engine:** Pandora Saga Simulator 2.00
- **Published Remaked UI:** 2026.09.16; Modern 3.00 is an unreleased candidate
- **Hosting:** GitHub Pages
- **Project:** community preservation / modernization project

> This is an independent, unofficial project. It is not affiliated with the original Pandora Saga publisher or operators. Original Pandora Saga names, imagery and game assets belong to their respective rights holders. The recovered legacy simulator retains its historical attribution and permissions; new Remaked additions are covered separately by this repository's [LICENSE](LICENSE) and [NOTICE](NOTICE.md).

---

<p align="center"><sub>A useful Pandora Saga tool should not disappear just because its old host did.</sub></p>
