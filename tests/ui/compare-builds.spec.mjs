import { test, expect } from '@playwright/test';

async function openModern(page) {
  await page.goto('/');
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
}

async function seedBuilds(page) {
  await openModern(page);
  return page.evaluate(() => {
    const adapter = window.PandoraRemaked.adapter;
    const store = window.PandoraRemaked.buildStore;
    localStorage.removeItem(store.AUTOSAVE_KEY);
    localStorage.removeItem(store.BUILDS_KEY);

    const active = adapter.serialize();
    const first = store.saveBuild('Build A', active);
    if (!first.ok) throw new Error(first.error?.message || 'Could not save Build A');

    const race = document.getElementById('SelRace');
    const originalRace = race.selectedIndex;
    race.selectedIndex = (originalRace + 1) % race.options.length;
    race.dispatchEvent(new Event('change', { bubbles: true }));
    const changed = adapter.serialize();
    adapter.load(active);

    const second = store.saveBuild('Build B', changed);
    if (!second.ok) throw new Error(second.error?.message || 'Could not save Build B');

    return {
      a: first.build,
      b: second.build,
      active,
      legacyFile: localStorage.getItem('file'),
      autosave: localStorage.getItem(store.AUTOSAVE_KEY),
      named: localStorage.getItem(store.BUILDS_KEY)
    };
  });
}

async function choosePair(page, ids) {
  await page.locator('[data-remaked-compare-a]').selectOption(ids.a.id);
  await page.locator('[data-remaked-compare-b]').selectOption(ids.b.id);
}

test('differences-only filters identical numeric and unavailable rows without modifying any build', async ({ page }) => {
  const builds = await seedBuilds(page);
  await page.locator('[data-remaked-compare-open]').click(); await choosePair(page, builds);
  const rows = page.locator('[data-remaked-compare-row]');
  await expect(rows.first()).toBeVisible();
  const all = await rows.count();
  const unchanged = await page.locator('[data-remaked-compare-row][data-equal="true"]').count();
  expect(unchanged).toBeGreaterThan(0); expect(unchanged).toBeLessThan(all);
  await page.getByRole('checkbox', { name: 'Hide identical stats' }).check();
  await expect(rows.locator(':scope:visible')).toHaveCount(all - unchanged);
  await page.getByRole('checkbox', { name: 'Hide identical stats' }).uncheck();
  await expect(rows.locator(':scope:visible')).toHaveCount(all);
  expect(await page.evaluate(() => PandoraRemaked.adapter.serialize())).toBe(builds.active);
  await page.locator('[data-remaked-compare-a]').selectOption(builds.a.id);
  const twin = await page.evaluate(payload => PandoraRemaked.buildStore.saveBuild('Twin', payload).build, builds.a.payload);
  await page.locator('[data-remaked-compare-refresh]').click();
  await page.locator('[data-remaked-compare-b]').selectOption(twin.id);
  await page.getByRole('checkbox', { name: 'Hide identical stats' }).check();
  await expect(page.locator('[data-remaked-compare-identical]')).toHaveText('All displayed stats are identical.');
  await expect(rows.locator(':scope:visible')).toHaveCount(0);
});

test('equal-row filtering never equates missing values, zero or incompatible units', async ({ page }) => {
  await openModern(page);
  const actual = await page.evaluate(() => {
    const equal = PandoraRemaked.compare.identicalFields;
    return [equal({ value: null, display: '---', unit: '%' }, { value: 0, display: '0', unit: '%' }),
      equal({ value: 5, display: '5', unit: '' }, { value: 5, display: '5', unit: '%' }),
      equal({ value: null, display: '---', unit: '' }, { value: null, display: '---', unit: '' }),
      equal({ value: null, display: '---', unit: '' }, { value: null, display: '', unit: '' })];
  });
  expect(actual).toEqual([false, false, true, false]);
});

test('Compare Builds tool opens from Modern tools and lists named builds', async ({ page }) => {
  const builds = await seedBuilds(page);
  const trigger = page.locator('[data-remaked-compare-open]');
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.locator('[data-remaked-compare]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Compare Builds', exact: true })).toBeVisible();
  await expect(page.locator('[data-remaked-compare-a] option')).toHaveCount(3);
  await expect(page.locator('[data-remaked-compare-b] option')).toHaveCount(3);
  await expect(page.locator('[data-remaked-compare-a] option', { hasText: builds.a.name })).toHaveCount(1);
  await expect(page.locator('[data-remaked-compare-b] option', { hasText: builds.b.name })).toHaveCount(1);
});

