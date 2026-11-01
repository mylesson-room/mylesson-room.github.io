CREATE TABLE IF NOT EXISTS tutor_quota (
  day TEXT PRIMARY KEY,
  requests INTEGER NOT NULL CHECK(requests >= 0)
);
