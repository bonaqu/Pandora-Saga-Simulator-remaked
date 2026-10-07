# Changelog

## Modern 3.21 — live Pandora Saga OS equipment catalog sync, 2026-10-07

<!-- release-notes:ru -->
### Кратко для игроков

- Актуализированы предметы по живым данным текущего Pandora Saga OS: используются серверные `/gamedata/items.json`, `souls.json` и английская локализация `strings.en.json`.
- Из серверного каталога рассматриваются только оружие, броня, щиты, плащи, бижутерия и Souls; ресурсы без слота и стрелы в синхронизацию не входят.
- **345 серверных записей** сопоставлены с существующими ID симулятора без повторного использования ID: 271 предмет экипировки/оружия и 74 Souls. Неоднозначные или неподтверждённые совпадения намеренно не применяются.
- Для безопасно сопоставленных записей обновляются актуальные EN/RU названия и описания, уровень, Soul slots, W/AC и те эффекты, которые модель симулятора умеет представить без догадок.
- Старые непереведённые английские названия вида `(Gradius)` нормализуются без внешних скобок. Уже сделанное вручную более свежее EN-переименование через админку имеет приоритет и не перезаписывается этой косметической нормализацией.
- Предметы, которые есть в симуляторе, но отсутствуют на текущем сервере, не удаляются и не изменяются: они могут относиться к будущему контенту.
- PEN, Range, базовый Attack Speed и Block сохраняются в замороженном серверном снимке, но не подменяются другими параметрами: в текущей модели каталога для них нет отдельных рассчитываемых полей.
<!-- /release-notes:ru -->

<!-- release-notes:en -->
### Player highlights

- Refreshed the item catalog against Pandora Saga OS live `/gamedata` sources.
- Only equippable weapons, armor, shields, cloaks, accessories and Souls are eligible; resources and arrows are excluded.
- **345 server records** are mapped one-to-one to existing simulator identities: 271 equipment/weapon records and 74 Souls. Ambiguous matches are deliberately left untouched.
- Safely matched records receive current EN/RU names/descriptions and supported mechanical values, while future simulator-only items remain intact.
- Legacy untranslated English names wrapped only in unnecessary outer parentheses are normalized without overwriting a later manual admin rename.
- PEN, Range, base Attack Speed and Block remain preserved in the frozen source snapshot rather than being guessed into unrelated simulator fields.
<!-- /release-notes:en -->

### Project and delivery details

- The exact 2026-10-07 live JSON inputs and the explicit one-to-one identity map are retained under `admin-api/data/` for reproducibility and review.
- D1 migration `0006_pandora_os_live_item_sync.sql` is generated deterministically during deployment and advances the catalog to revision/impact revision 82.
- Existing revision-81 overrides are JSON merge-patched, so unrelated manual admin fields survive the bulk sync; bracket-only normalization additionally refuses to overwrite a later manual English rename.
- Supported server effects are converted only through verified typed-stat mappings. Unknown proc mechanics remain in the frozen source snapshot and retain the existing calculation tokens.
- Regression coverage validates identity uniqueness, category restrictions, codec compilation, D1 statement limits, revision-history preservation and merge behavior.

## Modern 3.20 — Pandora Saga OS item data sync, 2026-10-06

<!-- release-notes:ru -->
### Кратко для игроков

- Сверены с предоставленной таблицей Pandora Saga OS и обновлены **180 уже существующих записей** симулятора: 111 оружий/предметов экипировки и 69 Souls.
- Для найденных записей добавлены русские названия и описания из таблицы; английские названия и описания приведены к значениям из той же таблицы.
- Исправлены характеристики, которые реально поддерживает движок симулятора: Soul slots у 103 предметов, уровень и W у Heavy Crossbow, STR у Bounty Lance, Magic ATK у указанных wand/staff, шанс оглушения Iron Staff и Dodge у Soul of Cerberus.
- Изменения механики публикуются отдельной ревизией игровых данных 79, поэтому сохранённые билды ревизии 78 корректно считаются более старыми, а сама историческая ревизия 78 остаётся неизменной.
- **Healer Soul** из таблицы не добавлялся: среди уже существующих Souls симулятора не найдено однозначного соответствия с тем же эффектом, а эта синхронизация намеренно не создаёт новые предметы по догадке.
- PEN, Range, базовый Attack Speed и Block из таблицы не подменялись другими параметрами: в текущей модели предметов симулятора для них нет отдельных рассчитываемых полей. Эти значения потребуют отдельного расширения движка/карточек, если мы захотим поддерживать их в будущем.
<!-- /release-notes:ru -->

<!-- release-notes:en -->
### Player highlights

- Synchronized **180 existing simulator records** with the supplied Pandora Saga OS workbook: 111 weapons/equipment items and 69 Souls.
- Added the supplied Russian names/descriptions and aligned English names/descriptions with the same reference.
- Corrected mechanics that the current simulator actually represents, including 103 Soul-socket counts, Heavy Crossbow level/W, Bounty Lance STR, selected wand/staff Magic ATK, Iron Staff stun chance, and Soul of Cerberus Dodge.
- Mechanical changes are released as game-data revision 79, preserving revision 78 as a real historical snapshot for saved builds.
- Healer Soul was not created because no unambiguous existing Soul with the same effect was found.
- PEN, Range, base Attack Speed and Block were not mapped onto unrelated stats because the current item engine has no dedicated per-item fields for them.
<!-- /release-notes:en -->

### Project and delivery details

- The release is stored as a checksum-verified immutable payload and materialized deterministically into D1 migration `0005_pandora_os_item_sync.sql` immediately before migration application.
- The migration merges the 180 matched item identities into the current catalog snapshot atomically and advances both `revision` and `impactRevision` to 79.
- The preserved Legacy runtime remains untouched, so historical catalog revisions continue to compile against the same source fingerprint.
- Regression coverage validates all 180 edits through the real catalog codec and checks the key mechanical corrections before deployment.

All notable player-facing changes to **Pandora Saga Simulator Remaked** are recorded here.

## Modern 3.19 — impact-aware saved builds and simpler Builds UI, 2026-10-06

<!-- release-notes:ru -->
### Кратко для игроков

- Из Менеджера билдов убрана ручная кнопка «Обновить текущий билд»: каталог уже обновляется автоматически, поэтому отдельное действие больше не требуется.
- Блок игровых данных стал компактнее и использует понятную игроку строку вида `Игровые данные: версия 78 · обновляются автоматически`; подсказка объясняет простыми словами, что сайт обновляет данные сам и предупредит, если изменение может затронуть сохранённый билд.
- Обычная ревизия каталога и ревизия, влияющая на билд, теперь разделены. Переименование предмета/души/навыка, изменение описания или перевод сразу публикуются в интерфейсе, но **не** делают сохранённый билд устаревшим.
- Красная пунктирная метка «Возможно устарел» появляется только после изменений, способных повлиять на расчёт или совместимость: характеристик, эффектов, сокетов, требований, совместимости, class progression, skill timing/requirements и других engine-facing данных.
- Загрузка реально устаревшего билда по-прежнему безопасно пересчитывает его на актуальном каталоге; при несовместимости исторический билд сохраняется без повреждения.
<!-- /release-notes:ru -->

<!-- release-notes:en -->
### Player highlights

- Removed the manual “Update current build” control because catalog updates are automatic.
- The Builds manager now uses a player-friendly automatic game-data status and a plain-language hint instead of internal catalog/revision terminology.
- Catalog publication revision and build-impact revision are tracked separately, so names, descriptions and translations update normally without falsely marking saved builds stale.
- The stale warning is reserved for changes that can affect calculations or compatibility.
<!-- /release-notes:en -->

### Project and delivery details

- D1 migration `0004_catalog_impact_revision.sql` adds a monotonic `impact_version` to the catalog head and immutable revisions.
- Worker-side impact projection strips display-only fields before comparing effective runtime catalog data.
- Existing installations conservatively treat the migration-time head as the initial impact baseline; all later publications are classified precisely.
- Pages consumes `impactRevision` from both the lightweight head and immutable snapshots, with conservative fallback for a rolling deploy against an older Worker.
- Regression coverage proves text-only publications do not produce stale-build UI while mechanical publications still do.

## Modern 3.18 — automatic live updates and saved-build freshness, 2026-10-06

<!-- release-notes:ru -->
### Кратко для игроков