test('comparing two saved builds renders metadata and neutral B minus A deltas without mutating current state', async ({ page }) => {
  const builds = await seedBuilds(page);
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page, builds);

  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
  await expect(page.locator('[data-remaked-compare-row]')).not.toHaveCount(0);
  await expect(page.locator('[data-remaked-compare-meta-a]')).toContainText('Build A');
  await expect(page.locator('[data-remaked-compare-meta-b]')).toContainText('Build B');

  const state = await page.evaluate(() => {
    const adapter = window.PandoraRemaked.adapter;
    const store = window.PandoraRemaked.buildStore;
    return {
      active: adapter.serialize(),
      legacyFile: localStorage.getItem('file'),
      autosave: localStorage.getItem(store.AUTOSAVE_KEY),
      named: localStorage.getItem(store.BUILDS_KEY)
    };
  });
  expect(state).toEqual({
    active: builds.active,
    legacyFile: builds.legacyFile,
    autosave: builds.autosave,
    named: builds.named
  });

  const deltaCells = page.locator('[data-remaked-delta]');
  const count = await deltaCells.count();
  const directions = [];
  for (let index = 0; index < count; index += 1) {
    directions.push(await deltaCells.nth(index).getAttribute('data-direction'));
  }
  expect(directions.length).toBeGreaterThan(5);
  expect(directions.every((value) => ['up', 'down', 'flat', 'unavailable'].includes(value))).toBe(true);
  await expect(page.locator('[data-remaked-compare]')).not.toContainText(/winner|better|best|worse/i);
});

test('delta helper reports signed B minus A differences and unavailable values without judging them', async ({ page }) => {
  await openModern(page);
  const values = await page.evaluate(() => {
    const compare = window.PandoraRemaked.compare;
    return [
      compare.computeDelta({ value: 100, unit: '' }, { value: 137, unit: '' }),
      compare.computeDelta({ value: 15, unit: '%' }, { value: 13, unit: '%' }),
      compare.computeDelta({ value: 10, unit: '' }, { value: 10, unit: '' }),
      compare.computeDelta({ value: null, unit: '' }, { value: 10, unit: '' })
    ];
  });
  expect(values[0]).toEqual({ value: 37, display: '+37', direction: 'up' });
  expect(values[1]).toEqual({ value: -2, display: '-2%', direction: 'down' });
  expect(values[2]).toEqual({ value: 0, display: '0', direction: 'flat' });
  expect(values[3]).toEqual({ value: null, display: '—', direction: 'unavailable' });
});

test('fewer than two valid builds shows a clear empty state instead of fake comparison data', async ({ page }) => {
  await openModern(page);
  await page.evaluate(() => {
    const store = window.PandoraRemaked.buildStore;
    localStorage.removeItem(store.BUILDS_KEY);
    store.saveBuild('Only build', window.PandoraRemaked.adapter.serialize());
  });
  await page.locator('[data-remaked-compare-open]').click();
  await expect(page.locator('[data-remaked-compare-empty]')).toBeVisible();
  await expect(page.locator('[data-remaked-compare-empty]')).toContainText(/at least two/i);
  await expect(page.locator('[data-remaked-compare-table]')).toBeHidden();
});

test('deleted selected build becomes an explicit recoverable error', async ({ page }) => {
  const builds = await seedBuilds(page);
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page, builds);
  await page.evaluate((id) => window.PandoraRemaked.buildStore.deleteBuild(id), builds.b.id);
  await page.locator('[data-remaked-compare-refresh]').click();
  await expect(page.locator('[data-remaked-compare-status]')).toContainText(/no longer available|choose two|at least two/i);
  await expect(page.locator('[data-remaked-compare-table]')).toBeHidden();
});

test('Escape closes Compare Builds and returns focus to the opener', async ({ page }) => {
  await seedBuilds(page);
  const trigger = page.locator('[data-remaked-compare-open]');
  await trigger.focus();
  await trigger.click();
  await expect(page.locator('[data-remaked-compare]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-remaked-compare]')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('Compare Builds remains usable at 390px without body-level horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const builds = await seedBuilds(page);
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page, builds);
  await expect(page.locator('[data-remaked-compare]')).toBeVisible();
  const size = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth + 1);
  await expect(page.locator('[data-remaked-compare-a]')).toBeVisible();
  await expect(page.locator('[data-remaked-compare-b]')).toBeVisible();
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
});

