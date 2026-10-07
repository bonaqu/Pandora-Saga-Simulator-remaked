import { test, expect } from '@playwright/test';
import { compileRecord, draftFromSource, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };

const publicApi = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog';
function publication(revision, records = [], impactRevision = revision) {
  return { ok: true, schemaVersion: 1, sourceFingerprint: equipment.metadata.generated_from[0].sha256,
    characterSourceFingerprint: character.sourceFingerprint, revision, impactRevision, records };
}
function editedWarrior(revision = 2) {
  const source = character.records.find(item => item.id === 'job.0');
  const id = { id: source.id, kind: 'class', category: null, index: 0 };
  const edit = draftFromSource(source, 'class'); edit.progression[0] += 100;
  edit.names.en = 'Published Warrior'; edit.names.ru = 'Опубликованный воин';
  return publication(revision, [compileRecord(validateDraft(edit, id), id, source)]);
}
function socketItems(revision = 1) {
  const next = equipment.records.filter(item => item.legacy_category_id === 0).length + 1;
  const records = ['equipment', 'soul'].map(kind => {
    const id = { id: 'modern.' + kind + '.adoption', kind, category: kind === 'equipment' ? 0 : null, index: kind === 'equipment' ? next : 185 };
    const edit = draftFromSource(null, kind);
    Object.assign(edit, { id: id.id, category: id.category, names: { en: 'Adoption ' + kind, ru: '', jp: '', tw: '' },
      sockets: kind === 'equipment' ? 2 : 0, baseAttack: kind === 'equipment' ? 70 : null,
      effects: kind === 'soul' ? [{ stat: 1, unit: 'flat', value: 7 }] : [] });
    return compileRecord(validateDraft(edit, id), id, null);
  });
  return publication(revision, records);
}
function addedEquipmentVariant(index) {
  const id = { id: 'modern.equipment.adoption-extra', kind: 'equipment', category: 0, index };
  const edit = draftFromSource(null, 'equipment');
  Object.assign(edit, {
    id: id.id,
    category: id.category,
    names: { en: 'Latest catalog variant', ru: 'Новый вариант каталога', jp: '', tw: '' },
    sockets: 1,
    baseAttack: 75,
    effects: []
  });
  return compileRecord(validateDraft(edit, id), id, null);
}
async function state(page) {
  return page.evaluate(() => ({ payload: PandoraRemaked.adapter.serialize(), revision: PandoraRemaked.catalog.getRevision(),
    context: PandoraRemaked.catalog.captureContext(), summary: PandoraRemaked.adapter.readCalculatedSummary(),
    storage: JSON.stringify(localStorage), arrays: JSON.stringify([EquipData, SoulData, Status.Mod]), hash: location.hash }));
}
async function openManager(page) {
  await page.goto('/'); await expect(page.locator('[data-remaked-autosave-status]')).not.toContainText('Autosave…');
  await page.locator('[data-remaked-builds-open]').click();
}
const runUpdate = page => page.evaluate(async () => { const result = await PandoraRemaked.builds.updateCurrentCatalog(); if (result.error) result.diagnostic = result.error.stack || result.error.message; return result; });
const status = page => page.locator('[data-remaked-catalog-status]');

async function install(page, original, next) {
  await page.route(publicApi + '**', route => {
    const url = new URL(route.request().url());
    const data = Number(url.searchParams.get('revision')) === original.revision ? original : next;
    const { records, ...head } = data;
    return route.fulfill({ json: url.pathname.endsWith('/head') ? head : data });
  });
  await page.goto('/');
  await expect(page.locator('[data-remaked-autosave-status]')).toHaveText('Autosave enabled');
  return page.evaluate(data => {
    PandoraRemaked.catalog.applySnapshot(data);
    PandoraRemaked.adapter.selectEquipment(0, data.records[0].engineId);
    PandoraRemaked.adapter.selectSoul({slotIndex:0,socketIndex:4}, data.records[1].engineId);
    PandoraRemaked.adapter.selectSoul({slotIndex:0,socketIndex:5}, data.records[1].engineId);
    PandoraRemaked.builds.flushAutosave();
    localStorage.setItem('file','legacy-sentinel');
    return PandoraRemaked.buildStore.saveBuild('Saved', PandoraRemaked.adapter.serialize()).build;
  }, original);
}

