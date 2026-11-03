-- Cloudflare D1 is the persistent source registry for every source-backed
-- equipment item. Published admin edits remain in catalog_head/revisions.
-- Names, original JP/TW, legacy formulas and source identity are stored as
-- immutable import baselines, updated idempotently by verified deployment only.
-- Legacy aliases are retained for saved-build compatibility, not offered as
-- additional active equipment identities.
CREATE TABLE IF NOT EXISTS catalog_equipment_sources (
  id TEXT PRIMARY KEY NOT NULL,
  category INTEGER NOT NULL CHECK(category BETWEEN 0 AND 43),
  item_index INTEGER NOT NULL CHECK(item_index BETWEEN 1 AND 9999),
  source_sha256 TEXT NOT NULL CHECK(length(source_sha256) = 64),
  source_json TEXT NOT NULL CHECK(json_valid(source_json)),
  canonical_id TEXT,
  imported_at INTEGER NOT NULL,
  UNIQUE(category, item_index),
  CHECK(json_extract(source_json, '$.id') = id),
  CHECK(canonical_id IS NULL OR canonical_id <> id)
);
CREATE INDEX IF NOT EXISTS catalog_equipment_sources_canonical
  ON catalog_equipment_sources(canonical_id) WHERE canonical_id IS NOT NULL;