test('blocked browser storage reports an actual read error and recovers without losing builds',async({page})=>{
  const builds=await seedBuilds(page);
  await page.evaluate(()=>{
    window.restoreNamedStorageGet=Storage.prototype.getItem;
    Storage.prototype.getItem=function(key){
      if(key===PandoraRemaked.buildStore.BUILDS_KEY)throw new DOMException('blocked','SecurityError');
      return window.restoreNamedStorageGet.call(this,key);
    };
  });
  await page.locator('[data-remaked-compare-open]').click();
  await expect(page.locator('[data-remaked-compare-empty]')).toContainText(/unavailable.*storage-unavailable/i);
  await expect(page.locator('[data-remaked-compare-status]')).toContainText(/could not be read/i);
  await expect(page.locator('[data-remaked-compare-status]')).toHaveAttribute('data-state','error');
  await expect(page.locator('[data-remaked-compare-table]')).toBeHidden();
  await page.evaluate(()=>{Storage.prototype.getItem=window.restoreNamedStorageGet;});
  await page.locator('[data-remaked-compare-refresh]').click();
  await choosePair(page,builds);
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
  expect(await page.evaluate(()=>PandoraRemaked.buildStore.listBuilds().builds.length)).toBe(2);
  expect(await page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(builds.active);
});

test('duplicate persisted build IDs are ignored with a warning but the other two can still compare',async({page})=>{
  const builds=await seedBuilds(page);
  const original=await page.evaluate(()=>{
    const key=PandoraRemaked.buildStore.BUILDS_KEY;
    const record=JSON.parse(localStorage.getItem(key));
    record.builds.push({...record.builds[0],name:'Malicious duplicate ID'});
    localStorage.setItem(key,JSON.stringify(record));
    return localStorage.getItem(key);
  });
  await page.locator('[data-remaked-compare-open]').click();
  await expect(page.locator('[data-remaked-compare-a] option')).toHaveCount(3);
  const listed=await page.evaluate(()=>PandoraRemaked.buildStore.listBuilds());
  expect(listed.ok).toBe(false);
  expect(listed.error).toMatchObject({code:'corrupt-entries',invalidCount:1});
  expect(listed.builds.map(x=>x.id)).toEqual([builds.a.id,builds.b.id]);
  await choosePair(page,builds);
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
  await expect(page.locator('[data-remaked-compare-status]')).toHaveAttribute('data-state','warning');
  await expect(page.locator('[data-remaked-compare-status]')).toContainText(/damaged/i);
  expect(await page.evaluate(()=>localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY))).toBe(original);
  expect(await page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(builds.active);
});

test('comparing B vs A reverses deltas and value columns without touching the active character',async({page})=>{
  const builds=await seedBuilds(page);
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page,builds);
  await expect(page.locator('[data-remaked-compare-meta-a]')).toContainText(builds.a.name);
  const read=()=>page.evaluate(()=>({
    rows:Array.from(document.querySelectorAll('[data-remaked-compare-row]')).map(row=>({
      key:row.dataset.statKey,
      a:row.querySelector('[data-remaked-value-a]').textContent,
      b:row.querySelector('[data-remaked-value-b]').textContent,
      delta:row.querySelector('[data-remaked-delta]').textContent,
      direction:row.querySelector('[data-remaked-delta]').dataset.direction
    })),
    active:PandoraRemaked.adapter.serialize(),
    stored:localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY)
  }));
  const before=await read();
  await page.locator('[data-remaked-compare-a]').selectOption(builds.b.id);
  await page.locator('[data-remaked-compare-b]').selectOption(builds.a.id);
  await expect(page.locator('[data-remaked-compare-meta-a]')).toContainText(builds.b.name);
  await expect(page.locator('[data-remaked-compare-meta-b]')).toContainText(builds.a.name);
  const after=await read();
  expect(before.rows.length).toBeGreaterThan(5);
  expect(after.rows.length).toBe(before.rows.length);
  for(const [index,row] of before.rows.entries()){
    const reverse=after.rows[index];
    expect(reverse.key).toBe(row.key);
    expect(reverse.a).toBe(row.b);
    expect(reverse.b).toBe(row.a);
    const flipped={up:'down',down:'up',flat:'flat',unavailable:'unavailable'};
    expect(reverse.direction).toBe(flipped[row.direction]);
    if(row.direction==='flat')expect(reverse.delta).toBe(row.delta);
    if(row.direction==='unavailable')expect(reverse.delta).toBe('—');
  }
  expect(after.active).toBe(before.active);
  expect(after.stored).toBe(before.stored);
});

