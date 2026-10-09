-- Additive workflow tables. Existing translations, catalog revisions and legacy
-- overrides are preserved without rewriting or renumbering old records.
CREATE TABLE IF NOT EXISTS localization_drafts (
  scope TEXT NOT NULL CHECK(scope IN ('ui','game')),
  term_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK(locale IN ('ru','en','jp','tw')),
  text TEXT NOT NULL CHECK(length(text)>0 AND length(text)<=4000),
  version INTEGER NOT NULL CHECK(version>0),
  source_version INTEGER NOT NULL CHECK(source_version>=0),
  source_text TEXT NOT NULL CHECK(length(source_text)<=4000),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(scope,term_id,locale)
);
CREATE INDEX IF NOT EXISTS idx_localization_drafts_updated ON localization_drafts(updated_at DESC);

-- History starts at deployment of this additive migration. Earlier value
-- changes are not falsely reconstructed from obsolete snapshots.
CREATE TABLE IF NOT EXISTS localization_history (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  term_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  previous_text TEXT NOT NULL,
  published_text TEXT NOT NULL,
  version INTEGER NOT NULL,
  published_at INTEGER NOT NULL,
  CHECK(length(previous_text)<=4000 AND length(published_text)<=4000)
);
CREATE INDEX IF NOT EXISTS idx_localization_history_entry
  ON localization_history(scope,term_id,locale,sequence DESC);
CREATE TRIGGER IF NOT EXISTS localization_history_insert
AFTER INSERT ON localization_overrides
BEGIN
  INSERT INTO localization_history(scope,term_id,locale,previous_text,published_text,version,published_at)
  VALUES(NEW.scope,NEW.term_id,NEW.locale,'',NEW.text,NEW.version,NEW.updated_at);
END;
CREATE TRIGGER IF NOT EXISTS localization_history_update
AFTER UPDATE ON localization_overrides
WHEN NEW.version <> OLD.version
BEGIN
  INSERT INTO localization_history(scope,term_id,locale,previous_text,published_text,version,published_at)
  VALUES(NEW.scope,NEW.term_id,NEW.locale,OLD.text,NEW.text,NEW.version,NEW.updated_at);
END;

-- Used for safe after-timeout reconciliation. A repeated request with an
-- already committed ID returns this receipt instead of publishing twice.
CREATE TABLE IF NOT EXISTS localization_operations (
  operation_id TEXT PRIMARY KEY CHECK(length(operation_id)=36),
  receipt_json TEXT NOT NULL CHECK(json_valid(receipt_json)),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_localization_operations_created
  ON localization_operations(created_at DESC);
