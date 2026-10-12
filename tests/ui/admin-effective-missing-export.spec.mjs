import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const data=[
  {scope:'game',locale:'jp',ids:['equipment.0.2','skill_entry.7.5']},
  {scope:'game',locale:'tw',ids:['equipment.0.2']},
  {scope:'ui',locale:'ru',ids:['toolbar.missingText']}
];

function initMock(){
  window.PandoraAdminI18n={t:(_key,fallback)=>fallback,apply:()=>{}};
  window.PandoraBulkLocalization={mount:()=>({invalidate(){},destroy(){}})};
  window.auditTraffic=[];
  window.coverageDrift=false;
  window.sameCountIdDrift=false;
  window.sameCountKindDrift=false;
  window.crossLocaleKindConflict=false;
  window.previouslyEmptyGroupDrift=false;
  window.fetch=async(url,options)=>{
    const route=new URL(String(url),location.href),scope=route.searchParams.get('scope')||'game',
      locale=route.searchParams.get('locale')||'ru',status=route.searchParams.get('status'),
      page=Number(route.searchParams.get('page')||0);
    window.auditTraffic.push({url:route.href,method:options?.method||'GET'});
    if(!route.pathname.endsWith('/api/admin/localization'))
      return new Response(JSON.stringify({ok:false}),{status:404});
    const groups=[
      {scope:'game',locale:'jp',ids:['equipment.0.2','skill_entry.7.5']},
      {scope:'game',locale:'tw',ids:['equipment.0.2']},
      {scope:'ui',locale:'ru',ids:['toolbar.missingText']}
    ];
    const rows=(groups.find(v=>v.scope===scope&&v.locale===locale)?.ids||[])
      .map(id=>({scope,locale,id,kind:id.includes('equipment')?'equipment':
        id.includes('skill')?'skill_entry':'interface',origin:'fallback',
        // These values must NEVER leak into downloaded diagnostic metadata.
        effective:'PRIVATE_REDACT_ME',baseline:'PRIVATE_BASELINE',source:{en:'PRIVATE_EN'}}));
    if(window.crossLocaleKindConflict&&scope==='game'&&locale==='tw')
      rows.find(row=>row.id==='equipment.0.2').kind='skill_entry';
    const audited=window.auditTraffic.filter(x=>new URL(x.url).searchParams.get('status')==='missing').length;
    // 8 audit reads, 3 first-pass rows: the first verification GET is #12.
    if(audited>=12&&scope==='game'&&locale==='jp'&&status==='missing'){
      if(window.sameCountIdDrift)rows[0].id='equipment.0.9999';
      if(window.sameCountKindDrift)rows[0].kind='skill_entry';
    }
    const drift=window.coverageDrift&&audited>8&&scope==='game'&&locale==='jp';
    if(audited>=12&&window.previouslyEmptyGroupDrift&&
        scope==='ui'&&locale==='en'&&status==='missing'){
      rows.push({scope,locale,id:'toolbar.newlyMissing',kind:'interface',
        origin:'fallback',effective:'',source:{en:'PRIVATE_EN'}});
    }
    const response={ok:true,schemaVersion:1,scope,locale,status,page,pageSize:40,
      coverage:{total:rows.length+4,translated:4},total:status==='missing'?rows.length:0,
      items:status==='missing'?rows.slice(page*40,(page+1)*40):[],
      counts:{game:9,ui:5}};
    if(drift)response.total++;
    return new Response(JSON.stringify(response),{headers:{'content-type':'application/json'}});
  };
}