for (const conflict of ['equipment deleted','equipment incompatible','soul deleted','soul incompatible','fewer slots','disabled']) {
  test('current migration repairs only affected choices: ' + conflict, async ({page}) => {
    const old = socketItems(), next = structuredClone(old); next.revision=2; next.impactRevision=2;
    if (conflict==='equipment deleted') next.records.splice(0,1);
    if (conflict==='equipment incompatible') next.records[0].compatibility[8]=0;
    if (conflict==='soul deleted') next.records.splice(1,1);
    if (conflict==='soul incompatible') next.records[1].compatibility[0]=0;
    if (conflict==='fewer slots') next.records[0].sockets=1;
    if (conflict==='disabled') next.records[0].disabled=true;
    await install(page,old,next);
    const result=await runUpdate(page); expect(result.ok,JSON.stringify(result)).toBe(true);
    const data=await page.evaluate(()=>({revision:PandoraRemaked.catalog.getRevision(),equip:Status.Equip[0],builds:PandoraRemaked.buildStore.listBuilds().builds,autosave:PandoraRemaked.buildStore.readAutosave().record.payload,journal:localStorage.getItem(PandoraRemaked.buildStore.RECOVERY_KEY),legacy:localStorage.getItem('file')}));
    expect(data.revision).toBe(2); expect(data.builds).toHaveLength(1); expect(data.journal).toBeNull(); expect(data.legacy).toBe('legacy-sentinel');
    const removedItem=['equipment deleted','equipment incompatible','disabled'].includes(conflict);
    expect(Number(data.equip[0])).toBe(removedItem?0:old.records[0].engineId);
    expect(Number(data.equip[4])).toBe(conflict==='fewer slots'?old.records[1].engineId:0);
    expect(Number(data.equip[5])).toBe(0); expect(data.builds[0].payload).toMatch(/^PS3:2:/);
    expect(data.builds[0].migrationReport.length).toBeGreaterThan(0);
    await page.locator('[data-remaked-builds-open]').click();
    await expect(page.locator('[data-remaked-build-stale]')).toHaveCount(0);
    await expect(page.locator('[data-remaked-build-list] .remaked-build-row')).toHaveCount(1);
    await page.locator('[data-remaked-build-load]').click();
    expect(await page.evaluate(()=>PandoraRemaked.catalog.getRevision())).toBe(2);
  });
}

test('renamed stable entity stays equipped; literal stat changes are explained; all saved builds migrate',async({page})=>{
  const old=socketItems();old.records[0].calculationCode='18=W70_1=2';
  const next=structuredClone(old);next.revision=2;next.impactRevision=2;next.records[0].calculationCode='18=W70_1=1';next.records[0].names.en='Renamed';
  const saved=await install(page,old,next);
  const result=await runUpdate(page);expect(result.ok,JSON.stringify(result)).toBe(true);
  const delta=result.changes.find(x=>x.kind==='equipment'&&x.type==='changed');expect(delta.name).toBe('Renamed');expect(delta.details.join(' ')).toContain('2→1');
  expect(await page.evaluate(()=>Number(Status.Equip[0][0]))).toBe(old.records[0].engineId);
  expect(await page.evaluate(id=>PandoraRemaked.buildStore.getBuild(id).payload,saved.id)).toMatch(/^PS3:2:/);
  await page.locator('[data-remaked-builds-open]').click();
  await expect(page.locator('[data-remaked-catalog-status]')).toContainText('2→1');
  await page.locator('[data-remaked-build-load]').click();
  await expect(page.locator('[data-remaked-build-list] details')).toContainText('2→1');
});