test('deleted, duplicated and renamed builds update an open comparison without manual Refresh',async({page})=>{
  const builds=await seedBuilds(page);
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page,builds);
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();

  const removed=await page.evaluate(id=>PandoraRemaked.buildStore.deleteBuild(id),builds.b.id);
  expect(removed.ok).toBe(true);
  await expect(page.locator('[data-remaked-compare-table]')).toBeHidden();
  await expect(page.locator('[data-remaked-compare-status]')).toContainText(/no longer available|at least two/i);
  await expect(page.locator('[data-remaked-compare-b] option')).toHaveCount(2);

  const twin=await page.evaluate(id=>PandoraRemaked.buildStore.duplicateBuild(id),builds.a.id);
  expect(twin.ok).toBe(true);
  await expect(page.locator('[data-remaked-compare-b] option')).toHaveCount(3);
  await page.locator('[data-remaked-compare-b]').selectOption(twin.build.id);
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();

  const renamed=await page.evaluate(id=>PandoraRemaked.buildStore.updateBuild(id,{name:'Renamed during comparison'}),builds.a.id);
  expect(renamed.ok).toBe(true);
  await expect(page.locator('[data-remaked-compare-a] option:checked')).toHaveText('Renamed during comparison');
  await expect(page.locator('[data-remaked-compare-meta-a]')).toContainText('Renamed during comparison');
  expect(await page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(builds.active);
});

test('invalid build payload fails closed, then a repaired build compares without reopening',async({page})=>{
  const builds=await seedBuilds(page);
  const edited=await page.evaluate(id=>PandoraRemaked.buildStore.updateBuild(id,{payload:'invalid-code'}),builds.b.id);
  expect(edited.ok).toBe(true);
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page,builds);
  await expect(page.locator('[data-remaked-compare-status]')).toHaveAttribute('data-state','error');
  await expect(page.locator('[data-remaked-compare-table]')).toBeHidden();
  expect(await page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(builds.active);
  const restored=await page.evaluate(({id,payload})=>PandoraRemaked.buildStore.updateBuild(id,{payload}),{id:builds.b.id,payload:builds.b.payload});
  expect(restored.ok).toBe(true);
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
  await expect(page.locator('[data-remaked-compare-meta-b]')).toContainText(builds.b.name);
  expect(await page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(builds.active);
});

test('an obsolete asynchronous comparison cannot replace a newer selected pair',async({page})=>{
  const builds=await seedBuilds(page);
  const twin=await page.evaluate(id=>PandoraRemaked.buildStore.duplicateBuild(id),builds.a.id);
  expect(twin.ok).toBe(true);
  await page.evaluate(payload=>{
    const catalog=PandoraRemaked.catalog,original=catalog.prepareCurrentPayload;
    window.deferCompareStarted=false;
    window.releaseOldComparison=null;
    let once=true;
    catalog.prepareCurrentPayload=async function(candidate){
      if(once && candidate===payload){
        once=false;
        await new Promise(resolve=>{window.releaseOldComparison=resolve;window.deferCompareStarted=true;});
      }
      return original.apply(this,arguments);
    };
  },builds.a.payload);
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page,builds);
  await expect.poll(()=>page.evaluate(()=>window.deferCompareStarted)).toBe(true);
  await page.locator('[data-remaked-compare-a]').selectOption(builds.b.id);
  await page.locator('[data-remaked-compare-b]').selectOption(twin.build.id);
  await expect(page.locator('[data-remaked-compare-meta-a]')).toContainText(builds.b.name);
  await expect(page.locator('[data-remaked-compare-meta-b]')).toContainText(twin.build.name);
  await page.evaluate(()=>window.releaseOldComparison());
  await expect(page.locator('[data-remaked-compare-meta-a]')).toContainText(builds.b.name);
  await expect(page.locator('[data-remaked-compare-meta-b]')).toContainText(twin.build.name);
  expect(await page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(builds.active);
});

test('RU/EN switching preserves selected builds and numeric comparison, including after reload',async({page})=>{
  const builds=await seedBuilds(page);
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page,builds);
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
  const original=await page.evaluate(()=>({
    pair:[document.querySelector('[data-remaked-compare-a]').value,document.querySelector('[data-remaked-compare-b]').value],
    state:PandoraRemaked.adapter.serialize(),
    saved:localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY)
  }));
  await page.evaluate(()=>PandoraRemaked.i18n.setLocale('ru'));
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
  await expect(page.locator('[data-remaked-compare-a]')).toHaveValue(builds.a.id);
  await expect(page.locator('[data-remaked-compare-b]')).toHaveValue(builds.b.id);
  await page.evaluate(()=>PandoraRemaked.i18n.setLocale('en'));
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-remaked-compare]')).toBeHidden();
  await page.reload();
  await expect(page.locator('[data-remaked-shell]')).toBeVisible();
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page,builds);
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
  const after=await page.evaluate(()=>({
    state:PandoraRemaked.adapter.serialize(),
    saved:localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY)
  }));
  expect(after.saved).toBe(original.saved);
  expect(original.pair).toEqual([builds.a.id,builds.b.id]);
  expect(after.state).toBe(original.state);
});