test('owner can download 8-locale effective missing IDs with no D1 writes or translation text',async({page})=>{
  await page.goto('/');
  await page.setContent('<div id="localization-console"></div>');
  await page.evaluate(initMock);
  await page.addScriptTag({path:'admin-api/public/localization-console.js'});
  await page.evaluate(()=>window.PandoraLocalizationConsole.start(()=>'',()=>{}));
  await page.locator('[data-admin-i18n="adminShell.locAuditAction"]').click();
  await expect(page.locator('.localization-audit-row')).toHaveCount(8);
  const exportButton=page.locator('[data-coverage-export]');
  await expect(exportButton).toBeEnabled();
  const downloadEvent=page.waitForEvent('download');
  await exportButton.click();
  const download=await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^pandora-effective-missing-translations-\d{4}-\d{2}-\d{2}\.json$/);
  const reportText=fs.readFileSync(await download.path(),'utf8');
  const report=JSON.parse(reportText);
  expect(report.schemaVersion).toBe(1);
  expect(report.readOnly).toBe(true);
  expect(report.atomic).toBe(false);
  expect(report.includesTranslationText).toBe(false);
  expect(report.verificationPasses).toBe(2);
  expect(report.identitiesCompared).toBe(true);
  expect(report.coverage).toHaveLength(8);
  expect(report.missing).toHaveLength(8);
  expect(report.observedMissingCount).toBe(4);
  expect(report.jpTwComparison).toHaveLength(2);
  expect(report.jpTwComparison[0].scope).toBe('game');
  expect(report.jpTwComparison[0].counts).toEqual({both:1,jpOnly:1,twOnly:0});
  expect(report.jpTwComparison[0].both)
    .toEqual([{id:'equipment.0.2',kind:'equipment',managedBy:'translation'}]);
  expect(report.jpTwComparison[0].jpOnly.map(x=>x.id)).toEqual(['skill_entry.7.5']);
  expect(report.jpTwComparison[0].twOnly).toEqual([]);
  expect(report.jpTwComparison[0].byKind).toEqual([
    {kind:'equipment',both:1,jpOnly:0,twOnly:0},
    {kind:'skill_entry',both:0,jpOnly:1,twOnly:0}
  ]);
  expect(report.jpTwComparison[1].scope).toBe('ui');
  expect(report.jpTwComparison[1].counts).toEqual({both:0,jpOnly:0,twOnly:0});
  await expect(page.locator('.localization-audit-jptw-summary .localization-audit-jptw-row')).toHaveCount(2);
  await expect(page.locator('.localization-audit-jptw-row').first())
    .toContainText('оба языка: 1 · только JP: 1 · только TW: 0');
  await page.evaluate(()=>{
    window.PandoraAdminI18n.t=(key,fallback)=>key==='adminShell.locAuditCompareCounts'
      ? 'D1 both {both} · JP {jpOnly} · TW {twOnly}' : fallback;
    window.dispatchEvent(new Event('pandora-admin:localechange'));
  });
  await expect(page.locator('.localization-audit-jptw-row').first())
    .toContainText('D1 both 1 · JP 1 · TW 0');
  expect(report.missing.find(e=>e.scope==='game'&&e.locale==='jp').ids.map(x=>x.id))
    .toEqual(['equipment.0.2','skill_entry.7.5']);
  expect(report.missing.find(e=>e.scope==='game'&&e.locale==='tw').ids.map(x=>x.id))
    .toEqual(['equipment.0.2']);
  expect(report.missing.find(e=>e.scope==='ui'&&e.locale==='ru').ids.map(x=>x.id))
    .toEqual(['toolbar.missingText']);
  for(const secret of ['PRIVATE_REDACT_ME','PRIVATE_BASELINE','PRIVATE_EN',
    'csrfToken','password','override','drafts'])expect(reportText).not.toContain(secret);
  const traffic=await page.evaluate(()=>window.auditTraffic);
  expect(traffic.filter(x=>new URL(x.url).searchParams.get('status')==='missing')).toHaveLength(19);
  expect(traffic.every(x=>x.method==='GET')).toBe(true);
  await expect(page.locator('.localization-audit > p').last()).toContainText('Отчёт собран: 4 ID');
});

test('a changing D1 coverage total aborts safely without a partial download',async({page})=>{
  await page.goto('/');
  await page.setContent('<div id="localization-console"></div>');
  await page.evaluate(initMock);
  await page.addScriptTag({path:'admin-api/public/localization-console.js'});
  await page.evaluate(()=>window.PandoraLocalizationConsole.start(()=>'',()=>{}));
  await page.locator('[data-admin-i18n="adminShell.locAuditAction"]').click();
  await expect(page.locator('.localization-audit-row')).toHaveCount(8);
  const saved=page.evaluate(()=>window.coverageDrift=true);
  await saved;
  const downloads=[];page.on('download',v=>downloads.push(v));
  await page.locator('[data-coverage-export]').click();
  await expect(page.locator('.localization-audit > p').last())
    .toContainText('Выгрузка остановлена');
  await expect(page.locator('.localization-audit > p').last())
    .toContainText('Неполный файл не создан');
  expect(downloads).toHaveLength(0);
  expect((await page.evaluate(()=>window.auditTraffic)).every(x=>x.method==='GET')).toBe(true);
});