- Открытый сайт теперь сам проверяет новые версии приложения и опубликованного игрового каталога; ручное обновление страницы или кнопка «Обновить текущий билд» для обычного сценария больше не нужны.
- Перед автоматическим переключением PWA на новую версию текущий прогресс принудительно сохраняется. Если сохранение не удалось, автоматическая активация обновления блокируется.
- При обновлении service worker каждая открытая вкладка отдельно сохраняет свой текущий прогресс перед перезагрузкой.
- Изменения предметов, душ, классов, расовых и обычных навыков, опубликованные через админку, подхватываются текущим персонажем автоматически после обнаружения новой ревизии.
- Сохранённые билды со старой ревизией каталога отмечаются красной пунктирной рамкой и меткой «Возможно устарел». При загрузке такой билд безопасно пересчитывается на актуальном каталоге; при несовместимости сохраняется и открывается историческая версия.
- Сравнение сохранённых билдов при наличии сети использует актуальную опубликованную ревизию, а офлайн сохраняет возможность работать с уже закэшированными историческими ревизиями.
<!-- /release-notes:ru -->

<!-- release-notes:en -->
### Player highlights

- Open pages now check automatically for new app versions and published catalog revisions; normal use no longer depends on manually reloading or pressing “Update current build”.
- Current progress is flushed before automatic PWA activation. If saving fails, the update is not activated.
- Every open tab saves its own state before a service-worker controller reload.
- Published admin changes to equipment, Souls, classes, racial data and skills are adopted automatically by the active character.
- Named builds pinned to an older catalog are highlighted as possibly outdated and are safely upgraded when loaded; incompatible builds retain their historical revision.
- Saved-build comparison uses the current published catalog online and cached pinned revisions offline.
<!-- /release-notes:en -->

### Project and delivery details

- The public Worker exposes a lightweight `/api/catalog/head` revision beacon so Pages can poll frequently without downloading the full catalog.
- Production Pages polls the catalog head only while visible/online and downloads a full snapshot only after the revision changes.
- PWA update checks run on page load, visibility/online recovery and a short interval; service-worker registration bypasses the HTTP cache.
- Versioned cache generations and generation-scoped cache reads from Modern 3.17 remain intact.
- Translation-workbook row/schema compatibility is unchanged; Excel translation edits still publish through the normal Pages build/deploy and are then picked up by the same PWA update path.
- Legacy formulas and the numeric build payload layout remain unchanged.

## Modern 3.17 — centered reset and PWA update safety, 2026-10-06

<!-- release-notes:ru -->
### Кратко для игроков

- Текст кнопки `Сброс` в блоке снаряжения теперь выровнен строго по центру без изменения её размера или логики.
- Обновления PWA теперь переключаются между версиями целиком: активная страница не смешивает HTML одной версии с JS/CSS из другого кэша.
- Service worker читает файлы только из собственного версионного cache, поэтому одновременно существующие active/waiting-кэши не могут подмешивать друг другу assets.
- Precache новой версии принудительно перепроверяет файлы мимо браузерного HTTP-cache, а изменение самого PWA-worker теперь тоже меняет cache-generation.
- Если активация нового service worker зависла, кнопка перезагрузки снова становится доступной для повторной попытки вместо вечного disabled-состояния.
<!-- /release-notes:ru -->

<!-- release-notes:en -->
### Player highlights

- The Equipment reset caption is now centered without changing its size or behavior.
- PWA updates now keep HTML and static assets on one cache generation until the new service worker is activated.
- Service workers read only from their own versioned cache, preventing active/waiting cache cross-contamination.
- New precaches revalidate assets past the browser HTTP cache, and worker-only logic changes now rotate the cache generation too.
- A stalled worker activation re-enables Reload so the user can retry safely.
<!-- /release-notes:en -->

### Project and delivery details

- Controlled navigations use the active worker's cached `index.html` / `legacy/index.html` until the bootstrap activates the next worker and reloads.
- All cache reads are scoped through `caches.open(CACHE_NAME)`; no runtime lookup spans multiple PWA cache generations.
- Precache requests use `cache: 'reload'`, and the service-worker source template participates in the generated cache fingerprint.
- Regression tests cover generation-atomic updates, worker-only cache rotation, offline reload after an update, retry after stalled activation, and centered reset text.
- Calculator formulas, source arrays, item IDs, callbacks, translations and build serialization are unchanged.

## Modern 3.16 — production polish after RU layout review, 2026-10-06

<!-- release-notes:ru -->
### Кратко для игроков

- Исправлена кнопка сброса снаряжения: при временном рассинхроне PWA-кэша больше не может показываться сырой ключ `equipment.reset`; всегда используется человекочитаемый `Reset / Сброс / リセット / 重設`.
- Ширина названий слотов снаряжения уменьшена с 80 до 76 px: `Перчатки` всё ещё помещается полностью, но лишнее пустое пространство сокращено.
- `Сопр АНООМДУХ` исправлено на `Сопр АНОМДУХ`.
- Новые hover-подсказки в «Результатах расчёта» теперь используют обычное сплошное подчёркивание, как существующие Legacy-подсказки, а не пунктир.
- Сохранены исправления Modern 3.15: трёхзначные итоги базовых характеристик, русские подписи персонажа/навигации, переводы Equipment и компактные кнопки.
<!-- /release-notes:ru -->

<!-- release-notes:en -->
### Player highlights

- Equipment reset now has a safe locale fallback and can no longer expose the raw `equipment.reset` key during a mixed PWA-cache update.
- Desktop/tablet Equipment slot-label width is tightened from 80px to 76px while keeping long RU labels visible.
- Corrected the RU anomalous-spirit resistance abbreviation.
- Newly added calculated-result hints now match the existing solid Legacy help underline.
<!-- /release-notes:en -->

### Project and delivery details

- Reset fallback is resilient to a stale `locales.js` paired with a newer component script.
- Regression coverage explicitly removes the RU reset key at runtime and verifies the fallback label.
- Tooltip-style coverage compares newly added title-only hints with the established `.help` underline contract.
- Translation remains workbook-driven; no calculator formulas, source arrays, item IDs, callbacks or build serialization are changed.

## Modern 3.15 — Russian result help and compact layout polish, 2026-10-06

<!-- release-notes:ru -->
### Кратко для игроков

- Уточнены русские подписи нескольких сопротивлений в «Результатах расчёта»: `Сопр КРУРОН`, `Сопр ФИЗ`, `Сопр УРОНСПИН`, `Сопр АНОМТЕЛ` и `Сопр АНООМДУХ`.
- Для `ОЗ`, `ОМ`, `Точность`, `Уклонение`, `Откат`, `МаксАТК` и `ЗАЩИТА` добавлена такая же hover-подсказка, как у уже поясняемых коротких показателей.
- Переводы персонажа и верхней навигации уточнены: `Раса`, `Пасивн`, `Класс`, `КЛАСС`, `УМЕНИЯ`, `АТАКА`, `ЗАЩИТА`, `УСИЛЕНИЯ`; внутри окна SKILL исходная подпись `Skill` отображается как `Умения`.
- В снаряжении `Призма` переименована в `Радуга`, `Серьги` в `Серьга`, `Доспех` в `Броня`, `Ботинки` в `Обувь`; кнопка сброса стала компактной и переводится как короткий `Reset / Сброс / リセット / 重設`.
- Исправлено обрезание трёхзначных итогов базовых характеристик вроде `→ 110`; узкий бейдж стоимости очков получил отдельную компактную колонку.
- Подписи слотов снаряжения получили достаточно фиксированного пространства, чтобы длинные названия вроде `Перчатки` не обрезались.
<!-- /release-notes:ru -->

<!-- release-notes:en -->
### Player highlights

- Refined several RU calculated-result resistance labels and added hover help for seven compact stats.
- Updated RU character and calculator-navigation terminology.
- Renamed several RU equipment labels and shortened the reset action in all four UI locales.
- Three-digit derived base-stat totals and longer equipment slot labels now fit without clipping.
<!-- /release-notes:en -->

### Project and delivery details

- New result hints are exported as calculator-hint rows and remain translation-workbook driven.
- The Equipment reset caption is now a Modern UI locale string so EN / RU / JP / TW can use the same fixed compact button safely.
- Layout tests cover three-digit base-stat totals, compact point-cost badges, reset-button width and non-clipping slot labels across all UI locales.
- Legacy calculations, source arrays, item IDs, callbacks and build serialization are unchanged.

