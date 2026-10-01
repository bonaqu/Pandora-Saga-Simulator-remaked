CREATE TABLE admins (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT NOT NULL UNIQUE CHECK (username = 'admin'),
  algorithm TEXT NOT NULL CHECK (algorithm = 'scrypt-n16384-r8-p5-v1'),
  password_salt TEXT NOT NULL CHECK (length(password_salt) = 43),
  password_hash TEXT NOT NULL CHECK (length(password_hash) = 43),
  created_at INTEGER NOT NULL
);

CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 43),
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE CHECK (admin_id = 1),
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at)
);
CREATE INDEX admin_sessions_expiry ON admin_sessions(expires_at);

CREATE TABLE login_limits (
  bucket_hash TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX login_limits_updated ON login_limits(updated_at);
