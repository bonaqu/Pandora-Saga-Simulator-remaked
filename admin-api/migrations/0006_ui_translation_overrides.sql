-- Published UI wording overrides are independent of item/build revisions.
-- Empty text is a versioned reset tombstone: stale editor tabs cannot restore it.
CREATE TABLE IF NOT EXISTS ui_translation_overrides (
  locale TEXT NOT NULL CHECK (locale IN ('ru', 'en')),
  id TEXT NOT NULL,
  text TEXT NOT NULL CHECK (length(text) <= 300),
  version INTEGER NOT NULL CHECK (version >= 1),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (locale, id)
);