test('loading a named build repairs against current data with no historical fallback',async({page})=>{
  const old=socketItems(),next=publication(2,[]);const saved=await install(page,old,next);
  await page.evaluate(data=>PandoraRemaked.catalog.applySnapshot(data,{rebuild:false}),next);
  await page.locator('[data-remaked-builds-open]').click();await page.locator('[data-remaked-build-load]').click();
  await expect.poll(()=>page.evaluate(()=>PandoraRemaked.catalog.getRevision())).toBe(2);
  await expect.poll(()=>page.evaluate(id=>PandoraRemaked.buildStore.getBuild(id).payload,saved.id)).toMatch(/^PS3:2:/);
  expect(await page.evaluate(()=>Number(Status.Equip[0][0]))).toBe(0);
  expect(await page.evaluate(()=>PandoraRemaked.buildStore.listBuilds().builds.length)).toBe(1);
});

test('quota failure before the journal write keeps character and all saved data',async({page})=>{
  const old=socketItems(),next=publication(2,[]);await install(page,old,next);
  const before=await state(page);
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
  expect((await runUpdate(page)).ok).toBe(false);expect(await state(page)).toEqual(before);
});

test('autosave write failure rolls back and retains an invisible recovery journal',async({page})=>{
  const old=socketItems(),next=publication(2,[]);await install(page,old,next);
  const before=await page.evaluate(()=>({payload:PandoraRemaked.adapter.serialize(),autosave:localStorage.getItem(PandoraRemaked.buildStore.AUTOSAVE_KEY)}));
  await page.evaluate(()=>{const native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===PandoraRemaked.buildStore.AUTOSAVE_KEY)throw new DOMException('Full','QuotaExceededError');return native.call(this,k,v);};});
  const result=await runUpdate(page);expect(result.ok).toBe(false);expect(result.reason).toBe('autosave-failed');expect(result.restored).toBe(true);
  expect(await page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(before.payload);
  expect(await page.evaluate(()=>localStorage.getItem(PandoraRemaked.buildStore.AUTOSAVE_KEY))).toBe(before.autosave);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem(PandoraRemaked.buildStore.RECOVERY_KEY)).payload)).toBe(before.payload);
  expect(await page.evaluate(()=>PandoraRemaked.buildStore.listBuilds().builds.length)).toBe(1);
});

