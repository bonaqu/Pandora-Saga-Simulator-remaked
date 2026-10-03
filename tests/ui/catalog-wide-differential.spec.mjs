import { test, expect } from '@playwright/test';
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
import souls from '../../data/generated/souls.v1.json' with { type: 'json' };
import skills from '../../data/generated/skills.v1.json' with { type: 'json' };

// Identical native control callbacks in two genuinely separate runtimes. No
// test formula, inferred percentage or copied calculator implementation.
function auditCatalog({ equipment, souls, skills, allSkills, gearToAudit, auditCharacters }) {
  var results = [], unavailable = [], failures = [], errors = [];
  function choose(id, value) {
    var control = document.getElementById(id); if (!control) return false;
    // The retained race/class/passive lists use selectedIndex; their option
    // values are display names, unlike the stable numeric Equipment IDs.
    if (['SelRace', 'SelJob', 'SelRSkill'].includes(id)) control.selectedIndex = Number(value);
    else {
      if (!Array.from(control.options).some(option => String(option.value) === String(value))) return false;
      control.value = String(value);
    }
    control.dispatchEvent(new Event('change', { bubbles: true })); return true;
  }
  function context(race, job) {
    Flag[2] = 0;
    if (Status.Job[0] !== race) choose('SelRace', race);
    if (Status.Job[2] !== job) choose('SelJob', job);
    StatusMove('Lev', MaxLv - Status.Lev[0]); CalcSet('Lev'); Reset('Equip'); Reset('Skill');
    if (Status.Job[0] !== race || Status.Job[2] !== job) throw new Error('Native context mismatch: requested ' + race + '/' + job + ', actual ' + Status.Job.join('/'));
  }
  function capture(id) {
    try { CalcSet('Equip'); Flag[2] = 3; CalcSet('ALL'); Flag[2] = 4; CalcSet('ALL'); }
    catch (error) { errors.push({ id, message: error.message }); }
    finally { Flag[2] = 0; }
    results.push({ id, race: Status.Job[0], job: Status.Job[2], equipment: JSON.stringify(Status.Equip),
      values: Array.from(document.querySelectorAll('[id^="Status_"]')).map(node => [node.id, node.textContent.trim().replace(/\s+/g, ' ')]),
      attributes: ['STA', 'STR', 'AGI', 'DEX', 'SPR', 'INT'].map(key => Status[key].slice()) });
  }
  function wear(item) {
    var race = item.compatibility_flags.slice(2, 8).indexOf(1), job = item.compatibility_flags.slice(8).indexOf(1);
    context(race, job);
    for (var slot = 0; slot < 14; slot++) if (choose('SelEquip_' + slot + '_0', item.legacy_id) && Number(Status.Equip[slot][0]) === item.legacy_id) return slot;
    return -1;
  }
  Flag[3] = 0; // Learning is irrelevant to item enumeration; enabled below.
  gearToAudit.forEach(item => {
    if (wear(item) < 0) { failures.push(item.id); return; }
    capture(item.id);
  });
  souls.forEach(soul => {
    if (!soul.compatibility_flags.includes(1)) { unavailable.push(soul.id); return; }
    var applied = false;
    for (var kind = 0; kind < 8 && !applied; kind++) {
      if (!soul.compatibility_flags[kind]) continue;
      var candidates = equipment.filter(item => item.soul_socket_count > 0 && (kind === 0 ? item.legacy_category_id <= 13 : item.legacy_category_id === [null, 20, 30, 31, 32, 33, 34, 42][kind]));
      for (var item of candidates) {
        var slot = wear(item); if (slot < 0) continue;
        var socket = document.getElementById('SelEquip_' + slot + '_4');
        if (socket.style.display !== 'none' && choose(socket.id, soul.legacy_id) && Number(Status.Equip[slot][4]) === soul.legacy_id) { applied = true; break; }
      }
    }
    if (!applied) failures.push(soul.id); else capture(soul.id);
  });
  if (auditCharacters) for (var job = 0; job < 28; job++) { context(0, job); capture('job.' + job); }
  if (auditCharacters) for (var race = 0; race < 6; race++) for (var passive = 0; passive < 3; passive++) {
    context(race, 0); choose('SelRSkill', passive); capture('racial_skill.' + race + '.' + passive);
  }
  Flag[3] = 1;
  skills.forEach(skill => {
    var key = skill.legacy_category_id + '_' + skill.legacy_entry_index, found = false;
    var classToken = skill.prerequisite_code.split('_').find(token => token.startsWith('J='));
    var jobs = classToken ? [Number(classToken.split('=')[1])] : [];
    // Retained Prototype overrides Array.from and ignores its modern mapper.
    // Explicit indexes keep this diagnostic on real classes, not undefined.
    if (!classToken) for (var candidate = 0; candidate < 28; candidate++) jobs.push(candidate);
    for (var job of jobs) {
      if (found) break;
      context(0, job);
      // Prerequisite tokens are source data used only to request an allocation.
      // The original point allocator and SkillList decide what is possible.
      var requestedTokens = skill.prerequisite_code.split('_');
      var primary = requestedTokens.filter(token => token.startsWith('S=')).map(token => Number(token.split('=')[1]));
      // The preserved parser retains a previous row's secondary token. Provide
      // a valid allocation for earlier secondary source requirements too; do
      // not fake Learn or change the ordering/conditions of the original table.
      var earlier = allSkills.filter(row => row.legacy_category_id === skill.legacy_category_id && row.legacy_entry_index < skill.legacy_entry_index);
      earlier.forEach(row => row.prerequisite_code.split('_').forEach(token => { if (token.startsWith('S=') && !primary.includes(Number(token.split('=')[1])) && !requestedTokens.includes(token)) requestedTokens.push(token); }));
      function requestToken(token) {
        var parts = token.split('='); if (parts[0] !== 'S') return;
        var category = Number(parts[1]), requested = Number(parts[2]);
        function allocate(child, target) {
          // The source API accepts a delta, not the absolute prerequisite.
          var state = Status.Skill[child], potential = state[2] + state[3], learned = state[0] + state[1];
          if (potential < target) CalcSet('Skill', child, target - potential, 'Potential');
          if (learned < target) CalcSet('Skill', child, target - learned, 'Adeptness');
        }
        if (document.getElementById('Skill_' + category + '_3')) {
          allocate(category, requested);
        } else {
          // A group total has no allocator. Request its real child controls;
          // native caps/budgets and the native learning gate still decide.
          for (var child = category + 1; child < Name.Skill.length && document.getElementById('Skill_' + child + '_3'); child++) {
            var group = Status.Skill[category], remaining = requested - group[0] - group[1];
            if (remaining <= 0) break;
            var current = Status.Skill[child]; allocate(child, current[0] + current[1] + remaining);
          }
        }
      }
      function nativeLearning() {
        Learn = [[], [], [], []]; for (var branch = 0; branch < Name.Skill.length; branch++) { SkillList('Potential', branch); SkillList('Adeptness', branch); }
      }
      requestedTokens.forEach(requestToken); nativeLearning();
      // Across branches, the same retained parser also sees the previous
      // potential row's secondary requirement. Request that real source token
      // and let native budgets/gates decide again; never set learned flags.
      for (var retry = 0; retry < 2 && !Learn[0].includes(key); retry++) {
        var position = Learn[1].indexOf(key); if (position < 0) break;
        var secondary;
        for (var previous = position - 1; previous >= 0; previous--) {
          var identity = Learn[1][previous].split('_');
          var tokens = Skill[0][Number(identity[0])][Number(identity[1])][9].split('_');
          if (tokens.length > 1) { secondary = tokens[1]; break; }
        }
        if (!secondary) break; requestToken(secondary); nativeLearning();
      }
      found = Learn[0].includes(key);
    }
    if (!found) { failures.push({ id: skill.id, code: skill.prerequisite_code, level: Status.Lev[0], job: Status.Job[2], remaining: [Status.SkP[0], Status.UnP[0]], allocations: Status.Skill.map(row => row.slice()) }); return; }
    capture(skill.id);
    results[results.length - 1].learned = Learn[0].slice().sort();
  });
  return { results, unavailable, failures, errors };
}

