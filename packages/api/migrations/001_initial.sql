-- packages/api/migrations/001_initial.sql

-- Sites
CREATE TABLE sites (
  id TEXT PRIMARY KEY DEFAULT 'site_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tests
CREATE TABLE tests (
  id TEXT PRIMARY KEY DEFAULT 'test_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('running', 'paused', 'completed')),
  url_pattern TEXT NOT NULL,
  traffic_percent INTEGER NOT NULL DEFAULT 100 CHECK (traffic_percent BETWEEN 1 AND 100),
  variants JSONB NOT NULL DEFAULT '[]',
  goals JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Raw events (append-only, written by ab.js via API)
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  site_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  goal_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'conversion')),
  uid TEXT NOT NULL,
  url TEXT NOT NULL,
  ref TEXT,
  ts BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aggregated results (updated by hourly cron)
CREATE TABLE results (
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  goal_id TEXT NOT NULL DEFAULT '__impression__',
  impressions INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (test_id, variant_id, goal_id)
);

-- Indexes
CREATE INDEX idx_tests_site_id ON tests(site_id);
CREATE INDEX idx_events_test_id ON events(test_id);
CREATE INDEX idx_events_site_id ON events(site_id);
CREATE INDEX idx_events_created_at ON events(created_at);

-- RLS
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
-- events: no RLS (written by unauthenticated ab.js, read only by service role)

CREATE POLICY "sites_own" ON sites FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "tests_own" ON tests FOR ALL
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = tests.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "results_own" ON results FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tests t
    JOIN sites s ON s.id = t.site_id
    WHERE t.id = results.test_id AND s.user_id = auth.uid()
  ));
