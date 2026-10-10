import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function runtime() {
  const context = vm.createContext({ window: { PandoraRemaked: { catalog: {
    unpackPayload(value) {
      const match = value.match(/^PS3:(\d+):(?:C1:([^:]+):)?(.+)$/);
      return match ? { revision: Number(match[1]), context: match[2] ? JSON.parse(atob(match[2].replace(/-/g, '+').replace(/_/g, '/'))) : null, payload: match[3] }
        : { revision: 0, context: null, payload: value };
    }
  } } }, btoa, atob, TextEncoder, TextDecoder, Uint8Array });
  for (const file of ['share-codec', 'catalog-text']) vm.runInContext(fs.readFileSync(new URL('../../modern/' + file + '.js', import.meta.url), 'utf8'), context);
  return context.window.PandoraRemaked;
}

test('short code preserves zeros, signed deficits, large equipment IDs, revision and context', () => {
  const api = runtime();
  const csv = [1, 0, 27, 55, -10, 255, ...Array(150).fill(0), 430051, 8, 2, 185, 0.29, -1.25].join(',');
  const context = { riding: 1, buffs: ['0_1'], honor: 3, clan: [0, 1], caster: [55, 0, 0] };
  const payload = 'PS3:86:C1:' + btoa(JSON.stringify(context)).replace(/=+$/, '') + ':' + csv;
  const code = api.shareCodec.encode(payload);
  assert.ok(code.length < encodeURIComponent(payload).length / 2);
  assert.equal(api.shareCodec.decode(code), payload);
  assert.equal(api.shareCodec.decode(csv), csv);
});

test('bounded decoder rejects corrupt, oversized, truncated and trailing input', () => {
  const codec = runtime().shareCodec;
  for (const input of ['S1.', 'S1.%%%%', 'S1.' + 'A'.repeat(10001), 'S1.Af___w', 'S1.AQ']) assert.throws(() => codec.decode(input));
  const valid = codec.encode('1,0,0,0,-1,999999');
  assert.throws(() => codec.decode(valid + 'AAAA'));
  assert.throws(() => codec.encode('1,Infinity'));
  assert.throws(() => codec.encode('1,999999999999'));
});

test('compact code round-trips many sparse numeric choices', () => {
  const codec = runtime().shareCodec;
  for (let n = 1; n <= 50; n++) {
    const fields = Array.from({ length: 300 }, (_, i) => (i * n) % 13 ? 0 : i % 2 ? -i : i * 1000);
    const csv = fields.join(','); assert.equal(codec.decode(codec.encode(csv)), csv);
  }
});

test('glued catalog effects restore line breaks without splitting ordinary prose or comma clauses', () => {
  const lines = runtime().catalogText.lines;
  assert.equal(lines('Легкий доспех, смягчающий получаемый урон.ПРВ +1Сопротивляемость оглушению +8%Сопротивляемость падению +8%'),
    'Легкий доспех, смягчающий получаемый урон.\nПРВ +1\nСопротивляемость оглушению +8%\nСопротивляемость падению +8%');
  assert.equal(lines('Training.HP +25, MP +25'), 'Training.\nHP +25, MP +25');
  assert.equal(lines('AGI +1<br />DEF +5\nA normal sentence.'), 'AGI +1\nDEF +5\nA normal sentence.');
  assert.equal(lines('Ordinary equipment description. It has no effect clause.'), 'Ordinary equipment description. It has no effect clause.');
});


test('Astir game descriptions regain sentence, stat and refinement boundaries without numeric edits', () => {
  const lines = runtime().catalogText.lines;
  const cases = [
    ['Красивая куртка цвета зари.Такие любят носить мужчины Астира.СИЛ +1, ОЗ +50За каждую единицу улучшения:Точность +1',
      'Красивая куртка цвета зари.\nТакие любят носить мужчины Астира.\nСИЛ +1, ОЗ +50\nЗа каждую единицу улучшения:\nТочность +1'],
    ['Красивая куртка цвета моря. Такие любят носить мужчины Астира.ИНТ +1, ОМ +40За каждые 2 единицы улучшения:Скорость применения умений +1%',
      'Красивая куртка цвета моря. Такие любят носить мужчины Астира.\nИНТ +1, ОМ +40\nЗа каждые 2 единицы улучшения:\nСкорость применения умений +1%'],
    ['Красивые башмаки. Такие любят носить мужчины Астира.ВЫН +1За каждые 3 единицы улучшения:Получаемый магический урон -1%',
      'Красивые башмаки. Такие любят носить мужчины Астира.\nВЫН +1\nЗа каждые 3 единицы улучшения:\nПолучаемый магический урон -1%']
  ];
  for (const [before, after] of cases) {
    assert.equal(lines(before), after);
    assert.equal(lines(before).replace(/\s/g, ''), before.replace(/\s/g, ''));
  }
});


test('current-game English Astir descriptions preserve complete stats and refinement rules on separate lines', () => {
  const lines = runtime().catalogText.lines;
  const cases = [
    [
      'A beautiful coat the color of dawn.The men of Astir love to wear these.STR +1, HP +50Per every enhancement level:Accuracy +1',
      'A beautiful coat the color of dawn.\nThe men of Astir love to wear these.\nSTR +1, HP +50\nPer every enhancement level:\nAccuracy +1'
    ],
    [
      'A beautiful coat. The men of Astir love to wear these.SPI +1, HP +40, MP +10Per every enhancement level:HP +15At +5 and above: Magic Resistance +5',
      'A beautiful coat. The men of Astir love to wear these.\nSPI +1, HP +40, MP +10\nPer every enhancement level:\nHP +15\nAt +5 and above: Magic Resistance +5'
    ],
    [
      'Body part: torso and legs.A beautiful dress the color of the sea. DEX +1, INT +1, MP +40Skill Failure Resistance +5%Per every 2 enhancement levels:Skill Casting Speed +1%Skill Cooldown -1%',
      'Body part: torso and legs.\nA beautiful dress the color of the sea. DEX +1, INT +1, MP +40\nSkill Failure Resistance +5%\nPer every 2 enhancement levels:\nSkill Casting Speed +1%\nSkill Cooldown -1%'
    ],
    [
      'AGI +2Sleep Resistance +4%Knockdown Resistance +4%Per every 2 enhancement levels:Aura Damage +1Attack Speed +1%',
      'AGI +2\nSleep Resistance +4%\nKnockdown Resistance +4%\nPer every 2 enhancement levels:\nAura Damage +1\nAttack Speed +1%'
    ]
  ];
  for (const [original, expected] of cases) {
    assert.equal(lines(original), expected);
    assert.equal(lines(original).replace(/\s/g, ''), original.replace(/\s/g, ''));
    assert.equal(lines(expected), expected, 'formatting must be idempotent');
  }
  assert.equal(lines('Accuracy +1, Attack +2; HP +30'), 'Accuracy +1, Attack +2; HP +30');
});
