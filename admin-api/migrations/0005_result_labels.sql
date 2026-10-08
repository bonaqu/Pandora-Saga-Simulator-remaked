-- Workbook captions are the baseline; manual admin edits override them.
-- This table does not affect the calculation-impact catalog revision.
CREATE TABLE IF NOT EXISTS result_label_overrides (
  id TEXT PRIMARY KEY,
  ru TEXT NOT NULL CHECK (length(ru) BETWEEN 1 AND 100),
  version INTEGER NOT NULL CHECK (version >= 1),
  updated_at INTEGER NOT NULL
);
