-- Only opt-in, anonymous, encoded build data is persisted here.
-- The 12-character slug is derived from SHA-256; hash collisions are rejected.
-- No admin session, credentials or existing catalog tables are changed.
CREATE TABLE IF NOT EXISTS public_build_shares (
  slug TEXT PRIMARY KEY CHECK(length(slug)=12),
  code TEXT NOT NULL CHECK(length(code)>=13 AND length(code)<=6003),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS public_share_limits (
  bucket_id TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  hits INTEGER NOT NULL
);
