#!/usr/bin/env node
// Combines already captured public-only audit reports, never private D1 data.
// The report records coverage and uncertainty; it does not approve imports.
import fs from 'node:fs';
import path from 'node:path';

const [directory,output]=process.argv.slice(2);
if(!directory||!output||process.argv.length!==4||fs.existsSync(output))
  throw Error('Usage: node scripts/assemble_pandora_os_audit_report.mjs SNAPSHOT_DIRECTORY NEW_REPORT.json');
const read=name=>JSON.parse(fs.readFileSync(path.join(directory,name),'utf8'));
const identity=read('pandora-os-identity-audit-20261029.json');
const values=read('catalog-values-reviewed-20261029-aura-v2.json');
const character=read('character-audit-20261029-current/report.json');
const base=read('base-stats-audit-20261028.json');
const guild=read('pandora-os-guild-audit-20261028.json');
const forth=read('forth-runtime-report-118-20261029.json');
if(!Number.isSafeInteger(identity.revision)||identity.revision!==values.revision||
   identity.revision!==character.revision||identity.revision!==forth.revision)
  throw Error('Audit snapshots have different catalog revisions');
if(identity.matched.length!==values.examined.length||identity.matched.length!==new Set(identity.matched.map(row=>row.kind+':'+row.serverId)).size)
  throw Error('Identity snapshot is incomplete or has duplicate source IDs');
const valueMap=new Map(values.examined.map(row=>[row.kind+':'+row.serverId,row]));
if(valueMap.size!==values.examined.length||identity.matched.some(row=>!valueMap.has(row.kind+':'+row.serverId)))
  throw Error('Identity and value snapshots do not cover the same source records');
const report={schemaVersion:1,catalogRevision:identity.revision,createdAt:new Date().toISOString(),
  sources:identity.sources,coverage:{identities:identity.counts,values:values.counts,
    baseStats:{comparedInitial:base.comparedInitial,differences:base.differences,capsCompared:base.capsCompared,caps:base.caps,
      costsCompared:base.costsCompared,costs:base.costs,levelsCompared:base.levelsCompared,gains:base.gains},
    refinement:{compared:forth.compared,unsupported:forth.unsupported,differences:forth.differences}},
  equipmentAndSouls:{matched:identity.matched.map(row=>({identity:row,comparison:valueMap.get(row.kind+':'+row.serverId)})),
    unmatchedSource:identity.missing,ambiguous:identity.ambiguous,duplicateCandidates:identity.duplicateCandidates,
    excluded:identity.excluded,catalogOnly:identity.catalogOnly},
  character:{sourceAudit:character.sourceAudit,racial:character.racial,gameplay:character.gameplay,
    skillCandidates:character.publishedSkillCandidates,expertise:character.expertise},
  guild:{groups:guild.groups,otherGuildRows:guild.otherGuildRows,limitations:guild.limitations,sources:guild.sources},
  limitations:['Public source and public catalog only; private drafts and translations require a separate guarded check.',
    'Excluded and catalog-only records are not deletions. Missing source matches are candidates, not proven new items.',
    'Unmapped effects, conditions, combat formulas and game-client behavior remain explicitly unverified.',
    'The source resources do not share an atomic revision; revalidate their hashes before publication.']};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({catalogRevision:report.catalogRevision,matched:report.equipmentAndSouls.matched.length,
  unmatched:report.equipmentAndSouls.unmatchedSource.length,excluded:report.equipmentAndSouls.excluded.length,
  catalogOnly:report.equipmentAndSouls.catalogOnly.length,output}));
