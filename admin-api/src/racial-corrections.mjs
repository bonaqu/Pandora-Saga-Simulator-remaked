// Explicit owner-reported Modern data corrections. This creates ordinary
// versioned admin drafts, not an alternative calculator or a silent baseline
// rewrite. Publication requires the normal authenticated admin workflow.
import { baselineById } from './catalog-baseline.mjs';
import { draftFromSource } from './catalog-model.mjs';

export function approvedRacialCorrections() {
  return [
    ['racial_skill.4.0', 'Physical damage taken −10%. Does not grant critical chance.', 'Получаемый физический урон −10%. Не даёт шанс критического удара.'],
    ['racial_skill.5.0', 'Magic damage taken −10%. Does not grant critical chance.', 'Получаемый магический урон −10%. Не даёт шанс критического удара.']
  ].map(([id, en, ru]) => {
    const edit = draftFromSource(baselineById.get(id), 'racial');
    edit.description = { en, ru, jp: '', tw: '' };
    // Native Cri erroneously uses race >= 3 instead of race == 3. Its additive
    // options already support removing those exact two percentage points.
    // Keep the original physical/magic protection and every other native stat.
    edit.effectMode = 'add'; edit.effects = [{ stat: 69, value: -2, unit: 'flat' }];
    return edit;
  });
}
