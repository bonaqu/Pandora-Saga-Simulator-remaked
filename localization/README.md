# Russian terminology workflow

`ui.en.json` is the complete English source catalog for the Modern interface. `ui.ru.json` contains reviewed Russian UI copy; omitted RU keys intentionally fall back to English.

`game-terms.ru.json` and `game-terms.ru.csv` are deterministic exports from the preserved Legacy 2.00 runtime. Each row keeps the stable Legacy path and JP/EN/TW source values. `ru_proposed` and `ru_approved` are intentionally blank: game-client terminology must not be guessed.

Workflow:

1. Build the site with `py scripts/build_pages.py --output _site`.
2. Run `npm run extract:terms` after Legacy data changes.
3. Edit only `ru_approved` in the JSON source after checking the official Russian client; use the CSV as the review worksheet.
4. Run `npm run extract:terms` again. Existing approved values are preserved only while their English source remains unchanged.
5. Run `npm run test:translations` to prove the checked-in JSON/CSV match the current Legacy runtime.

The exporter refuses to carry a non-empty approved Russian value across a changed English source string. Full game-term integration is a later step after user review.
