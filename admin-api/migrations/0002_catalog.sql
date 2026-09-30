-- Additive Modern-only catalog. Museum sources and credentials are not touched.
CREATE TABLE catalog_head (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  snapshot_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(snapshot_json)),
  write_token TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT 0
);
INSERT INTO catalog_head (id) VALUES (1);

CREATE TABLE catalog_revisions (
  version INTEGER PRIMARY KEY CHECK (version > 0),
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  created_at INTEGER NOT NULL,
  note TEXT NOT NULL CHECK (length(note) <= 240)
);

CREATE TABLE catalog_allocations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('equipment', 'soul')),
  category INTEGER NOT NULL,
  item_index INTEGER NOT NULL CHECK (item_index > 0 AND item_index < 10000),
  created_at INTEGER NOT NULL,
  UNIQUE (kind, category, item_index),
  CHECK ((kind = 'soul' AND category = -1) OR (kind = 'equipment' AND category >= 0 AND category <= 43))
);
CREATE TABLE catalog_sequences (
  kind TEXT NOT NULL,
  category INTEGER NOT NULL,
  next_index INTEGER NOT NULL CHECK (next_index > 0 AND next_index <= 10000),
  PRIMARY KEY (kind, category)
);
CREATE TABLE catalog_drafts (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  version INTEGER NOT NULL CHECK (version > 0),
  is_dirty INTEGER NOT NULL DEFAULT 1 CHECK (is_dirty IN (0, 1)),
  updated_at INTEGER NOT NULL
);
