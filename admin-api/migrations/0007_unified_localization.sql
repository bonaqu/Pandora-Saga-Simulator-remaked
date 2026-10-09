-- Versioned override store for the unified RU/EN/JP/TW localization editor.
-- Imported source text remains immutable; never rewrite older catalog snapshots.
-- Every reset is versioned to prevent stale clients resurrecting discarded text.
CREATE TABLE IF NOT EXISTS localization_overrides (
  scope TEXT NOT NULL CHECK (scope IN ('ui', 'game')),
  term_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('ru', 'en', 'jp', 'tw')),
  text TEXT NOT NULL CHECK (length(text) <= 4000),
  version INTEGER NOT NULL CHECK (version > 0),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope, term_id, locale)
);
CREATE INDEX IF NOT EXISTS idx_localization_updated ON localization_overrides(updated_at DESC);
