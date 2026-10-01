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

The workflow can also be started manually from **Actions → Deploy Pandora Saga Simulator → Run workflow**.

For Russian translations, upload the edited `localization/translations.xlsx` through GitHub's web interface. The same workflow validates the workbook, generates the runtime catalogs and deploys them. No local build or manual version bump is needed. Follow [the beginner's guide](LOCALIZATION_FOR_BEGINNERS.ru.md).

## Validation

The deployment blocks publication when required files are missing or when the entry point still contains known FC2 runtime injection. It also rebuilds the equipment, Soul and skill projections from the live Legacy runtime and rejects stale JSON or source fingerprints.

If an older Windows checkout fails the raw preservation manifest solely due
to CRLF line endings, run `node scripts/repair_legacy_line_endings.mjs` first
(read-only). Its opt-in `--repair --backup <absolute-directory-outside-Git>`
restores only bytes whose CRLF-to-LF conversion exactly matches the existing
SHA-256 manifest. It refuses real content differences and saves prior bytes.
Do not regenerate the preservation manifest or weaken its assertions.

The workflow also syntax-checks the core JavaScript files with Node.js and runs the complete browser contract suite before artifact upload.

The generated Base64/DEFLATE files are syntax-checked after extraction from their archived CodeRepos HTML pages. Browser contracts also reject startup exceptions and verify the preserved compressed File save/load path on both routes.

CI also runs bounded Chromium/Firefox/WebKit smoke for both routes, native modal keyboard behavior and mobile RU search. PNG installation/share assets have decoding/dimension and museum-isolation contracts. Release evidence and the immutable annotated tag policy are documented in [release acceptance](RELEASE_ACCEPTANCE.md).

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

Modern 3.00 uses an owner-approved Cloudflare Worker/D1 backend only for the
administrator CMS. The public frontend remains on GitHub Pages; player builds
are still local, not cloud saves. This does not move the site to Cloudflare.

The `Cloudflare Admin API` workflow verifies the backend, applies additive D1
migrations and deploys the existing Worker. It uses GitHub
`secrets.CLOUDFLARE_API_TOKEN` and `vars.CLOUDFLARE_ACCOUNT_ID` in the
`cloudflare-admin` environment. The `DB` binding and Cloudflare-only
`AUTH_PEPPER` must be retained. Deployments never recreate the administrator
or rotate the pepper. See [administrator operations](ADMIN_OPERATIONS.ru.md)
for login, draft/publication, capability boundaries and recovery.