## Modern 3.14 — Russian Equipment terminology and compact stat labels, 2026-10-06

<!-- release-notes:ru -->
### Кратко для игроков

- Исправлено обрезание русских сокращений базовых характеристик: `ВЫН`, `СИЛ`, `ПРВ`, `ЛВК`, `СД` и `ИНТ` теперь полностью помещаются рядом с числовыми полями.
- Уточнены короткие русские подписи в «Результатах расчёта» и «Эффектах»: сопротивления приведены к более единообразному виду, `МагАТК` сокращено до `МАТК`, а перезарядка — до `Откат`.
- Блок Equipment русифицирован: названия слотов, физический/магический тип, стихии, Soul, сброс снаряжения и категории оружия/экипировки теперь имеют русские подписи.
- Категории в Equipment picker также используют эти переводы, поэтому названия типов оружия совпадают в исходном селекторе, фильтре и выпадающем поиске.
<!-- /release-notes:ru -->

<!-- release-notes:en -->
### Player highlights

- Russian base-stat abbreviations no longer clip beside their numeric fields.
- RU calculated-result and effect labels received the requested shorter, more consistent terminology.
- The Equipment area now has Russian slot, modifier, element, Soul, reset and equipment-category labels.
- Equipment picker category headings and filters use the same translated category names.
<!-- /release-notes:en -->

### Project and delivery details

- Translation changes remain presentation-only in `localization/translations.xlsx`; Legacy values, formulas, item IDs and build serialization are unchanged.
- The Equipment search term resolver now recognizes category placeholder IDs and the `soul.0` placeholder, allowing workbook translations to reach picker headings without rewriting native options.
- Regression coverage checks Russian base-stat geometry, exact workbook terminology, translated Equipment controls/categories and immutable calculator state.

## Modern 3.13 — Russian calculator terminology and hover help, 2026-10-06

<!-- release-notes:ru -->
### Кратко для игроков

- Базовые характеристики получили согласованные русские сокращения: `ВЫН`, `СИЛ`, `ПРВ`, `ЛВК`, `СД`, `ИНТ`.
- В «Результатах расчёта» переведены основные боевые, защитные, скоростные, элементальные и служебные показатели, включая `ОЗ`, `ОМ`, `Точность`, `Крит УРОН`, `Ближ УКЛОН`, `Дальн АТК УКЛОН`, дистанцию ближней/дальней атаки и сопротивления.
- Для показателей, где короткой подписи недостаточно, добавлены отдельные русские hover-подсказки: например, снижение физического/магического/критического урона, уклонение, дальность, скорость и сопротивления.
- Все 25 групп навыков получили русские названия, а четыре составных эффекта Enchantment / Sage's Song — короткие русские подписи и отдельные пояснения при наведении.
<!-- /release-notes:ru -->

<!-- release-notes:en -->
### Player highlights

- Base attributes now use the requested compact Russian abbreviations in RU mode.
- Calculated results have reviewed Russian labels for combat, defense, evasion, range, speed, elemental resistance and utility stats.
- Compact labels can now carry independent translated hover help, so explanatory Russian text does not have to be baked into the visible abbreviation.
- All 25 skill branches and four qualified Enchantment / Sage's Song effect labels now have reviewed Russian display text.
<!-- /release-notes:en -->

### Project and delivery details

- These changes are display-only and live in `localization/translations.xlsx`; Legacy arrays, formulas, numeric results, build serialization and source-language data are unchanged.
- Qualified effect labels and their `title` help are now exported as separate translation IDs, matching the existing calculator-label / calculator-hint model used by other Legacy help text.
- Browser coverage verifies representative base stats, result labels, skill groups and qualified-effect hover help while asserting that translated display leaves do not mutate Legacy calculator state.

## Modern 3.12 — clearer equipment search and keyboard picking, 2026-10-05

<!-- release-notes:ru -->
### Кратко для игроков

- Поиск больше не оставляет пустую область без объяснения: при нулевом результате показывается понятное сообщение, подчёркнутая ссылка `Сбросить фильтр` и количество найденных/совместимых предметов.
- В выпадающем Equipment picker нативные разделители типов оружия и экипировки теперь отображаются как явные визуальные заголовки групп; для списков с несколькими типами появился компактный фильтр `Все типы`.
- Keyboard UX picker проверен и закреплён: стрелки переходят между результатами, Enter выбирает сфокусированный предмет, а Escape одним нажатием закрывает picker даже при открытом preview.

- Исправлена ширина поля поиска в picker: если для текущего слота нет фильтра по типу, поиск теперь занимает всю доступную ширину вместо укороченной колонки.
- Локализация Modern снова сведена в единый источник: `Сбросить фильтр`, `Все типы`, `Фильтр по типу` и `Автосохранение включено` перенесены в `translations.xlsx` и заполнены для EN / RU / JP / TW; незаполненные JP/TW строки Modern безопасно используют английский fallback.
- По приложенному RU/EN списку навыков добавлены русские названия и описания для 205 надёжно сопоставленных Legacy-умений; 198 английских описаний приведены к тексту из предоставленного списка. Требования, MP, тайминги, формулы, эффекты и ID навыков не менялись.
<!-- /release-notes:ru -->

<!-- release-notes:en -->
### Player highlights

- Search no longer leaves an unexplained blank area: zero-result states show a clear message, an underlined `Reset filter` action and the current compatible/result count.
- Equipment picker now renders the Legacy weapon/equipment type separators as clear visual group headings, with a compact `All types` filter when more than one type is available.
- Picker keyboard UX is explicitly preserved and covered: arrows move between results, Enter selects the focused item, and a single Escape closes the picker even when an item preview is open.

- Fixed picker search width: when the current slot has no type filter, the search field now uses the full available width instead of staying in a shortened grid column.
- Recent Modern strings are back in the single translation source: `Reset filter`, `All types`, `Filter by type` and `Autosave enabled` now live in `translations.xlsx` with EN / RU / JP / TW values; untranslated JP/TW Modern strings safely fall back to English.
- Using the supplied RU/EN skill list, Russian names and descriptions were added for 205 confidently matched Legacy skills, and 198 English descriptions were normalized to the supplied text. Requirements, MP, timing, formulas, effects and skill IDs were not changed.
<!-- /release-notes:en -->

### Project and delivery details

- Type grouping is presentation-only and is derived from the existing Legacy `+-----` category placeholders. Placeholder rows are not reinterpreted as equipment and the underlying option IDs, compatibility list, selection callbacks and calculation engine remain unchanged.
- Empty-state reset only clears Modern search/type/level filters and rerenders the current adapter options; it does not mutate the character.
- Existing native-button keyboard semantics remain in place for Enter, while the already-present arrow navigation is covered by browser tests and picker Escape is captured before preview disclosure handling.
- Generated read-only data projections now receive their `remaked_ui` metadata from the same top CHANGELOG release during Pages build, so moving from 3.11 to 3.12 cannot leave projection metadata on the previous UI version.
- Picker controls now switch to a single-column grid whenever the type selector is hidden or absent, so Equipment and Soul pickers do not reserve empty space for a non-existent filter.
- The translation workbook now accepts sparse JP/TW values only for Modern UI rows while keeping Legacy game-source JP/TW columns immutable. The build publishes four UI locale catalogs with English fallback.
- Stored JP/TW Modern locale now restores the matching retained game language after reload; RU continues to use the EN game source underneath the Russian overlay.
- Skill text import is presentation-only: six Legacy skills without a reliable counterpart in the supplied workbook (`Slash`, `Bash`, `Misdirection`, `Ossify`, `Physical Barrier`, `Magical Barrier`) were deliberately left unchanged rather than guessed.

## Modern 3.11 — automatic updates, cleaner Equipment and faster delivery, 2026-10-05

<!-- release-notes:ru -->
### Кратко для игроков

