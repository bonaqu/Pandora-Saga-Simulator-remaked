-- Additive identities for source-backed skill variants. Existing encoded item
-- IDs, auth tables, catalog revisions and private drafts are left intact.
CREATE TABLE catalog_skill_allocations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('active', 'passive')),
  category INTEGER NOT NULL CHECK (category >= 0 AND category < 25),
  item_index INTEGER NOT NULL CHECK (item_index >= 0 AND item_index < 1000),
  template_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  CHECK (length(id) <= 80),
  CHECK (length(template_id) <= 40)
);
