import test from 'node:test';
import assert from 'node:assert/strict';
import { wikiIconUrl } from '../../scripts/audit_pandora_os_fire_icons.mjs';

test('historical icon selection pins Japanese name, size and CDN without guessing',()=>{
  const name='炎杖バーストワンド';
  const icon='<img src="https://cdn.wikiwiki.jp/to/w/pandoras/item.png?rev=1&amp;t=2" alt="炎杖バーストワンド.png" width="42" height="42">';
  const screenshot='<img src="https://cdn.wikiwiki.jp/to/w/pandoras/shot.webp" alt="炎杖バーストワンドSS.jpg" width="320" height="340">';
  assert.equal(wikiIconUrl(icon+icon+screenshot,name),'https://cdn.wikiwiki.jp/to/w/pandoras/item.png?rev=1&t=2');
  assert.equal(wikiIconUrl(screenshot,name),null);
  assert.equal(wikiIconUrl(icon+icon.replace('item.png','other.png'),name),null);
  assert.throws(()=>wikiIconUrl(icon.replace('cdn.wikiwiki.jp','evil.example'),name),/host/);
});