- В Equipment убраны две лишние верхние кнопки поиска экипировки и Souls: поиск не удалён и по-прежнему открывается прямо из каждого слота оружия, щита, брони и каждой доступной ячейки Soul.
- Возвращён мягкий полупрозрачный фон стоимости характеристик 2P/3P и отполированы компактные поля персонажа, верховая езда и заголовки навыков; исправлена гонка hover-preview при автоматической прокрутке списка предметов.
- Новые версии сайта теперь сами обнаруживают и активируют свежий Service Worker. Обычное открытие страницы, F5, возврат во вкладку или восстановление сети подхватывают новый кэш без обязательного Ctrl+F5; автосохранение и офлайн-режим сохранены.
- Окно «Что нового» и номер Remaked UI теперь собираются из верхнего релиза CHANGELOG, поэтому версия сайта и последние изменения больше не должны расходиться вручную.
- Публикация проекта стала заметно быстрее: проверки распараллелены без удаления покрытия, WebKit и Firefox используют закреплённый Playwright image, Chromium в headless CI не скачивает лишний полный браузер, а проверенный merge повторно не гоняет уже пройденные тяжёлые проверки.
- Версия в шапке теперь собрана в единый двухсекционный бейдж: заметный `REMAKED UI` и более спокойный `Legacy Engine`. Обе цифры берутся из общей release metadata, а прежний дублирующий номер версии справа сверху удалён.
- Шапка получила финальную лёгкую полировку: Legacy-сегмент версии стал мягче и чуть теплее по цвету, статус автосохранения отделён от навигации как компактный индикатор, языки и установка немного компактнее, а служебная подпись под временным hero-артом убрана.
- Исправлена стабильность шапки при переключении языка: ширины верхних контролов, нижней навигации, Builds/Compare и статуса автосохранения больше не пересчитываются от длины перевода. Статус автосохранения приведён к обычному радиусу интерфейса, `LEGACY ENGINE` отображается прописными буквами, а version badge опущен на 2 px.
- Статус автосохранения переработан в плоский встроенный индикатор без отдельной рамки: после восстановления несколько секунд показывается `Автосохранение восстановлено`, затем статус автоматически становится постоянным `Автосохранение включено`, не меняя ширину нижней панели.
<!-- /release-notes:ru -->

<!-- release-notes:en -->
### Player highlights

- Equipment no longer shows duplicate top-level Equipment Search and Soul Search actions. Search is still available where it belongs: inside every equipment picker and every visible Soul socket.
- The soft translucent 2P/3P stat-cost treatment is restored, compact character/riding/skill alignment is polished, and an item-preview hover race caused by automatic picker scrolling is fixed.
- Fresh deployments now discover and activate the new Service Worker automatically. Normal navigation, F5, returning to the tab or coming back online can adopt the new cache without requiring Ctrl+F5; autosave and offline behavior are preserved.
- The on-site “What’s new” panel and Remaked UI version are now generated from the latest CHANGELOG release, so release notes and the visible version no longer need separate manual synchronization.
- Delivery is substantially faster without dropping test coverage: browser work is sharded, WebKit and Firefox use a pinned Playwright image, headless Chromium avoids the unnecessary full browser download, and trusted merges reuse the exact successful PR validation instead of repeating it.
- The header now uses one joined two-part version badge: a prominent `REMAKED UI` segment and a quieter `Legacy Engine` segment. Both values come from shared release metadata, and the duplicate version text in the top-right controls is removed.
- The header received a final light polish: the Legacy version segment is softer and slightly greener, autosave is separated from navigation as a compact status indicator, language/install controls are a little tighter, and the temporary hero-art attribution caption is removed.
- Header layout is stable across language switches: top controls, lower navigation, Builds/Compare and autosave no longer resize from translated label length. Autosave now uses the interface's regular corner radius, `LEGACY ENGINE` is uppercase, and the version badge sits 2 px lower.
- Autosave is now a flat integrated status cell without a separate border: after recovery it briefly shows `Restored autosave`, then automatically settles to the persistent `Autosave enabled` state without resizing the lower bar.
<!-- /release-notes:en -->

### Project and delivery details

- PR #46 polished stat costs, riding alignment and skill headers; PR #47/#48 restored the intended translucent stat-cost background and kept the newer centering.
- PR #48/#49 restructured Feature CI and Pages into parallel, exact-head-validated paths. The original roughly 16-minute Feature CI and roughly 15-minute deploy were reduced to the low single-digit-minute range without deleting the aggregate safety gate.
- PR #50 removed only the duplicate Equipment/Soul discovery toolbar. Slot-level search, compatibility rules, formulas, catalogs, saves and Legacy behavior were retained.
- PR #52/#53 measured Playwright setup instead of blindly caching it: WebKit moved to the pinned `mcr.microsoft.com/playwright:v1.63.0-noble` image, Chromium headless jobs use `--only-shell`, and duplicate trusted-deploy projections were removed. A measured Feature CI run reached about 2m31s and the normal trusted Pages path about one minute of execution.
- The same work exposed and fixed a real Equipment item-preview scroll/hover race rather than masking it with larger test timeouts.
- PR #55/#56 fixed stale PWA assets after deploy. Update checks bypass the HTTP cache for the worker script, new workers activate safely, first install is not mistaken for an update in WebKit, and fresh navigation HTML can bridge users still controlled by the pre-fix cached runtime.
- Public documentation was reorganized around player help, project status, architecture, history and roadmap. Maintainer-only administrator instructions were removed from the public documentation set and preserved separately for the project owner. Feature CI now rejects user-facing runtime/UI changes that omit a CHANGELOG update.
- The header version display was consolidated into a single split badge sourced entirely from `PandoraRemakedVersion`; the redundant top-right version label was removed. A lightweight source-level test guards the dynamic wiring without adding browser-suite runtime.
- Follow-up header polish keeps the same structure and version wiring while softening the Legacy segment, styling autosave as a status chip, tightening desktop language/install controls and removing the temporary artwork caption.
- A second header follow-up removes locale-switch layout jitter by using stable desktop tracks for utility links, install/language controls, Modern tabs and Builds/Compare, plus a fixed desktop autosave status track. The status chip returns to the site's normal 7px radius; the Legacy badge label is uppercase and the badge is lowered by 2px.
- Firefox smoke validation now mirrors the pinned-container approach already used for WebKit, with the container home fixed explicitly for Firefox. This avoids both the repeated browser download that could consume the 10-minute timeout and the container launch failure caused by a mismatched HOME owner.
- Autosave status styling was flattened into the navigation surface with a subtle tinted cell, state dot and divider. Startup recovery now uses a 4.5-second transient restored message before settling to an enabled state; any newer autosave/error status cancels that timer so stale recovery text cannot overwrite it.

## Modern 3.10 — conditional active-skill profiles, candidate

- Existing active skills can have bounded class/level/branch variants without
  duplicate skill slots. The most specific learned variant supplies the same
  localized text, MP and timing to the learned view and tooltip. Old pins keep
  their original projections; interrupted probes restore state transactionally.
- The private editor shows one selected form, clear conditions and current/
  preview values. Base fields and other variants stay independent; ambiguous
  conditions are rejected before publication. Deleting a variant is draft-first.
- An offline reviewed dataset contains 17 existing identities / 37 definitions,
  including future level-50 variants. Minstrel's Song remains unresolved. This
  is not automatic publication or a claim of verified new combat formulas;
  native duration/effects remain explicitly retained.
- Modern drops only the obsolete hidden FC2 hosting counter. Legacy is untouched.
- Local validation uses one risk-related Chromium group, not three full browser
  suites. Production deployment/data publication and live acceptance are pending.

## Modern 3.09 — native passive replacement, 2026-10-04

- Fourteen identified source passives can explicitly replace their intrinsic
  contribution instead of stacking new numbers on top. Empty replacement
  disables that contribution. Old records without the mode keep their behavior.
- The editor separates add/replace, explains native numbers and dependencies,
  and shows current values, private draft and server preview separately.
  Unsupported native effects are labelled add-only; no arbitrary formulas.
- Replacement learning is isolated from a preceding native row, fixing a real
  Paladin Jousting gate leak. Visible learned state and numeric bonus agree.
- Modern-only build guards preserve the original formulas and stop on source
  drift. Museum files, source ordering, old pins and maximum level 55 stay intact.
- This is editing support, not a claim that all current server skills have been
  reconciled. No synthetic test passive is published to the production catalog.

## Modern 3.08 — custom skill learning, 2026-10-04

- The private skill editor can keep original learning or explicitly set classes,
  exact/advanced-class scope, minimum level and required branch points. Current
  values, server preview and private draft remain separate from publication.
- Actual source icons, learned status and additional passive bonuses use those
  conditions even with SKILL closed. Public RU/EN requirements show the real
  thresholds, not stale template text. Six labels are editable in Translations.
- Original source ordering, formulas and old catalog pins stay intact. Loading
  another build rebuilds derived learned lists instead of retaining stale icons.