test('two legacy level-50 characters from different races migrate and compare without changing active character',async({page})=>{
  await openModern(page);
  const builds=await page.evaluate(async()=>{
    const ns=window.PandoraRemaked,original=ns.adapter.serialize(),store=ns.buildStore;
    localStorage.removeItem(store.BUILDS_KEY);
    function raceAt50(index,name){
      ns.adapter.load(original);
      const selector=document.getElementById('SelRace');
      if(selector.options.length<=index)throw Error('Required race is unavailable');
      selector.selectedIndex=index;
      selector.dispatchEvent(new Event('change',{bubbles:true}));
      window.StatusMove('Lev',49); window.CalcSet('Lev');
      const level=window.Status.Lev[0],race=window.Status.Job[0];
      const current=ns.adapter.serialize(),csv=ns.catalog.unpackPayload(current).payload;
      // Legacy source revision 0 is stored as raw CSV (no PS3:0 wrapper).
      const saved=store.saveBuild(name,csv);
      if(!saved.ok)throw Error('Cannot save source-revision level-50 build');
      return {level,race,id:saved.build.id,payload:saved.build.payload};
    }
    const a=raceAt50(3,'Всад Энкиду 50');
    const b=raceAt50(1,'Всад Эльф 50');
    ns.adapter.load(original);
    // Publish a newer, compatible catalog revision in the fixture so both
    // old level-50 builds MUST actually migrate before comparison.
    const baseline=await ns.catalog.fetchSnapshot(0);
    ns.catalog.applySnapshot({...baseline,revision:2,impactRevision:2,records:[]});
    ns.builds.flushAutosave();
    return {a,b,active:ns.adapter.serialize(),revision:ns.catalog.getRevision(),
      named:localStorage.getItem(store.BUILDS_KEY)};
  });
  expect(builds.revision).toBe(2);
  expect(builds.a.level).toBe(50);
  expect(builds.b.level).toBe(50);
  expect(builds.a.race).not.toBe(builds.b.race);
  await page.locator('[data-remaked-compare-open]').click();
  await page.locator('[data-remaked-compare-a]').selectOption(builds.a.id);
  await page.locator('[data-remaked-compare-b]').selectOption(builds.b.id);
  await expect(page.locator('[data-remaked-compare-table]'),
    'Compare failed: '+JSON.stringify(await page.evaluate(()=>PandoraRemaked.compare.lastFailure()))).toBeVisible();
  await expect(page.locator('[data-remaked-compare-row]')).not.toHaveCount(0);
  await expect(page.locator('[data-remaked-compare-meta-a]')).toContainText('50');
  await expect(page.locator('[data-remaked-compare-meta-b]')).toContainText('50');
  expect(await page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(builds.active);
  expect(await page.evaluate(()=>localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY))).toBe(builds.named);
});

