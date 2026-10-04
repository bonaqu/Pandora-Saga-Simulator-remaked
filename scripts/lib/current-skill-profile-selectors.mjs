// Read-only prerequisite-domain analysis. This never approves gameplay effects
// or chooses a replacement from array order / source ID / an upgrade link.
function normalized(definition) {
  if (!definition || !Array.isArray(definition.classes) || !definition.classes.length ||
      !Number.isInteger(definition.level) || definition.level < 0 || definition.level > 55 || !Array.isArray(definition.branches))
    throw new TypeError('Audited profile learning definition required');
  const branches = Object.create(null);
  for (const gate of definition.branches) {
    if (typeof gate.branch !== 'string' || !Number.isInteger(gate.amount) || gate.amount < 1 || gate.amount > 200 || Object.hasOwn(branches, gate.branch))
      throw new TypeError('Invalid audited profile branch');
    branches[gate.branch] = gate.amount;
  }
  return { classes: [...new Set(definition.classes)].sort(), level: Math.max(1, definition.level), branches };
}

function containsDomain(outer, inner) {
  return inner.classes.every(id => outer.classes.includes(id)) && inner.level >= outer.level &&
    Object.entries(outer.branches).every(([id, minimum]) => (inner.branches[id] || 0) >= minimum);
}

export function analyzeProfileSelectors(rows) {
  if (!Array.isArray(rows) || rows.length < 2) throw new TypeError('Multiple audited source profiles required');
  const profiles = rows.map(row => ({ sourceId: row.sourceId, domain: normalized(row.learningDefinition) }));
  const pairs = [];
  for (let left = 0; left < profiles.length; left++) for (let right = left + 1; right < profiles.length; right++) {
    const a = profiles[left], b = profiles[right]; let relation;
    if (!a.domain.classes.some(id => b.domain.classes.includes(id))) relation = 'disjoint-classes';
    else {
      const aContainsB = containsDomain(a.domain, b.domain), bContainsA = containsDomain(b.domain, a.domain);
      relation = aContainsB && bContainsA ? 'identical-conditions' : aContainsB || bContainsA ? 'nested-conditions' : 'incomparable-conditions';
    }
    pairs.push({ sourceIds: [a.sourceId, b.sourceId], relation });
  }
  return { status: pairs.some(pair => ['identical-conditions', 'incomparable-conditions'].includes(pair.relation))
    ? 'manual-resolution-required' : 'disjoint-or-nested-candidates', pairs,
    mechanicsVerified: false, policy: 'Only prerequisite domains are compared; no implicit priority, formula approval or duplicate ID allocation' };
}
