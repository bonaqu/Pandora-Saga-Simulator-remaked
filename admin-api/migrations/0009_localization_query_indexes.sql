-- Additive index for the Admin UI's common (scope, locale) pagination path.
-- The original (scope, term_id, locale) primary key remains the write identity.
-- Old publications and revisions are not modified.
CREATE INDEX IF NOT EXISTS idx_localization_scope_locale_id
  ON localization_overrides(scope,locale,term_id);