for(const [flag,description] of [
  ['sameCountIdDrift','a same-count ID replacement'],
  ['sameCountKindDrift','same-count identity metadata drift']
]){
  test('a second-pass D1 check rejects '+description+' with no download or publication',async({page})=>{
    await page.goto('/');
    await page.setContent('<div id="localization-console"></div>');
    await page.evaluate(initMock);
    await page.addScriptTag({path:'admin-api/public/localization-console.js'});
    await page.evaluate(()=>window.PandoraLocalizationConsole.start(()=>'',()=>{}));
    await page.locator('[data-admin-i18n="adminShell.locAuditAction"]').click();
    await expect(page.locator('.localization-audit-row')).toHaveCount(8);
    await page.evaluate(flag=>window[flag]=true,flag);
    const downloads=[];page.on('download',file=>downloads.push(file));
    await page.locator('[data-coverage-export]').click();
    await expect(page.locator('.localization-audit > p').last()).toContainText('Выгрузка остановлена');
    expect(downloads).toHaveLength(0);
    const traffic=await page.evaluate(()=>window.auditTraffic);
    expect(traffic.filter(x=>new URL(x.url).searchParams.get('status')==='missing').length)
      .toBeGreaterThanOrEqual(12);
    expect(traffic.every(x=>x.method==='GET')).toBe(true);
    await expect(page.locator('[data-coverage-export]')).toBeEnabled();
  });
}


test('a locale group that was empty during audit is rechecked before export',async({page})=>{
  await page.goto('/');
  await page.setContent('<div id="localization-console"></div>');
  await page.evaluate(initMock);
  await page.addScriptTag({path:'admin-api/public/localization-console.js'});
  await page.evaluate(()=>window.PandoraLocalizationConsole.start(()=>'',()=>{}));
  await page.locator('[data-admin-i18n="adminShell.locAuditAction"]').click();
  await expect(page.locator('.localization-audit-row')).toHaveCount(8);
  await page.evaluate(()=>window.previouslyEmptyGroupDrift=true);
  const downloads=[];page.on('download',x=>downloads.push(x));
  await page.locator('[data-coverage-export]').click();
  await expect(page.locator('.localization-audit > p').last()).toContainText('Выгрузка остановлена');
  expect(downloads).toHaveLength(0);
  expect((await page.evaluate(()=>window.auditTraffic)).every(x=>x.method==='GET')).toBe(true);
});

test('incompatible JP and TW catalog metadata blocks overlap export even with stable two-pass counts',async({page})=>{
  await page.goto('/');
  await page.setContent('<div id="localization-console"></div>');
  await page.evaluate(initMock);
  await page.addScriptTag({path:'admin-api/public/localization-console.js'});
  await page.evaluate(()=>window.PandoraLocalizationConsole.start(()=>'',()=>{}));
  await page.locator('[data-admin-i18n="adminShell.locAuditAction"]').click();
  await expect(page.locator('.localization-audit-row')).toHaveCount(8);
  await page.evaluate(()=>window.crossLocaleKindConflict=true);
  const downloads=[];page.on('download',x=>downloads.push(x));
  await page.locator('[data-coverage-export]').click();
  await expect(page.locator('.localization-audit > p').last())
    .toContainText('Выгрузка остановлена');
  await expect(page.locator('.localization-audit > p').last())
    .toContainText('JP/TW identity metadata conflict');
  expect(downloads).toHaveLength(0);
  await expect(page.locator('.localization-audit-jptw-summary')).toHaveCount(0);
  const traffic=await page.evaluate(()=>window.auditTraffic);
  expect(traffic.every(x=>x.method==='GET')).toBe(true);
  expect(traffic.filter(x=>new URL(x.url).searchParams.get('status')==='missing')).toHaveLength(19);
});
