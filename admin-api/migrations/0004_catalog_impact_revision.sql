-- Track the last catalog revision that can change build calculations.
-- Existing installations conservatively treat the current revision as the
-- mechanical baseline. Future text-only publications keep impact_version stable.
ALTER TABLE catalog_head ADD COLUMN impact_version INTEGER NOT NULL DEFAULT 0 CHECK (impact_version >= 0);
UPDATE catalog_head SET impact_version = version;

ALTER TABLE catalog_revisions ADD COLUMN impact_version INTEGER NOT NULL DEFAULT 0 CHECK (impact_version >= 0);
UPDATE catalog_revisions SET impact_version = version;
