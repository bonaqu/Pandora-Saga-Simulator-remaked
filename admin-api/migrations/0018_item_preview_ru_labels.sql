-- Modern 4.42: publish the already-approved RU equipment category/slot labels
-- and the two item-preview stat captions to the same D1 localization table.
-- All 28 Russian class names are ALREADY published: do not rewrite them.
-- Never override explicit author edits, reset tombstones or pending drafts.
-- This migration is additive only; it changes no equipment IDs or stats.
WITH seed(scope, term_id, text) AS (VALUES
  ('game', 'equipment_category.0', 'Одноручный меч'),
  ('game', 'equipment_category.1', 'Двуручный меч'),
  ('game', 'equipment_category.2', 'Одноручный топор'),
  ('game', 'equipment_category.3', 'Двуручный топор'),
  ('game', 'equipment_category.4', 'Одноручное копьё'),
  ('game', 'equipment_category.5', 'Двуручное копьё'),
  ('game', 'equipment_category.6', 'Кинжал'),
  ('game', 'equipment_category.7', 'Кастеты'),
  ('game', 'equipment_category.8', 'Лук'),
  ('game', 'equipment_category.9', 'Арбалет'),
  ('game', 'equipment_category.10', 'Одноручный молот'),
  ('game', 'equipment_category.11', 'Двуручный молот'),
  ('game', 'equipment_category.12', 'Одноручный жезл'),
  ('game', 'equipment_category.13', 'Двуручный жезл'),
  ('game', 'equipment_category.20', 'Щит'),
  ('game', 'equipment_category.30', 'Шлем'),
  ('game', 'equipment_category.31', 'Броня'),
  ('game', 'equipment_category.32', 'Перчатки'),
  ('game', 'equipment_category.33', 'Штаны'),
  ('game', 'equipment_category.34', 'Обувь'),
  ('game', 'equipment_category.35', 'Плащ'),
  ('game', 'equipment_category.40', 'Серьга'),
  ('game', 'equipment_category.41', 'Амулет'),
  ('game', 'equipment_category.42', 'Пояс'),
  ('game', 'equipment_category.43', 'Кольцо'),
  ('ui', 'search.itemStatAttack', 'Атака'),
  ('ui', 'search.itemStatDefense', 'Защита'),
  ('ui', 'adminShell.catalogSoulSlotWeapon', 'Оружие'),
  ('ui', 'adminShell.catalogSoulSlotShield', 'Щит'),
  ('ui', 'adminShell.catalogSoulSlotHead', 'Шлем'),
  ('ui', 'adminShell.catalogSoulSlotTorso', 'Броня'),
  ('ui', 'adminShell.catalogSoulSlotArms', 'Перчатки'),
  ('ui', 'adminShell.catalogSoulSlotLegs', 'Штаны'),
  ('ui', 'adminShell.catalogSoulSlotBoots', 'Обувь'),
  ('ui', 'adminShell.catalogSoulSlotCloak', 'Плащ')
)
INSERT OR IGNORE INTO localization_overrides
  (scope, term_id, locale, text, version, updated_at, last_operation)
SELECT seed.scope, seed.term_id, 'ru', seed.text, 1,
       CAST(strftime('%s','now') AS INTEGER), NULL
FROM seed
WHERE NOT EXISTS (
  SELECT 1 FROM localization_drafts AS draft
  WHERE draft.scope = seed.scope AND draft.term_id = seed.term_id AND draft.locale = 'ru'
);
