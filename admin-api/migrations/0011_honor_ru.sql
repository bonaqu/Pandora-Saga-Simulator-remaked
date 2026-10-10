-- Publish exactly 13 user-approved RU Honor names and 13 RU hover hints.
-- D1 localization only; no Legacy mechanics, English, stats or approved baseline edits.
-- Abort the migration if any target was edited or is in an unpublished draft.
SELECT CASE WHEN
  EXISTS (SELECT 1 FROM localization_overrides
    WHERE scope='game' AND locale='ru' AND term_id IN ('calculator.honor.0','calculator.honor.0.hint','calculator.honor.1','calculator.honor.1.hint','calculator.honor.2','calculator.honor.2.hint','calculator.honor.3','calculator.honor.3.hint','calculator.honor.4','calculator.honor.4.hint','calculator.honor.5','calculator.honor.5.hint','calculator.honor.6','calculator.honor.6.hint','calculator.honor.7','calculator.honor.7.hint','calculator.honor.8','calculator.honor.8.hint','calculator.honor.9','calculator.honor.9.hint','calculator.honor.10','calculator.honor.10.hint','calculator.honor.11','calculator.honor.11.hint','calculator.honor.12','calculator.honor.12.hint'))
  OR EXISTS (SELECT 1 FROM localization_drafts
    WHERE scope='game' AND locale='ru' AND term_id IN ('calculator.honor.0','calculator.honor.0.hint','calculator.honor.1','calculator.honor.1.hint','calculator.honor.2','calculator.honor.2.hint','calculator.honor.3','calculator.honor.3.hint','calculator.honor.4','calculator.honor.4.hint','calculator.honor.5','calculator.honor.5.hint','calculator.honor.6','calculator.honor.6.hint','calculator.honor.7','calculator.honor.7.hint','calculator.honor.8','calculator.honor.8.hint','calculator.honor.9','calculator.honor.9.hint','calculator.honor.10','calculator.honor.10.hint','calculator.honor.11','calculator.honor.11.hint','calculator.honor.12','calculator.honor.12.hint'))
  THEN json_extract('HONOR_TRANSLATION_CONFLICT', '$')
  ELSE 1 END;

INSERT INTO localization_overrides
 (scope,term_id,locale,text,version,updated_at,last_operation)
VALUES
  ('game','calculator.honor.0','ru','Сила познания',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.0.hint','ru','ВЫН +1, СИЛ +1, ПРВ +1, ЛВК +1, СД +1, ИНТ +1.',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.1','ru','Золотое сердце',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.1.hint','ru','Эффективность исцеляющих умений +10%.',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.2','ru','Том огня',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.2.hint','ru','АТК +2%, урон магией огня +5%, сопротивляемость огню +10%, сопротивляемость льду −15%, сопротивляемость ожогу +5%.',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.3','ru','Том льда',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.3.hint','ru','Урон магией льда +5%, сопротивляемость прерыванию заклинаний +2%, сопротивляемость льду +10%, сопротивляемость молнии −15%, сопротивляемость заморозке +5%.',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.4','ru','Том грозы',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.4.hint','ru','Точность +5, урон магией молнии +5%, сопротивляемость огню −15%, сопротивляемость молнии +10%, устойчивость к падению +5%.',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.5','ru','Бешенство',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.5.hint','ru','Физический урон оружием +15.',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.6','ru','Мастер наездника',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.6.hint','ru','При верховой езде повышаются базовые характеристики персонажа на +10%.',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.7','ru','Тайна стража',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.7.hint','ru','Вероятность получения критического удара −10%, получаемый критический урон −10%.',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.8','ru','Том тьмы',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.8.hint','ru','Сопротивляемость свету −5%, тьме +10%, чарам +5%, аномальным состояниям духа +6%.',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.9','ru','Том света',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.9.hint','ru','Сопротивляемость свету +10%, тьме −5%, магии +3%, аномальным состояниям тела +6%.',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.10','ru','Сила воли',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.10.hint','ru','Эффективность лечения зельями +5%, защита +5, получаемый физический урон −5%.',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.11','ru','Невероятная ловкость',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.11.hint','ru','Точность −10, уклонение +10, уклонение от дальних атак +3%.',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.12','ru','Мастер боя',1,CAST(strftime('%s','now') AS INTEGER),NULL),
  ('game','calculator.honor.12.hint','ru','Точность +10, уклонение −10, АТК при атаке спереди +10%.',1,CAST(strftime('%s','now') AS INTEGER),NULL);