- Read-only reconciliation covers the current source's 28 classes and 232 rows;
  future skills stay. Resist Ice/Lightning corrections (35/41 points and current
  RU/EN names/descriptions) are published on their two existing identities in
  catalog revision 22; historical revisions 20 and 2 remain immutable. They were
  deliberately published after deployment, not automatically seeded. Remaining
  variants, intrinsic passives and combat effects are not claimed verified.
- Release CI, exact deployed artifact, actual private-editor login, real skill
  allocation, old/current build pins and fresh/offline recipients passed.
  Desktop and mobile-sized published UI were reviewed; maximum level stays 55.

## Modern 3.07 — current racial data, 2026-10-04

- All 18 current racial records have verified RU/EN names/descriptions and typed
  effects. Myrine gains +5 critical chance; Stone Skin and Magic Resistance
  change only incoming physical/magic damage, never critical chance.
- Separate flat ATK +10 and general ATK +12%, weapon-specific conditions and
  independent critical chance/resistance/damage fields; old pinned revisions
  retain their original calculations. Maximum level remains 55.
- Racial editor shows current values, weapon conditions and server preview;
  JOB shows the selected description and explicit unsupported combat/range limits.
- Workbook H/I contains current names for six races and 18 passives; protected
  source columns, other translations and the museum remain unchanged.
- All five inspectors update visibility/accessibility state synchronously when
  clicked; immediate Escape no longer races an observer refresh in WebKit.
- Public catalog revision 20 contains the 18 verified current records. Historical
  revision 2 stays immutable; existing builds require explicit catalog adoption.
  Code/data publication and real public desktop/touch/offline acceptance passed.
  Deploying code does not automatically overwrite an administrator's records.

## Modern 3.06 — complete skill descriptions, 2026-10-04

- Skill descriptions escape the scrolling SKILL panel and use an opaque,
  viewport-bounded surface. Complete long descriptions remain scrollable.
- Delayed mouse hover, keyboard focus/Enter/Space/Escape and touch toggling;
  panel switching, source redraw and scrolling clean up the open description.
- Same native text, numbers and calculation state; Legacy and game data unchanged.
- Feature and deployment CI pass. Exact published files and actual public
  PC/touch/offline descriptions are verified; current-data/editor/banner tasks
  remain queued separately. See the release ledger for evidence and limits.

## Modern 3.05 — all five floating inspectors, 2026-10-04

- JOB, SKILL, ATTACK, DEFENSE and BUFF now use the same non-modal popup behavior.
  Opening a panel no longer pushes the calculator down. Repeat-tab, Escape
  (inside the panel or on its opener) and the close button dismiss it; changing
  tabs leaves only one panel open and restores the source tab state.
- Opaque surfaces, viewport-bounded width/height and internal scrolling retain
  the original fields, selectors, buff handlers and build calculations on PC
  and phones. Scroll and short-screen resize are covered in three browser engines.
- No changes to Legacy, racial values, catalog revisions or translations in
  this UI-only correction. Current racial/server data, supplied banner and
  character-editor follow-ups remain in the durable task queue.
- PR35 is published and accepted: 429 browser, 64 Python and 53 backend checks,
  exact Pages/live bytes and unchanged museum, live PC/touch interactions,
  all five panels in the installed online/offline app, and real Worker login/logout.

## Modern 3.04 — Hybrid C composition, 2026-10-03

- Distinct Character, Skills and Effects sections, Base stats and Calculated
  stats headings, and quiet unboxed results make the PC workbench easier to scan.
  All seven numeric inputs, 80 primary skill controls and native results remain
  visible; the first weapon row still fits a 1440/1920 × 900 first screen.
- Equipment/Soul Search and autosave sit beside Equipment on PC, and remain
  above the long calculator on phones. Compact 30px PC rows retain 44px phone targets,
  aligned global controls, native enhancements and anchored item selection.
- The original complete Pandora fan art remains visible with a restrained
  landscape backdrop. The example's level 120, LOG/FILE and narrow proportions
  are not copied. Museum engine, game data, formulas and saved builds are unchanged.
- Numeric feedback names its field and actual maximum/minimum, distinguishes
  fractional/empty input and insufficient points, and clears on Escape or build load.
- JOB and SKILL are non-modal floating panels again, with repeat-tab, close-button
  and Escape dismissal. JOB retains two selection columns; disabled SKILL explains
  the native switch instead of presenting an unexplained empty panel. Opaque
  surfaces and natural text wrapping prevent background interference and clipping.
- PC point budgets use three short label/value rows; complete level-55 counters
  and Potential stay readable without shrinking the font or hiding controls.
- BUFF parameter labels and fields share the same row height across all languages
  and phone/PC widths; original inputs and calculation callbacks are retained.
- Eleven EN/RU captions extend the owner's translation workbook to 2,893
  rows / 226 UI captions, preserving all earlier values and native formatting.
- PR33 is published and accepted: 426 browser, 64 Python and 53 backend checks;
  exact Pages/live bytes, unchanged museum, real native and IDDQD login, six
  read-only editor previews, sharing and installed/offline PWA passed. Tag
  `v3.04` marks accepted code; evidence is in `docs/RELEASE_ACCEPTANCE.md`.

## Modern 3.03 — compact controls and understandable editing, 2026-10-03

- Level and all six attributes use seven bounded editable fields, native point
  allocation, Enter/blur confirmation and Escape cancellation instead of 42
  step buttons. Level 55, attribute caps and equipment totals remain native.
- Full original Pandora header art, inline bounded JOB/SKILL/ATTACK/DEFENSE/BUFF
  inspectors, readable stat pairs and keyboard-operable buff controls reduce
  overlap and desktop clutter. Equipment stays an anchored selection list;
  touch opening survives viewport/keyboard resizing. Compare can hide equal rows.
- Private editors show current published characteristics beside a server-validated
  preview, numerical controls before translations, optional JP/TW fields and an
  explicit edit/check/save/publish sequence. Failed checks and cancelled section
  changes preserve unsaved fields. A new Russian beginner editing guide explains
  supported mechanics and limitations without treating descriptions as formulas.
- A delayed initial session check no longer clears a password already entered
  into the native admin form. Desktop skill-name layout is checked with both the
  actual platform font and a larger explicit fallback.
- Modern adapters correct the retained recovery-array typo exposed by Silver
  Wand and keep the existing explicit Waist Belt warning. Museum files and
  formulas are unchanged. Full catalog differential coverage rejects any new
  exception and tests these two known source failures independently.
- Approved versioned racial corrections cancel erroneous +2 critical rate for
  Enkidu Stone Skin and Lapin Magic Resistance while retaining native damage
  protection and Myrine's correct bonus. Production catalog revision 2 contains
  only these two corrections; revision 0 remains immutable for pinned builds.
- Seven workbook captions extend the table to 2,882 rows / 215 UI captions;
  existing Russian/English overrides and styles are preserved.
- PR30 and PR31 are published. Final feature CI `37128992142`, Pages
  `37129818426` and Worker `37129818509` passed. Exact artifact/live files,
  unchanged museum, shared/offline recipients, installed PWA and real native
  login with the unchanged password passed; tag `v3.03` marks the accepted code.

## Modern 3.02 — native-gated skill additions, 2026-10-03

- New active/passive catalog entries can inherit a real skill's immutable native
  learning gate without overwriting its identity or changing source array order.
  Additional passives use declared typed bonuses, not a copy of a template's
  intrinsic mechanics. Active MP/timing/text remain metadata, not combat damage.
- Private source-template duplication, distinct stable IDs, explicit save and
  publish, additive D1 allocation migration, stale-tab protection and immutable
  rollback keep existing source records and pinned/shared/offline builds intact.
- Additional skill details use keyboard/touch activation, localized literal
  text, exact decimals and visible bonus requirements/status. The Skill List now
  opens below the calculator workspace instead of overlapping the character.
- Correct decimal validation no longer rejects valid `0.29` bonuses or `1.005`
  second timings; extra precision, non-finite values and invalid fields still fail.
- Ten new UI captions are editable in the existing RU/EN translation workbook;
  all 2866 previous rows, user overrides, source cells and native styling remain.
- PR28 is published: Pages `37083172767`, Worker `37083172764`; additive D1
  migration 0003 passed. Full CI, exact artifact/live bytes, fresh/offline shared
  recipient, installed PWA and real unchanged-password authentication passed.
  No sample game records were published. Custom learning rules, new classes and
  new combat mechanics remain unfinished; see the release ledger and guides.