test('comparison identifies which build has an invalid saved payload without deleting its record',async({page})=>{
  const builds=await seedBuilds(page);
  const changed=await page.evaluate(id=>PandoraRemaked.buildStore.updateBuild(id,{payload:'invalid-saved-code'}),builds.b.id);
  expect(changed.ok).toBe(true);
  const originalStorage=await page.evaluate(()=>localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY));
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page,builds);
  await expect(page.locator('[data-remaked-compare-status]')).toHaveAttribute('data-state','error');
  await expect(page.locator('[data-remaked-compare-status]')).toContainText('Build B');
  await expect(page.locator('[data-remaked-compare-status]')).toContainText(builds.b.name);
  const diagnostic=await page.evaluate(()=>PandoraRemaked.compare.lastFailure());
  expect(diagnostic).toMatchObject({side:'B',phase:'prepare',kind:'invalid',name:builds.b.name});
  expect(JSON.stringify(diagnostic)).not.toContain(builds.b.payload);
  expect(await page.evaluate(()=>localStorage.getItem(PandoraRemaked.buildStore.BUILDS_KEY))).toBe(originalStorage);
  expect(await page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(builds.active);
});

test('comparison distinguishes a catalog failure in A from an engine calculation failure in B',async({page})=>{
  const builds=await seedBuilds(page);
  await page.evaluate(()=>{
    const catalog=PandoraRemaked.catalog;
    window.originalComparePreparation=catalog.prepareCurrentPayload;
    catalog.prepareCurrentPayload=async function(){throw new Error('Catalog revision unavailable');};
  });
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page,builds);
  await expect(page.locator('[data-remaked-compare-status]')).toContainText(/game data.*Build A/i);
  expect(await page.evaluate(()=>PandoraRemaked.compare.lastFailure())).toMatchObject({side:'A',phase:'prepare',kind:'catalog'});
  await page.evaluate(()=>{
    PandoraRemaked.catalog.prepareCurrentPayload=window.originalComparePreparation;
    const adapter=PandoraRemaked.adapter;
    window.originalCompareEvaluation=adapter.evaluateBuild;
    let count=0;
    adapter.evaluateBuild=function(payload){
      if(++count===2)throw new Error('Synthetic calculation failed');
      return window.originalCompareEvaluation.call(this,payload);
    };
  });
  await page.locator('[data-remaked-compare-refresh]').click();
  await expect(page.locator('[data-remaked-compare-status]')).toContainText(/calculate.*Build B/i);
  expect(await page.evaluate(()=>PandoraRemaked.compare.lastFailure())).toMatchObject({side:'B',phase:'calculate',kind:'calculation'});
  await page.evaluate(()=>{PandoraRemaked.adapter.evaluateBuild=window.originalCompareEvaluation;});
  await page.locator('[data-remaked-compare-refresh]').click();
  await expect(page.locator('[data-remaked-compare-table]')).toBeVisible();
  expect(await page.evaluate(()=>PandoraRemaked.compare.lastFailure())).toBeNull();
  expect(await page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(builds.active);
});

test('Russian comparison error names the exact build and avoids vague generic errors',async({page})=>{
  const builds=await seedBuilds(page);
  await page.evaluate(()=>PandoraRemaked.i18n.setLocale('ru'));
  await page.evaluate(id=>PandoraRemaked.buildStore.updateBuild(id,{payload:'broken'}),builds.a.id);
  await page.locator('[data-remaked-compare-open]').click();
  await choosePair(page,builds);
  const status=page.locator('[data-remaked-compare-status]');
  await expect(status).toContainText('Билд A');
  await expect(status).toContainText(builds.a.name);
  await expect(status).toContainText('Не удалось прочитать сохранение');
  expect(await page.evaluate(()=>PandoraRemaked.compare.lastFailure())).toMatchObject({side:'A',phase:'prepare',kind:'invalid'});
  expect(await page.evaluate(()=>PandoraRemaked.adapter.serialize())).toBe(builds.active);
});

test('invalid old compressed text is rejected before calling the synchronous Legacy inflater',async({page})=>{
  await openModern(page);
  const result=await page.evaluate(()=>{
    const ns=PandoraRemaked,original=ns.adapter.serialize(),previous=window.RawDeflate.inflate;
    let called=false,error='';
    window.RawDeflate.inflate=function(){called=true;throw new Error('Unsafe inflater was called');};
    try{
      try{ns.catalog.migratePayload('invalid-saved-code');}
      catch(e){error=String(e.message||e);}
    }finally{window.RawDeflate.inflate=previous;}
    return {called,error,after:ns.adapter.serialize(),original};
  });
  expect(result.called).toBe(false);
  expect(result.error).toMatch(/Invalid compressed build code/);
  expect(result.after).toBe(result.original);
});
