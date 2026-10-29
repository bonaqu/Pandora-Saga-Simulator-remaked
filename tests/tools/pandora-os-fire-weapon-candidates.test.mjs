import test from 'node:test';
import assert from 'node:assert/strict';
import { CANDIDATES, inspectFireWeapon } from '../../scripts/audit_pandora_os_fire_weapon_candidates.mjs';

test('review list preserves 14 unique server and retained project IDs', () => {
  assert.equal(CANDIDATES.length, 14);
  assert.equal(new Set(CANDIDATES.map(row => row[0])).size, 14);
  assert.equal(new Set(CANDIDATES.map(row => row[1])).size, 14);
});
test('finds competing equal-stat weapons and fails when the evidence changes', () => {
  const legacy = { id:'equipment.12.12',legacy_category_id:12,level_requirement:40,soul_socket_count:2,
    calculation_code:'18=W36_0=1',name:{ jp:'炎杖' }, compatibility_flags:[], option:{} };
  const competitor = {...legacy,id:'equipment.12.13',name:{jp:'氷杖'}};
  const candidate = {kind:'equipment',serverId:2652,category:12,names:{},source:{W:36,level:40,sockets:2,effects:[]},forth:{}};
  const row = inspectFireWeapon(candidate,legacy,[legacy,competitor]);
  assert.deepEqual(row.competingMatches.map(x => x.id),['equipment.12.13']);
  assert.throws(() => inspectFireWeapon({...candidate,source:{...candidate.source,W:35}},legacy,[legacy,competitor]),/evidence changed/);
});
