-- Modern 3.78: use the approved plural lightning-resistance caption.
-- Only the exact previously approved D1 wording is migrated. Retain newer
-- manual edits, reset tombstones, all other locales and unpublished drafts.
-- Existing trigger records versioned history. No calculator mechanics change.
UPDATE localization_overrides
SET text='Сопр. молниям',
    version=version+1,
    updated_at=CAST(strftime('%s','now') AS INTEGER),
    last_operation=NULL
WHERE scope='game' AND locale='ru'
  AND term_id='skill_entry.18.10'
  AND text='Сопр. молнии'
  AND NOT EXISTS (
    SELECT 1 FROM localization_drafts AS draft
    WHERE draft.scope=localization_overrides.scope
      AND draft.term_id=localization_overrides.term_id
      AND draft.locale=localization_overrides.locale
  );

UPDATE localization_overrides
SET text='Сопр. молниям',
    version=version+1,
    updated_at=CAST(strftime('%s','now') AS INTEGER),
    last_operation=NULL
WHERE scope='game' AND locale='ru'
  AND term_id='calculator.status.32'
  AND text='Сопр. молнии'
  AND NOT EXISTS (
    SELECT 1 FROM localization_drafts AS draft
    WHERE draft.scope=localization_overrides.scope
      AND draft.term_id=localization_overrides.term_id
      AND draft.locale=localization_overrides.locale
  );
