#!/usr/bin/env node
// Public evidence only: compare icons and historical names, never assign IDs.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CANDIDATES } from './audit_pandora_os_fire_weapon_candidates.mjs';
import { baselineById } from '../admin-api/src/catalog-baseline.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function fetchBytes(url) {
  const response = await fetch(url, {signal: AbortSignal.timeout(20000), headers: {'User-Agent':'PandoraSimulatorCatalogAudit/1.0'}});
  if (!response.ok) throw Error('HTTP '+response.status+' '+url);
  return Buffer.from(await response.arrayBuffer());
}
export function wikiIconUrl(html, japaneseName) {
  const matches = [];
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const attr = name => tag.match(new RegExp('\\b'+name+'="([^"]*)"','i'))?.[1] || '';
    const alt = attr('alt'), url = attr('src').replaceAll('&amp;','&');
    if (!alt.startsWith(japaneseName) || /SS\./i.test(alt) || attr('width') !== '42' || attr('height') !== '42') continue;
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'cdn.wikiwiki.jp') throw Error('Unexpected wiki icon host');
    if (!matches.includes(url)) matches.push(url);
  }
  return matches.length === 1 ? matches[0] : null;
}
async function main() {
  if(process.argv.length!==4) throw Error('Usage: node scripts/audit_pandora_os_fire_icons.mjs <candidate-report.json> <new-output-directory>');
  const report=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const itemsUrl='https://pandorasaga-os.com/gamedata/items.json';
  const bytes=await fetchBytes(itemsUrl), reference=report.sources.find(row=>row.url===itemsUrl);
  if(!reference || digest(bytes)!==reference.sha256) throw Error('Source items changed since candidate report');
  const items=JSON.parse(bytes.toString('utf8')), rows=[]; let wikiLimited=false;
  const output=path.resolve(process.argv[3]);fs.mkdirSync(output);
  for(const [serverId,projectId] of CANDIDATES) {
    const item=items[serverId], candidate=report.candidates.find(row=>row.serverId===serverId&&row.kind==='equipment');
    const original=baselineById.get(projectId), jp=original?.name?.jp;
    if(!candidate || !item || !jp || candidate.category!==original.legacy_category_id || !/^I_\d{6}_\d{2}$/.test(item.icon))
      throw Error('Candidate identity evidence is inconsistent: '+serverId);
    const wiki='https://wikiwiki.jp/pandoras/'+encodeURIComponent(jp), sourceIcon='https://pandorasaga-os.com/icons/items/'+item.icon+'.webp';
    const row={serverId,projectId,japaneseName:jp,wiki,sourceIcon};
    try {
      const source=await fetchBytes(sourceIcon);
      row.sourceSha256=digest(source);
      fs.writeFileSync(path.join(output,serverId+'-source.webp'),source,{flag:'wx'});
      if(wikiLimited) { row.issue='Historical host rate-limited; request not attempted'; rows.push(row); continue; }
      const html=await fetchBytes(wiki); row.wikiPageSha256=digest(html);
      row.historicalIcon=wikiIconUrl(html.toString('utf8'),jp);
      if(row.historicalIcon) {
        const historical=await fetchBytes(row.historicalIcon);row.historicalSha256=digest(historical);
        const ext=path.extname(new URL(row.historicalIcon).pathname).toLowerCase();
        if(!['.png','.jpg','.jpeg','.gif','.webp'].includes(ext)) throw Error('Unexpected wiki icon format');
        fs.writeFileSync(path.join(output,serverId+'-historical'+ext),historical,{flag:'wx'});
      } else row.issue='No unique historical 42px icon with pinned name';
    } catch(error) {row.issue=error.message;if(/^HTTP 429 https:\/\/(?:cdn\.)?wikiwiki\.jp\//.test(error.message))wikiLimited=true;}
    rows.push(row);
  }
  const result={checkedAt:new Date().toISOString(),catalogRevision:report.catalogRevision,sourceItemsSha256:reference.sha256,rows,
    caveat:'Visual similarity is supporting evidence only: icons may be reused for multiple game IDs. No identity is assigned or data published.'};
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,rows:rows.length,paired:rows.filter(row=>row.historicalSha256).length,issues:rows.filter(row=>row.issue).map(row=>({id:row.serverId,issue:row.issue}))}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(error=>{console.error(error.message);process.exitCode=1;});