## Modern 3.01 — compact desktop workspace, 2026-10-03

- Wide PC screens use two complete skill columns and compact native character
  settings/results. All twenty branches, both point modes and larger steps are
  retained. Riding now belongs with simulation switches; Equipment has one
  title/enchantment/reset header instead of a stacked toolbar.
- Less desktop chrome and no duplicate calculator title or randomized Legacy
  ASCII joke panel. Actual Pandora artwork, Hybrid C colors, readable values,
  original callbacks and 44px phone actions remain. The museum is unchanged.
- Default 1440×900 first weapon control ends around y=893 rather than appearing
  below the first screen. New geometry, real four-language/font/long-label,
  responsive boundary and three-engine riding tests guard the layout.
- The administrator capability note now describes the released pinned catalog
  correctly. No database, password, balance rule or translation workbook change.
- PR26 is published: Pages `37075816244`, Worker `37075816303`. Full CI,
  exact artifact/live checks, fresh shared recipient, four-language/320px RU,
  installed online/offline PWA and unchanged-password direct login passed.
  Release tag: `v3.01`. See the release ledger for evidence and limitations.

## Modern 3.00 — direct administrator login correction, 2026-10-01

- Direct Worker form sign-in keeps a same-origin request identity instead of
  `no-referrer` converting its Origin to `null`. The server still rejects null,
  missing and foreign origins; password/hash/pepper/session rules are unchanged.
- Local IDDQD opens the first-party secure login without collecting credentials
  on a disallowed preview origin. Native origin-denied submissions return to a
  clear retry form instead of raw JSON. PR25 is published: Pages `36804053399`,
  Worker `36804053403`. Actual direct login with the unchanged private-file
  password, authorized catalog, logout and reload passed all three engines.
  The Windows WebKit cookie-observer limitation is recorded in release acceptance.

## Modern 3.00 — 2026-10-01

- PR24 is published on Pages (run 36800046613) with Worker deployment
  36800046623. Exact artifact/live checks, C1 fresh-recipient/offline sharing,
  actual Pages IDDQD authentication and installed offline PWA passed.
- A later user report exposed a distinct direct Worker-form sign-in failure.
  Its root cause and published correction are recorded above; initial Pages-entry
  acceptance did not cover this native form.

- The release identifies Modern UI as 3.00; the retained engine and
  museum remain 2.00.

- Import, named builds and shared links ignore obsolete catalog responses after
  newer editing/loading, Code edits or closing Builds. Deleted named records
  cannot be resurrected by an in-flight request; stale feedback cannot steal focus.
- Catalog revisions outside the nine-digit PS3 format fail before runtime mutation.
  The administrator guide now maps all six editor kinds to their real simulation
  effects and explicitly identifies unsupported mechanics.

- Explicit current-build catalog adoption checks the live published head,
  preflights worn items and occupied Soul slots, preserves C1 and named pins,
  and cancels stale responses. Offline cache is never reported as the latest.
  Quota failures preserve old saves; an unverified calculation rollback pauses
  autosave and reports recovery honestly.
- Successful explicit code import, named load and catalog update detach an old
  shared URL fragment so reload restores the new autosave, not the old link.
  Failed imports keep the link, character and storage intact.
- Compact desktop workspace puts attributes beside results, uses the working
  area width and keeps branch names, Adeptness/Potential and their native actions
  in aligned rows. The Hybrid C art remains; the desktop banner is shorter.
  Phones retain 44px primary targets and visible Builds/Compare actions.
- Modern header replaces FILE/LOG with one Builds/Compare group. Misleading
  Heavy/Medium/Light controls and Modern log output are removed; museum controls
  remain. Legacy FILE slots can be explicitly copied into named builds without
  changing originals, character or autosave. Copies are atomic and idempotent;
  malformed data and quota failures leave the original collections intact.
- Modern handles the exact malformed Wyss Belt source marker `0=1_-7` without
  crashing: STA +1 remains, and a visible warning states that the unresolved
  conditional trigger is not simulated. No MP penalty is invented. The exact
  source row is restored even when another calculation fails; real errors still
  propagate. Legacy museum retains its source behavior.
- Consolidated Modern code export/import/clear into Builds using the original
  field and retained handlers. Plain source exports use the native compressed
  codec; versioned/context-bearing exports retain the full PS3 payload. Code
  validation stays visible when sharing, and clearing does not delete a build.
- Fixed signed skill-step labels wrapping in wider system-font fallbacks;
  desktop rows stay compact without reducing phone targets or test limits.
- Equipment reset now sizes to its label instead of the inherited 120px width.
  Wider fallback fonts stay compact; long translations wrap within the section.
- Modern build context C1 transfers riding, enabled effects, Honor, clan and
  caster attributes to fresh shared recipients and offline reloads. Comparisons
  restore the active context and storage afterward. Old CSV/compressed codes
  retain compatibility and load with source defaults. Changing source language
  no longer clears clan bonuses.
- The initial expanded CMS is deployed on Cloudflare: 28 class, 18 racial,
  178 active and 33 passive entries, with authenticated read-only production
  checks and desktop/mobile visual inspection. Public catalog remains revision 0;
  no test game data published.
- Initial active/passive editor covers all 211 retained skills: multilingual
  text, active MP/timing metadata and additive passive bonuses gated by native
  learning and typed weapon/shield/riding requirements. Hidden skill lists and
  partial native callbacks do not leave bonus calculations stale. Prerequisite
  code and built-in mechanics remain unchanged; arbitrary new skills and native
  passive replacement are not done. Context C1 persistence passed fresh-recipient
  and offline production checks.
- Initial racial-passive editor supports 18 retained slots with separate
  multilingual text and explicit preserve/add/replace numeric effects. Actual
  retained-engine results, revision restoration and exception-safe temporary
  state are verified; native formulas and museum data remain unchanged.
- Admin search no longer offers stale results while a query changes. Late item
  responses cannot replace the current selection; saves temporarily freeze
  fields so a successful response cannot discard subsequent typing.
- Initial administrator class editor supports all 28 retained class slots,
  multilingual text and native LP/MP progression parameters. Typed source
  fingerprint checks and pinned build revisions preserve old class calculations.
  Class lineage and arbitrary new classes remain unfinished. The first existing
  class/skill/passive editors are deployed on the Worker, with their revision-pinned
  consumer published on Pages.
- Modern-only equipment/Soul catalog adapter uses the retained calculation
  engine, with immutable catalog revisions pinned in `PS3` saved/shared codes.
  Cached public revisions work offline; missing revisions protect existing
  builds and autosaves. Original CSV/compressed imports stay supported.
- Catalog switching checks Soul-slot and race/class compatibility before
  rebuilding lists. Numeric IDs prevent a Legacy lexicographic weapon-reset
  bug; stale asynchronous share requests cannot replace a newer selection.

- English interface and game names can be overridden in column I of the same
  translation workbook. Russian remains in H; preserved English/JP/TW source
  columns and all prior Russian values remain intact. Empty overrides restore
  the original; JP/TW names are not replaced by an English override.
- Updated the beginner's upload/publish guide. Browser verification uses an
  actually edited workbook and checks unchanged game data and serialized builds.
- The Modern-only `IDDQD` entry now has an original green/beige DOS terminal,
  reduced-motion support and an accessible login dialog. It ignores editable
  fields and does not spend character points while typing the cheat code.
  Passwords are submitted by native HTTPS navigation to the Worker, never
  persisted in frontend storage. The Pages entry passed deployed acceptance;
  direct Worker-native form correction is tracked above.
- Secured Worker authentication is deployed and production-tested separately
  from Pages. A Modern-only equipment/Soul editor now has validated multilingual
  fields, numeric effects, private drafts, atomic publication, immutable history,
  conflict protection and rollback. Equipment/Soul engine integration is now
  published on Pages. Expanded existing class/active/passive/racial editors have
  since passed remote acceptance; additional mechanics remain in development.

## 2026.09.17 — Safe calculator code and riding controls

