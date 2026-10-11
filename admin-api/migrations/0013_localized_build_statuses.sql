-- UI texts formerly embedded in the Modern Build Manager now live in D1.
-- All values are additive: never overwrite existing publications or cloud drafts.
-- JP/TW strings reproduce the previously visible site text exactly.
WITH seed(scope,term_id,locale,text) AS (VALUES
  ('ui','builds.live.loadedUpdated','en','Loaded and updated “{name}” to the current catalog.'),
  ('ui','builds.live.loadedUpdated','ru','«{name}» загружен и обновлён до актуального каталога.'),
  ('ui','builds.live.loadedUpdated','jp','「{name}」を読み込み、最新カタログへ更新しました。'),
  ('ui','builds.live.loadedUpdated','tw','已載入「{name}」並更新至最新目錄。'),
  ('ui','builds.live.autoApplied','en','Catalog {revision} applied automatically.'),
  ('ui','builds.live.autoApplied','ru','Каталог {revision} применён автоматически.'),
  ('ui','builds.live.autoApplied','jp','カタログ {revision} を自動適用しました。'),
  ('ui','builds.live.autoApplied','tw','已自動套用目錄 {revision}。'),
  ('ui','builds.live.catalogHelp','en','The site updates items, skills and other game data automatically. Saved builds always use current data; specific automatic changes are listed.'),
  ('ui','builds.live.catalogHelp','ru','Сайт сам обновляет предметы, навыки и другие игровые данные. Сохранённые билды используют текущие данные; конкретные изменения показываются в отчёте.'),
  ('ui','builds.live.catalogHelp','jp','アイテムやスキルなどのゲームデータは自動で更新されます。保存したビルドに影響する更新がある場合は、ビルドの横に警告が表示されます。'),
  ('ui','builds.live.catalogHelp','tw','網站會自動更新物品、技能和其他遊戲資料。如果更新可能影響已儲存的配置，配置旁會顯示提醒。'),
  ('ui','builds.live.catalogLine','en','Game data: version {revision} · updates automatically'),
  ('ui','builds.live.catalogLine','ru','Игровые данные: версия {revision} · обновляются автоматически'),
  ('ui','builds.live.catalogLine','jp','ゲームデータ: バージョン {revision} · 自動更新'),
  ('ui','builds.live.catalogLine','tw','遊戲資料：版本 {revision} · 自動更新'),
  ('ui','builds.live.catalogSourceLine','en','Game data: base version · updates automatically'),
  ('ui','builds.live.catalogSourceLine','ru','Игровые данные: базовая версия · обновляются автоматически'),
  ('ui','builds.live.catalogSourceLine','jp','ゲームデータ: 基本バージョン · 自動更新'),
  ('ui','builds.live.catalogSourceLine','tw','遊戲資料：基礎版本 · 自動更新'),
  ('ui','builds.live.catalogCheckingLine','en','Game data: version {revision} · checking for updates…'),
  ('ui','builds.live.catalogCheckingLine','ru','Игровые данные: версия {revision} · проверяем обновления…'),
  ('ui','builds.live.catalogCheckingLine','jp','ゲームデータ: バージョン {revision} · 更新を確認中…'),
  ('ui','builds.live.catalogCheckingLine','tw','遊戲資料：版本 {revision} · 正在檢查更新…'),
  ('ui','builds.migration.removed','ru','Снято: {name} ({reason})'),
  ('ui','builds.migration.reasonMissing','ru','больше нет в каталоге'),
  ('ui','builds.migration.reasonIncompatible','ru','несовместимо'),
  ('ui','builds.migration.reasonSlots','ru','меньше слотов душ'),
  ('ui','builds.migration.reasonUnknown','ru','причина не указана'),
  ('ui','builds.migration.count','ru','Изменений в билде: {count}'),
  ('ui','builds.migration.showChanges','ru','Показать изменения'),
  ('ui','builds.migration.title','ru','Изменения билда'),
  ('ui','builds.migrationSaveFailed','ru','Билд обновлён. Сохранённые билды не удалось записать; исходные данные сохранены.')
)
INSERT OR IGNORE INTO localization_overrides (scope,term_id,locale,text,version,updated_at,last_operation)
SELECT seed.scope,seed.term_id,seed.locale,seed.text,1,CAST(strftime('%s','now') AS INTEGER),NULL
FROM seed
WHERE NOT EXISTS (SELECT 1 FROM localization_drafts AS draft WHERE draft.scope=seed.scope AND draft.term_id=seed.term_id AND draft.locale=seed.locale);

-- Presentation-only calculation/change-report captions.
WITH seed(scope,term_id,locale,text) AS (VALUES
  ('ui','catalog.diffSoulSlots','ru','слоты душ {before}→{after}'),
  ('ui','catalog.stat.prv','ru','ПРВ'),
  ('ui','calculator.calculationLimit','ru','Ограничение расчёта: {note}')
)
INSERT OR IGNORE INTO localization_overrides(scope,term_id,locale,text,version,updated_at,last_operation)
SELECT seed.scope,seed.term_id,seed.locale,seed.text,1,CAST(strftime('%s','now') AS INTEGER),NULL
FROM seed WHERE NOT EXISTS (
  SELECT 1 FROM localization_drafts AS draft
  WHERE draft.scope=seed.scope AND draft.term_id=seed.term_id AND draft.locale=seed.locale
);
