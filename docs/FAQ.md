# FAQ

## What is this repository?

This project restores the legacy **Pandora Saga Simulator** that used to be available at `pansaga3.web.fc2.com/simu/`. The goal is preservation: keep the original calculator usable even though the old hosting is no longer reliable.

## Is this an official Pandora Saga project?

No. This is an independent preservation/restoration repository and is not affiliated with the original game publisher, operators or rights holders.

## Is the simulator really hosted only here?

Yes after the first bootstrap run. The restored HTML, JavaScript, CSS, data and image assets are committed into this repository and GitHub Pages serves those local files.

The recovery source is used only once to import a pinned snapshot. Runtime use of the simulator does not depend on FC2 or the recovery repository.

## Does it need a database?

No. The recovered simulator is client-side JavaScript. Character, skill, item and option data are shipped as local JavaScript/assets, so the calculator can run from static hosting.

## Do we need Cloudflare?

No for the restored simulator.

Cloudflare would only be useful if future features need a backend, for example:

- cloud-saved builds;
- user accounts;
- shared build IDs backed by persistent storage;
- an API;
- server-side analytics or rate limiting.

For the current preservation goal, GitHub Pages is simpler and free.

## Which languages are present?

The recovered client already contains language selection for:

- English;
- Japanese;
- Traditional Chinese.

Language selection can also be driven by the legacy `?lang=` query parameter supported by the simulator.

## Why is the interface so old-school?

Because the UI is intentionally preserved instead of redesigned. The purpose of this repository is to keep the original calculator behavior and layout available, not to replace it with a new calculator.

## What was changed from the recovered page?

Only hosting-related changes are applied automatically:

1. the recovered HTML becomes the repository root `index.html`;
2. obsolete FC2 footer/runtime injection is removed from the published HTML;
3. a local preservation `readme.txt` is provided so the original menu does not depend on the dead host;
4. provenance is recorded in `SOURCE.lock`.

The calculator/data JavaScript is not rewritten by the bootstrap process.

## What is `SOURCE.lock`?

A small provenance file generated during the one-time import. It records the source repository, exact commit and source path used for recovery so the restoration can be independently audited later.

## Keyboard shortcuts

The recovered original README documents these controls. Lowercase generally increases and uppercase decreases the corresponding value in the legacy simulator.

| Keys | Value |
|---|---|
| `+ / -` | Level |
| `q / Q` | Stamina |
| `w / W` | Strength |
| `e / E` | Agility |
| `r / R` | Dexterity |
| `t / T` | Inspiration |
| `y / Y` | Intelligence |
| `a / A` | Slash |
| `s / S` | Thrust |
| `d / D` | Cleave |
| `f / F` | Bash |
| `g / G` | Defense |
| `z / Z` | Shooting |
| `x / X` | Alchemy |
| `c / C` | Assassination |
| `v / V` | Trapping |
| `b / B` | Dodge |
| `h / H` | Benevolence |
| `j / J` | Blessing |
| `k / K` | Exorcism |
| `l / L` | Hymn |
| `n / N` | Elemental |
| `m / M` | Invocation |
| `, / <` | Darkness |
| `. / >` | Confusion |
| `/ / ?` | Racial |
| `\\ / _` | Horsemanship |

## The page loads but something is broken. What should I report?

Open an Issue and include:

- browser + version;
- selected simulator language;
- class/build values you entered;
- what you clicked;
- expected result;
- actual result;
- screenshot or console error if available.

The shortest reproducible sequence is more useful than a long description.

## Can the project be modernized later?

Yes, but preservation and modernization should stay separated. A modern UI can be added as another entry point while keeping the original restored calculator intact for comparison and regression testing.
