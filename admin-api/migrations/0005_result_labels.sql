-- Workbook captions are the baseline; manual admin edits override them.
-- Empty ru is a versioned tombstone after a reset-to-Excel, not a published override.
-- Keeping tombstones prevents stale tabs from inserting over a previous reset.
-- This table does not affect the calculation-impact catalog revision.
CREATE TABLE IF NOT EXISTS result_label_overrides (
  id TEXT PRIMARY KEY,
  ru TEXT NOT NULL CHECK (length(ru) BETWEEN 0 AND 100),
  version INTEGER NOT NULL CHECK (version >= 1),
  updated_at INTEGER NOT NULL
);