test('a calculation failure restores state and can retry the same published catalog',async({page})=>{
  const old=socketItems(),next=publication(2,[]);await install(page,old,next);
  const before=await page.evaluate(()=>PandoraRemaked.adapter.serialize());
  await page.evaluate(()=>{const original=CalcSet;let once=true;window.CalcSet=function(){if(once){once=false;throw new Error('Synthetic calculation failure');}return original.apply(this,arguments);};});
  expect((await runUpdate(page)).ok).toBe(false);expect(await page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(before);
  expect((await runUpdate(page)).ok).toBe(true);expect(await page.evaluate(()=>PandoraRemaked.catalog.getRevision())).toBe(2);
});

test('offline check cannot treat cached data as a current publication',async({page})=>{
  const old=socketItems();await install(page,old,publication(2,[]));await page.unroute(publicApi+'**');
  await page.route(publicApi+'**',route=>route.abort());const before=await state(page);
  expect((await runUpdate(page)).ok).toBe(false);expect(await state(page)).toEqual(before);
});

test('pagehide flushes the last visible change before debounce expires',async({page})=>{
  await page.goto('/');await expect(page.locator('[data-remaked-autosave-status]')).toHaveText('Autosave enabled');
  const payload=await page.evaluate(()=>{StatusMove('Lev',1);CalcSet('Lev');PandoraRemaked.builds.scheduleAutosave();const payload=PandoraRemaked.adapter.serialize();window.dispatchEvent(new Event('pagehide'));return payload;});
  expect(await page.evaluate(()=>PandoraRemaked.buildStore.readAutosave().record.payload)).toBe(payload);
  await page.reload();await expect.poll(()=>page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(payload);
});

test('deleted learned skill variant loses its effect, keeps branch choices and appears in report', async ({page}) => {
  const { variant, snapshot } = await import('./helpers/skill-variants.mjs');
  const ability = variant('skill.0.1', edit => { edit.effects = [{stat: 1, value: 0.29, unit: 'flat'}]; });
  const old = snapshot([ability]), next = snapshot([],2);
  await page.route(publicApi + '**', route => route.fulfill({json: Number(new URL(route.request().url()).searchParams.get('revision'))===1 ? old : next}));
  await page.goto('/');
  const before = await page.evaluate(old => {
    StatusMove('Lev',11); CalcSet('Lev'); PandoraRemaked.catalog.applySnapshot(old);
    const payload=PandoraRemaked.adapter.serialize(); PandoraRemaked.builds.flushAutosave();
    PandoraRemaked.buildStore.saveBuild('Learned variant',payload);
    return { bonus: Status.STR[2], branches: JSON.stringify(Status.Skill), code: PandoraRemaked.shareCodec.encode(payload), payload };
  },old);
  expect(before.bonus).toBe(0.29);
  expect(await page.evaluate(code=>PandoraRemaked.shareCodec.decode(code),before.code)).toBe(before.payload);
  const updated=await runUpdate(page); expect(updated.ok,JSON.stringify(updated)).toBe(true);
  expect(updated.changes).toContainEqual(expect.objectContaining({type:'removed',kind:'skill',name:ability.names.en,reason:'missing'}));
  expect(await page.evaluate(()=>({bonus:Status.STR[2],branches:JSON.stringify(Status.Skill),variants:PandoraRemaked.catalog.variantSkills().length}))).toEqual({bonus:0,branches:before.branches,variants:0});
});

test('previous automatic repair backups are archived internally without losing their records', async ({page}) => {
  const old=socketItems(), next=socketItems(2); await install(page,old,next);
  const backup=await page.evaluate(()=>PandoraRemaked.buildStore.saveBuild('Backup before catalog 1→2',PandoraRemaked.adapter.serialize()).build);
  await page.reload(); await expect(page.locator('[data-remaked-autosave-status]')).toContainText('Restored autosave');
  const result=await page.evaluate(()=>({visible:PandoraRemaked.buildStore.listBuilds().builds,archive:JSON.parse(localStorage.getItem(PandoraRemaked.buildStore.RETIRED_BACKUPS_KEY))}));
  expect(result.visible.map(build=>build.name)).toEqual(['Saved']); expect(result.archive.builds).toContainEqual(backup);
  await page.locator('[data-remaked-builds-open]').click(); await expect(page.locator('[data-remaked-build-list] .remaked-build-row')).toHaveCount(1);
});

test('stable identity survives a new engine allocation while reused numeric identity cannot substitute a different item', async ({page}) => {
  const old=socketItems(), next=structuredClone(old); next.revision=2; next.impactRevision=2;
  const retained=next.records[0]; retained.index++; retained.engineId++; retained.names.en='Renamed retained weapon';
  retained.calculationCode=retained.calculationCode.replace('W70','W80');
  await install(page,old,next);
  const updated=await runUpdate(page); expect(updated.ok,JSON.stringify(updated)).toBe(true);
  expect(await page.evaluate(()=>Number(Status.Equip[0][0]))).toBe(retained.engineId);
  expect(updated.changes).toContainEqual(expect.objectContaining({type:'changed',name:'Renamed retained weapon'}));
});

test('a reused engine ID with a different stable identity removes only the original item', async ({page}) => {
  const old=socketItems(), next=structuredClone(old); next.revision=2; next.impactRevision=2;
  next.records[0].id='modern.equipment.new-identity'; next.records[0].engineKey='Modern:'+next.records[0].id; next.records[0].names.en='Different weapon';
  await install(page,old,next); const updated=await runUpdate(page); expect(updated.ok,JSON.stringify(updated)).toBe(true);
  expect(await page.evaluate(()=>Number(Status.Equip[0][0]))).toBe(0);
  expect(updated.changes).toContainEqual(expect.objectContaining({type:'removed',kind:'equipment',name:'Adoption equipment',reason:'missing'}));
});
