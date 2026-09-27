# History & provenance

## Original calculator

The recovered page identifies itself as **Pandora Saga Simulator 2.00**. The legacy HTML contains a displayed last-update timestamp of **2011-05-19 12:00**.

The original simulator was hosted at:

```text
http://pansaga3.web.fc2.com/simu/
```

The recovered README credits the original author as **z_anthurium** and contains the explicit redistribution note:

> “Feel free to modify and redistribute.”

No formal license file was found in the recovered source, so this repository preserves that attribution and permission statement instead of inventing a new license for the original work.

## Recovery source

A public preservation copy was found in:

```text
https://github.com/palver1/Pandora_saga_tools
```

The restoration workflow pins the source to commit:

```text
2a2417335f8dd8145c4558f663ca6a0746ca70c6
```

and imports only:

```text
ps_simulator/PSS_original/
```

The imported client contains the original HTML plus local CSS, JavaScript data/calculation files and image assets.

## Why pin a commit?

A moving dependency is bad for preservation. Pinning the recovery source means the initial import is reproducible and cannot silently change if the upstream preservation repository changes later.

After the first successful bootstrap, the restored files are committed directly into this repository. GitHub Pages then serves the local copy.

## Changes made by this repository

The bootstrap intentionally keeps calculator logic untouched. Its hosting-specific changes are limited to:

- rename the recovered main HTML file to `index.html` for GitHub Pages;
- remove obsolete FC2 footer/runtime injection from the published HTML;
- add `SOURCE.lock` with provenance;
- provide local project documentation and validation tooling.

The original source snapshot is therefore preserved as calculator code, while dead-host glue is removed from the runtime path.

## Repository timeline

- **2011-05-19** — timestamp embedded in the recovered simulator UI.
- **2025-06-29** — pinned recovery repository commit used by this project.
- **2026-09-27** — this GitHub Pages restoration repository was initialized.
