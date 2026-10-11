-- Modern 3.76: correct one verified typo in a historical guild tooltip.
-- D1 remains authoritative: only the exact old published wording may move.
-- Custom translations, resets, drafts, other locales and mechanics stay intact.
-- History/updated version are recorded by the existing localization trigger.
UPDATE localization_overrides
SET text='Активное умение главы гильдии, позволяющее усилить находящихся рядом с ним членов гильдии:
+1 ко всем шести характеристикам (STA, STR, AGI, DEX, SPR, INT) ближайших участников.
Расход: 1 серебряный кристалл;
Длительность действия: 600 секунд (10 минут).',
    version=version+1,
    updated_at=CAST(strftime('%s','now') AS INTEGER),
    last_operation=NULL
WHERE scope='game'
  AND term_id='calculator.clan.9.level.1.hint'
  AND locale='ru'
  AND text='Активное умение главы гильдии, позволяющее усилить находящихся рядом с ним членов гильдии:
+1 ко всем шести характеристикам (STA, STR, AGI, DEX, SPR, INT) ближайших участников.
Расход: 1 серебряный кристалл;
Длительнсть действия: 600 секунд (10 минут).'
  AND NOT EXISTS (
    SELECT 1 FROM localization_drafts AS draft
    WHERE draft.scope=localization_overrides.scope
      AND draft.term_id=localization_overrides.term_id
      AND draft.locale=localization_overrides.locale
  );
