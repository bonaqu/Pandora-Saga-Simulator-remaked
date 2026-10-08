# Translation workbook

`translations.xlsx` is the only file a translator edits. It contains 2,920 data rows:

- 242 Modern interface labels;
- 2,678 game-term rows, including calculator labels/hints, races, classes, items, Souls and skills.

The yellow **Русский — заполнять здесь** (H) and green **English — редактировать здесь** (I) columns are editable. A–G are validated source data. Rows may be filtered or sorted; IDs, source columns, worksheet name and header row must not be changed. A blank Russian cell safely falls back to English. Published admin-record names take precedence over workbook aliases; edit those names in the admin record. Unpublished source records use H/I, without changing Legacy.

The 43 calculator result captions also have a generated administrative baseline in `calculator-results.ru.json`. Its values must match the stable IDs in column H; `tests/test_translation_workbook.py` checks this invariant. The source workbook is the base, while explicit published D1 edits take precedence at runtime; reverting an admin edit returns to the exact Excel value. Admin edits do not silently write back to Git, and future workbook updates do not erase admin overrides.

`ui.en.json` and `game-terms.ru.json` are machine-maintained source indexes. Do not enter translations there.

During every Pages build, `scripts/translation_workbook.py` validates the workbook and generates:

- the EN/RU Modern UI catalog;
- the approved Russian game-term map used by Modern equipment and Soul search;
- a downloadable copy at `/localization/translations.xlsx`.

CI refuses a workbook with missing/duplicate IDs, changed source values, formulas, unknown rows or broken UI placeholders. A failed build does not replace the currently published site.

For the no-terminal, step-by-step workflow, read [LOCALIZATION_FOR_BEGINNERS.ru.md](../docs/LOCALIZATION_FOR_BEGINNERS.ru.md).

Developer checks:

```powershell
python scripts/translation_workbook.py
npm run test:translations
python scripts/build_pages.py --output _site
npx playwright test tests/ui/localization.spec.mjs
```

When preserved Legacy data intentionally changes, run `npm run extract:terms` to refresh `game-terms.ru.json`, then regenerate the workbook source rows before release. Existing Russian values must only be carried forward when their stable ID and source text still match.
