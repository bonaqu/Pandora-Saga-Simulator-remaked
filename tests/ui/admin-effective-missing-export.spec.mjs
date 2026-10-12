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
    const audited=window.auditTraffic.filter(x=>new URL(x.url).searchParams.get('status')==='missing').length;
    const drift=window.coverageDrift&&audited>8&&scope==='game'&&locale==='jp';
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
  expect(report.coverage).toHaveLength(8);
  expect(report.missing).toHaveLength(8);
  expect(report.observedMissingCount).toBe(4);
  expect(report.missing.find(e=>e.scope==='game'&&e.locale==='jp').ids.map(x=>x.id))
    .toEqual(['equipment.0.2','skill_entry.7.5']);
  expect(report.missing.find(e=>e.scope==='game'&&e.locale==='tw').ids.map(x=>x.id))
    .toEqual(['equipment.0.2']);
  expect(report.missing.find(e=>e.scope==='ui'&&e.locale==='ru').ids.map(x=>x.id))
    .toEqual(['toolbar.missingText']);
  for(const secret of ['PRIVATE_REDACT_ME','PRIVATE_BASELINE','PRIVATE_EN',
    'csrfToken','password','override','drafts'])expect(reportText).not.toContain(secret);
  const traffic=await page.evaluate(()=>window.auditTraffic);
  expect(traffic.filter(x=>new URL(x.url).searchParams.get('status')==='missing')).toHaveLength(11);
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