const blocks = [];
for (let start = 0; start < equipment.records.length; start += 100) blocks.push({ name: 'equipment ' + start, gearToAudit: equipment.records.slice(start, start + 100), souls: [], skills: [] });
for (let start = 0; start < souls.records.length; start += 30) blocks.push({ name: 'Souls ' + start, gearToAudit: [], souls: souls.records.slice(start, start + 30), skills: [] });
for (let start = 0; start < skills.records.length; start += 20) blocks.push({ name: 'skills ' + start, gearToAudit: [], souls: [], skills: skills.records.slice(start, start + 20) });
blocks.push({ name: '28 classes and 18 racial selections', gearToAudit: [], souls: [], skills: [], auditCharacters: true });

for (const block of blocks) test('catalog differential: ' + block.name, async ({ page, context }, testInfo) => {
  test.setTimeout(180000);
  await page.route('https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog*', route => route.fulfill({ status: 503, json: { ok: false } }));
  await page.goto('/'); await page.evaluate(() => PandoraRemaked.catalog.useRevision(0));
  const input = { equipment: equipment.records, allSkills: skills.records, ...block };
  const modern = await page.evaluate(auditCatalog, input);
  const museum = await context.newPage(); await museum.goto('/legacy/?lang=en');
  const legacy = await museum.evaluate(auditCatalog, input); await museum.close();
  await testInfo.attach('catalog-audit-coverage', { body: JSON.stringify({ modernCount: modern.results.length, legacyCount: legacy.results.length, unavailable: modern.unavailable, failures: modern.failures, modernErrors: modern.errors, legacyErrors: legacy.errors }), contentType: 'application/json' });
  expect(modern.errors).toEqual([]);
  // These exact, independently reproduced museum defects are repaired by the
  // Modern adapter. Any additional source or Modern exception still fails.
  const sourceDefects = [
    { id: 'equipment.12.29', message: "Cannot read properties of undefined (reading '0')" },
    { id: 'equipment.42.32', message: "Cannot read properties of undefined (reading 'push')" }
  ].filter(error => block.gearToAudit.some(item => item.id === error.id));
  expect(legacy.errors).toEqual(sourceDefects);
  expect(modern.failures).toEqual([]); expect(legacy.failures).toEqual([]);
  const unavailable = block.souls.filter(soul => soul.id === 'soul.138').map(soul => soul.id);
  expect(modern.unavailable).toEqual(unavailable); expect(legacy.unavailable).toEqual(modern.unavailable);
  const expectedCount = block.gearToAudit.length + block.souls.length - unavailable.length + block.skills.length + (block.auditCharacters ? 46 : 0);
  expect(modern.results).toHaveLength(expectedCount); expect(legacy.results).toHaveLength(expectedCount);
  for (let index = 0; index < modern.results.length; index++) {
    if (legacy.errors.some(error => error.id === modern.results[index].id)) continue;
    expect(modern.results[index], modern.results[index].id).toEqual(legacy.results[index]);
  }
});
