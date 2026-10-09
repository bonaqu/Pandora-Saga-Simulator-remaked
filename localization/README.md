# Localization source and admin editing

**All new translations are edited only through the protected admin UI** (RU, EN, JP and TW). This includes interface labels, skills, prerequisites, equipment and Souls, races, classes and stat labels. No spreadsheet editing or manual source commit is necessary for routine wording changes.

## Source and runtime

- `ui.en.json`: canonical list of 242 stable interface IDs and their original English source.
- `game-terms.ru.json`: canonical source index of 2,678 stable game IDs extracted from the preserved engine.
- `approved-translations.v1.json`: verified and immutable migration snapshot preserving all historical approved source translations (2,920 IDs), with sparse language-specific values.
- Cloudflare D1 `localization_overrides`: authenticated per-ID and per-locale changes, versioned and conflict-safe.
- Older D1 overrides and catalog revisions remain readable during compatibility cutover so manually published terms are not silently lost.

Modern's builder uses only these checked-in JSON sources; **Excel is not read, built, or published**. The last approved spreadsheet is still recoverable through earlier Git commits if a disaster recovery audit needs it, but it is not an editable or live translation source.

## How to translate

1. Log into the admin UI and open **Переводы · единый центр**.
2. Select the category (skills, equipment, Souls, races, classes, stats, other) and one of the four languages.
3. Search by stable ID, source text, or currently displayed translation. The editor shows the effective text and its origin.
4. Edit that text and click **Опубликовать**. An optimistic revision check prevents silently overwriting concurrent edits.
5. Use **Вернуть базовый текст** to return to the approved baseline; the new revision also suppresses historical admin overrides for that ID.
6. Check the public Modern site after publishing. If the API is temporarily unavailable, the built-in approved fallback continues to display existing wording.

Translation changes never touch the Legacy calculation engine, item stats, or saved build revision. HTML is not accepted as translation source. Multiline descriptions preserve newlines. Numeric game changes belong in the separate catalog editor.

## Validation

Run `python3 -m unittest discover -s tests` or the project's ordinary CI before publishing code changes. Both static and browser checks verify stable IDs, placeholders, mobile layout, and restore of old publications. The JSON snapshot is immutable; any future source refresh must be reviewed as a dedicated migration, never blindly overwrite existing D1 edits.
