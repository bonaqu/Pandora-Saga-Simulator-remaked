-- Modern 3.74: migrate only the five exact legacy resistance captions.
-- The user's published D1 values are authoritative. Replacing them must be a
-- D1 write (with a new version/history record), never a browser-side alias.
-- Customized text, reset tombstones, all other languages, and active drafts
-- remain untouched. Existing v2 localization trigger records every change.
UPDATE localization_overrides
SET text = CASE term_id
  WHEN 'skill_entry.18.8' THEN 'Сопр. огню'
  WHEN 'skill_entry.18.9' THEN 'Сопр. льду'
  WHEN 'skill_entry.18.10' THEN 'Сопр. молнии'
  WHEN 'skill_entry.20.7' THEN 'Сопр. тьме'
  WHEN 'skill_entry.21.7' THEN 'Сопр. чарам'
  ELSE text END,
  version=version+1,
  updated_at=CAST(strftime('%s','now') AS INTEGER),
  last_operation=NULL
WHERE scope='game' AND locale='ru'
  AND (term_id,text) IN (
    ('skill_entry.18.8','Сопротивляемость огню'),
    ('skill_entry.18.9','Сопротивляемость льду'),
    ('skill_entry.18.10','Сопротивляемость молниям'),
    ('skill_entry.20.7','Сопротивляемость магии тьмы'),
    ('skill_entry.21.7','Сопротивляемость чарам')
  )
  AND NOT EXISTS (
    SELECT 1 FROM localization_drafts AS draft
    WHERE draft.scope=localization_overrides.scope
      AND draft.term_id=localization_overrides.term_id
      AND draft.locale=localization_overrides.locale
  );

-- New Modern release labels are administered like any other site text.
-- Do not insert over an existing publication or an unpublished editor draft.
INSERT OR IGNORE INTO localization_overrides
 (scope,term_id,locale,text,version,updated_at,last_operation)
SELECT 'ui','updates.latestForUsers','ru',
 'Последние изменения для пользователей: {version}',1,CAST(strftime('%s','now') AS INTEGER),NULL
WHERE NOT EXISTS(SELECT 1 FROM localization_drafts
 WHERE scope='ui' AND term_id='updates.latestForUsers' AND locale='ru');
INSERT OR IGNORE INTO localization_overrides
 (scope,term_id,locale,text,version,updated_at,last_operation)
SELECT 'ui','updates.technicalSummary','ru',
 'Выполнены внутренние технические улучшения.',1,CAST(strftime('%s','now') AS INTEGER),NULL
WHERE NOT EXISTS(SELECT 1 FROM localization_drafts
 WHERE scope='ui' AND term_id='updates.technicalSummary' AND locale='ru');
