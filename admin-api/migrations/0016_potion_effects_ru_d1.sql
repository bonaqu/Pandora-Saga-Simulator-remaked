-- Publish RU names and hover texts of the 14 Potion Effects rows to D1.
-- Ten rows match identifiable current server objects; four are historical-only
-- and state that clearly in the hint. Only absent keys are inserted: owner
-- publications, reset tombstones, active drafts and all other languages win.
-- Local approved fallbacks mirror these entries for offline/rolling deployment.
WITH seed(term_id,text) AS (VALUES
  ('calculator.potion.0','Мясо'),
  ('calculator.potion.0.hint','Базовое восстановление: 20 ОЗ.'),
  ('calculator.potion.1','Лёгкое исцеляющее зелье'),
  ('calculator.potion.1.hint','Базовое восстановление: 60 ОЗ.'),
  ('calculator.potion.10','Вкусное шампанское'),
  ('calculator.potion.10.hint','Базовое восстановление: 5% от максимальных ОЗ; также восстанавливает 10% ОМ.'),
  ('calculator.potion.11','Сильное исцеляющее зелье'),
  ('calculator.potion.11.hint','Базовое восстановление: 15% от максимальных ОЗ.'),
  ('calculator.potion.12','Зелье жизни'),
  ('calculator.potion.12.hint','Историческое значение: 30% от максимальных ОЗ. Соответствующий предмет текущего сервера не подтверждён.'),
  ('calculator.potion.13','Руна Тейваз'),
  ('calculator.potion.13.hint','Историческое значение: 18% от максимальных ОЗ. Соответствующий предмет текущего сервера не подтверждён.'),
  ('calculator.potion.2','Слабое исцеляющее зелье'),
  ('calculator.potion.2.hint','Базовое восстановление: 120 ОЗ.'),
  ('calculator.potion.3','Простое исцеляющее зелье'),
  ('calculator.potion.3.hint','Базовое восстановление: 180 ОЗ.'),
  ('calculator.potion.4','Особое исцеляющее зелье'),
  ('calculator.potion.4.hint','Историческое значение: 450 ОЗ. Соответствующий предмет текущего сервера не подтверждён.'),
  ('calculator.potion.5','Таинственное зелье'),
  ('calculator.potion.5.hint','Базовое восстановление: 145 ОЗ и 75 ОМ.'),
  ('calculator.potion.6','Подснежник'),
  ('calculator.potion.6.hint','Подснежник: базовое восстановление 20 ОЗ; также снимает заморозку.'),
  ('calculator.potion.7','Цветок Пэнлай'),
  ('calculator.potion.7.hint','Историческое значение: 25 ОЗ. Соответствующий предмет текущего сервера не подтверждён.'),
  ('calculator.potion.8','Тыквенное печенье'),
  ('calculator.potion.8.hint','Базовое восстановление: 200 ОЗ.'),
  ('calculator.potion.9','Астирская конфета'),
  ('calculator.potion.9.hint','Базовое восстановление: 150 ОЗ.')
)
INSERT OR IGNORE INTO localization_overrides
  (scope,term_id,locale,text,version,updated_at,last_operation)
SELECT 'game',seed.term_id,'ru',seed.text,1,CAST(strftime('%s','now') AS INTEGER),NULL
FROM seed
WHERE NOT EXISTS (
  SELECT 1 FROM localization_drafts AS draft
  WHERE draft.scope='game' AND draft.term_id=seed.term_id AND draft.locale='ru'
);