- Fixed Modern calculator Code Load accepting incomplete input and corrupting the current character before an exception. It now shares Build Manager's validated, rollback-capable import, accepts existing compressed/CSV codes, and does not touch Legacy File slots.
- Native Create/Load/Delete and riding controls support Enter/Space and phone-size targets. Code input has a visible programmatic label, paste/Enter support, focused inline validation and success/autosave-failure feedback.
- Riding and compressed code creation/clearing retain source callbacks; no game formula, source array, build format, museum file or translation-workbook cell changed. Skill min/max actions now share the existing translated min/max keys too.
- Added invalid/non-default/rollback, compressed/CSV, storage-failure, callback, keyboard, locale, missing-module and desktop/mobile regression/visual checks. Publication acceptance is recorded only after full CI and exact production gates.

## 2026.09.16 — Native skill allocation and explicit effects

- Full skill branch names replace four-letter abbreviations in the calculator. Approved workbook translations and original JP/EN/TW names remain display-only projections.
- Native −1/+1 actions distinguish Adeptness and Potential; one Larger steps toggle reveals ±10/min/max. All 240 callbacks stay engine-owned, with the original bar/value/indicator IDs retained. The separate potential-point pool has a readable label instead of ???.
- Effects switch deliberately by click, Enter or Space instead of pointer hover. Their values, percentage units and next-SPR hints wrap inside desktop/phone columns; source floats no longer squeeze an effect row to zero width.
- Extended the same translation workbook by five UI rows while preserving all 2,837 prior rows and 139 Russian values. Added two ordinary Russian interface instructions; game-adjacent labels remain English until reviewed. The beginner guide now matches 2,842 rows.
- Added exact callback-count/result parity for base and allocated states, keyboard, locale/load/reset/fallback and 320/390/768/1440px regression/visual checks. No engine formulas, museum source or build encoding changed.

## 2026.09.15 — Readable calculator and native character controls

- Corrected inherited Japanese bitmap/monospace fonts on calculator list/table descendants. Modern uses its system font; the museum route is unchanged.
- Reflowed character, skill-allocation and effect sections into viewport-sized columns, stacking them on phones instead of hiding the last sections beyond a 992px canvas. Dense source skill controls retain their own horizontal scrolling where needed.
- Added readable native level/attribute buttons, with 44px phone targets, that call retained Legacy handlers exactly once. Point costs, min/max, level 55, all classes, calculations and build encoding remain in the existing engine.
- Converted calculated statistics and character metadata into readable label/value pairs. Long approved labels wrap without hiding numeric values. Corrected the old float layout collapsing the build-code field.
- Made source reset/options actions keyboard-operable native buttons with current toggle state. Retained source nodes and callbacks, source-locale changes, load/reset/autosave/share compatibility and fallback when enhancement is unavailable.
- Added callback parity, boundaries, locale/load, long-label and 320/390/768/1440px regressions plus three-engine and visual checks. Legacy source/formulas and the translation workbook remain unchanged. Skill-allocation arrows and other dense Legacy controls are a separate usability follow-up.

## 2026.09.14 — Explicit item review survives automatic scrolling

- Fixed a late pointer-focus scroll event closing an explicitly opened desktop item card. The installed-app check exposed this after UI13 publication; focused explicit review now survives automatic scrolling, while manual wheel/touch/scrollbar/Page input still cancels floating cards.
- Clicking the info action pins an already opened hover card; a second click closes it. Reviewing still does not change equipment, Souls or builds. Legacy source and translations remain unchanged.

## 2026.09.13 — Compact Equipment dropdowns and quieter item rows

- Replaced the large Equipment selection modal with a compact dropdown anchored to the original field. It opens below or above according to available space, leaves the calculator visible, supports filtering/arrows/Enter and dismisses on Escape, outside click, anchor scrolling or focus moving away. The preserved native engine remains the fallback.
- Removed repeated Characteristics labels/arrows from Search and Equipment rows. A compact named information action remains for explicit review: shown on hover/focus on desktop, always available on touch. Viewing still never equips a candidate.
- Opening a dropdown reveals the currently worn item, as a native select does, without opening its card or changing the character.

- Fixed characteristic cards closing when keyboard focus automatically scrolls to an off-screen Equipment item. Keyboard review waits for that scroll to settle; manual wheel/touch input still cancels previews and never changes equipment.
- Added the off-screen keyboard regression to Chromium, Firefox and WebKit checks, plus a desktop visual capture. Pointer previews retain their 450 ms dwell, scroll cancellation and separate explicit touch disclosure.
- Fixed late focus-induced WebKit scroll events closing an already open keyboard card. Cancellation now follows actual wheel/touch/scrollbar/Page-key intent rather than assuming scrolling always finishes within two frames.
- Legacy source, formulas, serialized builds and the translation workbook remain unchanged.

## 2026.09.12 — Equipment selection and deliberate previews

- Added characteristic cards to the actual Equipment item and Soul selection lists, not only Search. Each picker is locked to its character slot; activation calls the preserved Legacy selector handler. Gem/enhancement fields and existing socket state remain in Equipment. Reviewing candidates never inserts Souls or changes the build.
- Pointer previews require 450 ms of dwell. Leaving the item, scrolling, wheel input, touch, closing or rerendering cancels pending previews; a stationary pointer does not reopen a card after scrolling. Keyboard review and the explicit Characteristics action do not require waiting. Pointer selection does not flash a focus preview.
- Reflowed the enhanced Equipment rows to remove fixed-height overlap, including full-width mobile item/Soul controls and ordinary modifier fields. Corrected an off-by-one Modern slot-label projection.
- Original engine selects, source arrays, formulas, build bytes and museum Legacy menus remain preserved; native fields stay available when the picker script is unavailable. The translation workbook is unchanged.
- Fixed Modern load/evaluation rollback retaining effects from previously equipped items: the adapter now rebuilds the Legacy equipment-effect cache using its original Equip handler before recalculating. No formula is duplicated or changed.
- Reflowed Equipment's bulk modifiers and reset action on phones. Reset is a native keyboard-operable button; bulk modifiers/reset also refresh the existing Legacy equipment-effect cache instead of leaving stale calculated bonuses.

## 2026.09.11 — Consistent controls, item previews and build links

- Replaced two language panels with one EN/RU/JP/TW group and exactly one selected language. RU uses English game-source fallback until the user supplies verified translations; JP/TW keep native game data with the English Modern shell.
- Fixed Legacy font leakage into the Compare table; increased table text and unified toolbar/install sizing. Autosave is a readable status, not a differently sized pseudo-button. Mobile actions are at least 44px high.
- Added read-only equipment/weapon/Soul cards to Modern search: adjacent desktop hover/focus popovers and a separate Details disclosure for touch. Socket rings distinguish empty/filled slots (up to three); an equipped item shows its actual Soul names, gem and enhancement. Other candidates remain base items. Literal base ATK/DEF and class flags come from Legacy data; conditional formulas are not reconstructed. Escape dismisses a preview before the dialog. Native Legacy select menus remain unchanged.
- Added Share build in Build Manager. The link carries the exact Legacy CSV and opens the character in another browser; a valid incoming link takes precedence over local autosave. Invalid links retain current data. Clipboard rejection exposes a selectable URL rather than claiming success. Link contents are public to anyone receiving it.
- Extended the same translation workbook to 2,837 rows, preserving all prior rows and Russian input. Legacy source, formulas and arrays are unchanged.

## 2026.09.10 — Release media and installation metadata

- Added real desktop/mobile screenshots to both player READMEs: compatible equipment search, example build comparison and mobile build management. They were captured from verified production UI 2026.09.9, not mockups or invented Russian game names.
- Added an absolute Open Graph image URL, descriptive unofficial-project metadata and a large-image sharing card. The image shows the real Modern calculator with the approved Pandora artwork; it is not required for the offline precache.
- Added opaque PNG exports of the existing PWA icons and a 180px Apple touch icon, keeping the vector sources and original design. Browser image decoding and exact dimensions are regression-tested.
- GitHub Pages remains free and static. The Legacy source, formulas and translation workbook are unchanged in this release.

## 2026.09.9 — On-site updates and keyboard-safe Modern dialogs

- Added an EN/RU What's new panel with current engine/UI versions, feature highlights, full changelog and report links.
- Search, Build Manager and Compare now use native modal dialogs: background controls are inert, Tab/Shift+Tab stays inside, Escape closes and returns focus to the opener. Focused stat help dismisses before its parent dialog.
- Added a first-focusable Skip to calculator link and platform-native keyboard focus indicators.
- Extended the translation workbook to 2,828 rows without changing any existing input. The 11 new interface strings include Russian copy; official game names remain user-owned.
- Added Chromium/Firefox/WebKit smoke gates for both Legacy/Modern compressed save/load and mobile Russian search.

