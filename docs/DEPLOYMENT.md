# Deployment

## Hosting

The production site is published with **GitHub Pages** from GitHub Actions:

```text
https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/
```

Repository branch used by this project:

```text
bonaqu_projects
```

## First run

The first workflow run performs a one-time preservation import:

1. checks out this repository;
2. clones the public recovery repository at the exact commit recorded in the workflow;
3. sparse-checks out only `ps_simulator/PSS_original`;
4. copies the original HTML/CSS/JS/images into this repository;
5. renames the main HTML file to `index.html`;
6. strips obsolete FC2 footer injection from the published entry point;
7. writes `SOURCE.lock`;
8. commits the imported files back to `bonaqu_projects`;
9. validates the static site;
10. deploys the Pages artifact.

A `.source-imported` marker prevents future runs from re-importing over your local copy.

## Normal deployments

After bootstrap, any push to `bonaqu_projects` runs validation and redeploys GitHub Pages.

The workflow can also be started manually from **Actions → Deploy restored simulator → Run workflow**.

## Validation

The deployment blocks publication when required files are missing or when the entry point still contains known FC2 runtime injection.

The workflow also syntax-checks the core JavaScript files with Node.js.

## Updating the preserved source intentionally

Do **not** delete `.source-imported` casually. If a new preservation snapshot must replace the current one:

1. review the new upstream commit manually;
2. update the pinned commit in `.github/workflows/pages.yml`;
3. compare calculator/data files against the current copy;
4. delete `.source-imported` only after the comparison is understood;
5. run the workflow;
6. verify the live simulator and update `docs/HISTORY.md`.

This makes upstream changes explicit instead of silently modifying the preserved calculator.

## Wiki synchronization

The workflow includes a best-effort Wiki sync from `docs/wiki/` when the repository Wiki git remote is available. The canonical source remains the normal repository documentation, so a Wiki failure never blocks the simulator deployment.

## Custom domain / Cloudflare

A custom domain is optional. GitHub Pages works without Cloudflare.

If a custom domain is added later, Cloudflare can provide DNS, caching and optional security controls. That still does **not** require a database.

Cloudflare D1/KV/Workers would only be relevant if future features require server-side persistence or APIs.
