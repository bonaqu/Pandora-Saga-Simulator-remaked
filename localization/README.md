# Translation workbook

`translations.xlsx` is the only file a translator edits. It contains 1,764 rows:

- 147 Modern interface strings;
- 1,617 stable Legacy game terms, including races, classes, equipment, Souls, skill groups and all 211 actual skill names.

The yellow **Русский — заполнять здесь** column is the editable input. All other columns are validated source data. Rows may be filtered or sorted; IDs, source columns, worksheet name and header row must not be changed. A blank Russian cell safely falls back to English.

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