## 2026.09.8 — Workbook translations throughout the Modern calculator

- Expanded the same workbook to 2,817 rows, preserving all 119 existing approved UI translations: 150 UI strings, 1,617 core game terms, 259 inherited labels, 158 hints and 633 skill-detail fields.
- Added Modern-only display adapters for race/class/racial skill, equipment/Soul lists, skill names, descriptions, requirements, calculator labels and hints. Blank Russian fields retain the chosen source language; no official Russian game translations were invented.
- Preserved Legacy arrays, formulas, selected values, compressed build bytes and existing help-node focus/listeners. The museum route and diagnostic Log output remain unchanged.
- Updated the beginner guide with the complete table workflow and current display coverage.

## 2026.09.7 — One Excel file for Russian translations

### Added
- A single editable `localization/translations.xlsx` with 1,764 rows: 147 Modern UI strings and 1,617 game terms, including all 211 actual skills. English, Japanese and Traditional Chinese source names sit beside the yellow Russian input column.
- A beginner's Russian guide covering download, editing, GitHub upload, automatic deployment and common errors without terminal commands.
- Approved Russian equipment and Soul names in Modern search, with matching by both source and Russian names. Other game terms are collected in the same workbook for subsequent display adapters.

### Reliability
- Every Pages build validates stable IDs, source columns, row coverage and UI placeholders before generating runtime catalogs. Invalid uploads leave the previously published site available.
- Translation-only changes now alter the service worker cache fingerprint automatically, so offline installations receive the updated catalogs without a manual app-version edit.
- English fallback, Legacy data, calculation formulas and serialized builds are preserved.

### Corrected after production inspection
- Recovered the original Base64 and DEFLATE libraries from the source-code tables inside the archived CodeRepos HTML pages. The Pages builder emits executable JavaScript for Modern and Legacy routes while retaining the archival repository files byte-for-byte.
- Restored the preserved compressed File save/load path and removed its three startup syntax errors. CI now gates browser parse errors, compressed save/load round-trips and generated codec syntax.

## 2026.09.6 — Versioned Legacy data projections

### Added
- Deterministic read-only JSON indexes for 44 equipment categories / 1,120 equipment records, 184 Souls and 25 categories / 211 actual skills.
- Exact mappings back to existing Legacy equipment selector values, Soul IDs and nested skill coordinates.
- Explicit schema, projection, Legacy engine and Remaked UI versions plus cross-platform SHA-256 fingerprints of every Legacy source file used by each index.
- Static Pages delivery under `data/generated/` for future search and tooling without a backend.

### Corrected
- The Russian terminology worksheet now contains 1,617 stable terms. It adds all 211 actual skill names as `skill_entry.*` while preserving the original skill-discipline and other term IDs.

### Reliability
- Feature and production CI regenerate all three indexes from the live Legacy runtime and reject stale committed output.
- Browser contracts fetch the published JSON and map representative records back to `EquipData`, `SoulData` and `Skill`.
- Legacy JavaScript remains the only calculation/data source of truth; generated JSON is not loaded as a calculator engine and `/legacy/` receives no Modern projection scripts.

## 2026.09.5 — Russian interface and terminology workflow

### Added
- A separate **EN / RU interface language** switch for Modern Mode. It does not change the preserved JP/EN/TW game-data language or character build bytes.
- Russian UI copy for the persistent shell, Equipment/Soul Search, Build Manager, Compare Builds, mobile controls and PWA install/update controls.
- English fallback for any Modern string that is not yet present in the Russian catalog.
- A reviewable terminology worksheet containing 1,406 stable Legacy terms: races, racial skills, jobs, skill lines, equipment categories, equipment and Souls.

### Translation safety
- Legacy game names remain unchanged until their official Russian-client equivalents are supplied and approved by the user.
- The terminology export keeps stable Legacy paths and JP/EN/TW source values; proposed and approved Russian game-term fields start empty.
- Deterministic export validation blocks stale worksheets, duplicate IDs and carrying an approved translation across a changed English source.
- UI locale persistence fails open when browser storage is unavailable and never blocks the calculator.

## 2026.09.4 — Mobile polish and offline PWA

### Added
- A compact sticky character summary on phone screens, sourced through the existing Legacy adapter.
- Collapsible legacy detail cards and mobile equipment rows that keep item and Soul selectors reachable without horizontal page overflow.
- Installable PWA metadata and root-scoped offline support for both Modern Mode and the preserved `/legacy/` route.
- A non-blocking `New version available — Reload` notice when a newly downloaded app version is ready.

### Reliability and local data
- The service worker precaches the calculator core and small interface assets while leaving external requests and the bulk item-icon library out of the required offline bundle.
- Updates activate only after the player chooses Reload; the existing Remaked autosave is flushed before the page changes.
- Offline reloads retain the serialized Legacy build in the current browser, and missing optional item icons do not prevent the calculator from starting.
- All autosaves, named builds and cached app files remain local to the browser. No account, backend or cross-device sync was added.
- Mobile, PWA, real offline, preservation and production-artifact contracts are gated in CI.

## 2026.09.3 — Compare Builds and safe diagnostics

### Added
- **Compare Builds** for selecting two named builds and viewing their legacy-calculated stats side by side.
- Neutral `Build B − Build A` deltas with explicit higher/lower/unchanged direction only; the UI does not claim that a larger or smaller number is inherently better.
- Accessible stat help controls in the comparison table with conservative definitions and the exact Legacy 2.00 output node used as their source.
- Desktop and 390px mobile visual QA captures for Compare Builds.

### Reliability
- Build comparison evaluates both serialized builds through the preserved legacy calculation path and restores the active character afterwards.
- Comparison is covered against the Legacy route with representative serialized-build differential fixtures.
- Comparing builds does not replace the legacy `localStorage.file`, named-build storage or autosave data.
- Empty, unavailable and non-numeric legacy outputs do not produce invented numeric deltas.
- Stat help deliberately avoids unverified formula decomposition; equipment, attribute and buff contributions are not claimed unless they are explicitly verified later.
- Feature and production CI gate the complete Phase-3 browser suite before release.

## 2026.09.2 — Search and local builds

### Added
- **Equipment Search** over the item options already considered compatible by the legacy simulator, with name and level filters.
- **Soul Search** for the Soul sockets and options currently exposed by the legacy simulator.
- Automatic local autosave with compatible-session recovery after refresh.
- **Build Manager** for saving, loading, renaming, duplicating and deleting multiple named builds.
- Import and export of the exact legacy serialized build code, without requiring a backend or account.
- Desktop and 390px mobile visual QA captures for the main Modern shell, Equipment Search and Build Manager.

### Reliability
- Added browser contracts for the legacy adapter, search behavior, local storage, autosave recovery, named-build CRUD and import/export.
- Feature and production CI now run the complete shipped Phase-2 browser suite before visual QA or Pages deployment.
- Legacy calculation files remain protected by preservation fingerprints and are not modified by these Modern features.

### Local data
- Autosave and named builds stay in this browser's `localStorage` in this phase.
- Remaked storage uses separate keys and does not replace or delete the legacy simulator's `localStorage.file` value.
- There are no cloud accounts, server-side build storage or cross-device sync in this release.

## 2026.09.1 — Modern foundation

### Added
- New **Modern Mode** as the primary GitHub Pages experience.
- Preserved **Legacy Mode** at `/legacy/` for the original simulator interface and behavior reference.
- Hybrid Light Modern visual shell inspired by the original green Pandora Saga Simulator.
- Responsive top navigation for desktop, ultrawide and mobile screens.
- English as the Modern Mode default while retaining JP/TW switching from the legacy calculator.
- Project, Updates and Legacy Mode navigation with dead historical links removed from the primary interface.
- Player-facing English and Russian repository pages.
- Preservation fingerprints and automated checks to detect accidental legacy-engine changes.
- Browser smoke tests for layout, language controls, legacy tabs and serialized build compatibility.

### Preserved
- Legacy calculation files and their existing game-data behavior remain the calculation source of truth.
- Historical attribution for the recovered Pandora Saga Simulator remains documented in `NOTICE.md`.

### Next
- Russian localization workflow with user-verified in-game terminology.
- Reproducible structured-data projections while retaining the Legacy calculation source of truth.
