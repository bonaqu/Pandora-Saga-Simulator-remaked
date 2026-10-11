#!/usr/bin/env node
/**
 * Read-only Modern UI string inventory. No Legacy data or game formulas are
 * parsed or rewritten. Run: node scripts/audit_ui_strings.mjs --check
 * Use --json to export the full candidate list for manual review.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const english = JSON.parse(fs.readFileSync(path.join(root,'localization/ui.en.json'),'utf8'));
const surfaceFolders = ['modern', 'admin-api/public'];
const scanned = [];
const bindingKeys = new Set();
const candidates = [];
const dynamic = [];
const SKIP = new Set(['modern/version.js','modern/service-worker.js','modern/i18n.js']);
const human = value => /[\p{L}]{2,}/u.test(value) && !/^(?:https?:|#[A-Fa-f0-9]+$)/.test(value);

function captureKeys(code) {
  const checks = [
    /\b(?:i18n\.)?t\(\s*['"]([A-Za-z][\w.]+)['"]/g,
    /\b(?:i18n\.)?bindText\(\s*[^,\n]+,\s*['"]([A-Za-z][\w.]+)['"]/g,
    /\b(?:i18n\.)?bindAttribute\(\s*[^,\n]+,\s*['"][^'"]+['"],\s*['"]([A-Za-z][\w.]+)['"]/g,
    /\blocalizeText\(\s*[^,\n]+,\s*['"]([A-Za-z][\w.]+)['"]/g,
    /\blocalizeAttribute\(\s*[^,\n]+,\s*['"][^'"]+['"],\s*['"]([A-Za-z][\w.]+)['"]/g,
    /\btranslatedElement\(\s*[^,\n]+,\s*[^,\n]+,\s*['"]([A-Za-z][\w.]+)['"]/g,
    /\b(?:button|label)\(\s*[^,\n]+,\s*[^,\n]+,\s*['"]([A-Za-z][\w.]+)['"]/g,
    /\bliveText\(\s*['"]([A-Za-z][\w.]+)['"]/g
  ];
  checks.forEach((regex,index)=>{
    for(const match of code.matchAll(regex)) {
      // Prefix + dynamic suffix is not a literal key; check concrete uses.
      if(/^\s*\+/.test(code.slice(match.index + match[0].length)))continue;
      bindingKeys.add(index===7?'builds.live.'+match[1]:match[1]);
    }
  });
}
function inspect(file) {
  const code=fs.readFileSync(path.join(root,file),'utf8');
  scanned.push(file);
  // Worker Admin has its own Russian-only control chrome; inventory it,
  // but do not confuse its local button names with site UI registry keys.
  if(file.startsWith('modern/'))captureKeys(code);
  const lines=code.split(/\r?\n/);
  for(let index=0;index<lines.length;index++) {
    const original=lines[index],line=original.trim();
    if (!line || line.startsWith('//') || line.startsWith('*')) continue;
    const patterns=[
      /\.(?:textContent|innerText|innerHTML|placeholder|title)\s*=\s*(['"])(.*?)\1/g,
      /\.setAttribute\(\s*['"](?:aria-label|title|placeholder)['"]\s*,\s*(['"])(.*?)\1/g,
      /\b(?:confirm|alert|prompt)\(\s*(['"])(.*?)\1/g
    ];
    for(const regex of patterns)for(const match of line.matchAll(regex)) {
      const value=match[2].trim();
      if(!human(value))continue;
      const fallback=/\belse\b|\bfallback\b|!i18n|typeof i18n|\bt\(|\bbindText\(|\bbindAttribute\(/.test(line);
      candidates.push({file,line:index+1,category:fallback?'conditional-fallback':'possible-unregistered-text',
        text:value,expression:line.slice(0,200)});
    }
    // These are candidates for review rather than automatic replacements.
    // Static game mechanics, error IDs and literal code must not be translated.
    if (/getLocale\(\).*===?\s*['"]ru['"].*\?.*['"][\p{L}]{2,}/u.test(line))
      dynamic.push({file,line:index+1,expression:line.slice(0,220)});
  }
}
for(const folder of surfaceFolders){
  const directory=path.join(root,folder);
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    if(!entry.isFile()||!entry.name.endsWith('.js'))continue;
    const file=folder+'/'+entry.name;
    if(SKIP.has(file))continue;
    inspect(file);
  }
}
// A required sanity probe prevents an accidentally disabled scanner from
// reporting zero keys as a successful audit.
captureKeys(fs.readFileSync(path.join(root,'modern/builds.js'),'utf8'));
captureKeys(fs.readFileSync(path.join(root,'modern/app-shell.js'),'utf8'));
if(bindingKeys.size<20)throw Error('UI string audit did not discover expected UI bindings');
const missing=[...bindingKeys].filter(key=>!Object.hasOwn(english,key)).sort();
// Fail closed on new unlocalized Modern UI copy while grandfathering only
// one emergency fallback for browsers where the i18n module is unavailable.
const unreviewedModern=candidates.filter(x=>x.file.startsWith('modern/') &&
  x.category==='possible-unregistered-text' &&
  !(x.file==='modern/tooltips.js' && x.text==='About'));
const reviewedLocaleRouting={
  'modern/builds.js': /var locale = .*ru-RU.*en/,
  'modern/catalog.js': /var language = .*getLocale\(\).*languages\[/,
  'modern/skill-controls.js': /var descriptionLanguage = .*getLocale\(\).*\['jp', 'en', 'tw'\]/
};
const unreviewedLocaleConditions=dynamic.filter(x=>!reviewedLocaleRouting[x.file]?.test(x.expression));

const registered=Object.keys(english).length;
const summary={files:scanned.length,registeredKeys:registered,staticKeysFound:bindingKeys.size,
  unknownKeys:missing,possibleUnregistered:candidates.filter(x=>x.category==='possible-unregistered-text').length,
  fallbackLiterals:candidates.filter(x=>x.category==='conditional-fallback').length,
  localeConditionalCandidates:dynamic.length,
  unreviewedModern:unreviewedModern.length,unreviewedLocaleConditions:unreviewedLocaleConditions.length};
const result={summary,candidates,localeConditionalCandidates:dynamic};
if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
else{
  console.log('Modern UI text inventory: '+JSON.stringify(summary));
  for(const finding of [...candidates.filter(x=>x.category==='possible-unregistered-text'),...dynamic].slice(0,100))
    console.log('  '+finding.file+':'+finding.line+' '+(finding.text||finding.expression));
}
if(process.argv.includes('--check')){
  if(missing.length)console.error('Unregistered literal UI translation keys: '+missing.join(', '));
  if(unreviewedModern.length)console.error('Unreviewed Modern text literals:',unreviewedModern);
  if(unreviewedLocaleConditions.length)console.error('Unreviewed locale-dependent strings:',unreviewedLocaleConditions);
  if(missing.length||unreviewedModern.length||unreviewedLocaleConditions.length)process.exitCode=1;
}
