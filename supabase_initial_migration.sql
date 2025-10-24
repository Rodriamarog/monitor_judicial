-- PJBC Legal Case Monitoring System - Initial Database Schema
-- Generated: 2025-10-24
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for fuzzy text matching (future use)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 1. USER PROFILES
-- ============================================================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20), -- E.164 format: +52XXXXXXXXXX for WhatsApp

  -- Subscription
  subscription_tier VARCHAR(50) DEFAULT 'basico' NOT NULL
    CHECK (subscription_tier IN ('basico', 'profesional', 'corporativo')),
  subscription_status VARCHAR(50) DEFAULT 'active' NOT NULL
    CHECK (subscription_status IN ('trial', 'active', 'canceled')),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_subscription_tier ON user_profiles(subscription_tier);

COMMENT ON TABLE user_profiles IS 'User account information and subscription details';
COMMENT ON COLUMN user_profiles.phone IS 'WhatsApp-enabled phone number in E.164 format';

-- ============================================================================
-- 2. MONITORED CASES
-- ============================================================================

CREATE TABLE monitored_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,

  -- Required: What to monitor (case_number + juzgado = unique identifier)
  case_number VARCHAR(100) NOT NULL, -- e.g., "00696/2019"
  juzgado VARCHAR(255) NOT NULL, -- e.g., "JUZGADO PRIMERO CIVIL DE TIJUANA"

  -- Optional: User reference field (not used in matching)
  nombre VARCHAR(255), -- e.g., "Juan Perez" or "Cliente ABC - Disputa terreno"

  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_monitored_cases_user_id ON monitored_cases(user_id);
CREATE INDEX idx_monitored_cases_case_juzgado ON monitored_cases(case_number, juzgado);

COMMENT ON TABLE monitored_cases IS 'Cases that users are monitoring for updates';
COMMENT ON COLUMN monitored_cases.case_number IS 'Case/expediente number (e.g., "00696/2019")';
COMMENT ON COLUMN monitored_cases.juzgado IS 'Full court name where case is filed';
COMMENT ON COLUMN monitored_cases.nombre IS 'User personal name/label - NOT used for matching';

-- ============================================================================
-- 3. BULLETIN ENTRIES (Central Shared Database)
-- ============================================================================

CREATE TABLE bulletin_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What users see (matches PJBC bulletin display)
  bulletin_date DATE NOT NULL,
  juzgado VARCHAR(255) NOT NULL, -- "JUZGADO SEXTO CIVIL DE TIJUANA"
  case_number VARCHAR(100) NOT NULL, -- "00520/2023"

  -- Case details (from parsed bulletin)
  raw_text TEXT NOT NULL, -- Original bulletin line (full case details)

  -- System fields
  source VARCHAR(50) NOT NULL, -- e.g. tijuana, mexicali, ensenada, tecate, segunda_instancia, juzgados_mixtos
  bulletin_url VARCHAR(500) NOT NULL, -- Link to original bulletin
  scraped_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Prevent duplicate entries
  UNIQUE(bulletin_date, juzgado, case_number)
);

-- Indexes for performance
CREATE INDEX idx_bulletin_entries_date ON bulletin_entries(bulletin_date DESC);
CREATE INDEX idx_bulletin_entries_case_number ON bulletin_entries(case_number);
CREATE INDEX idx_bulletin_entries_juzgado ON bulletin_entries(juzgado);
CREATE INDEX idx_bulletin_entries_source ON bulletin_entries(source);
CREATE INDEX idx_bulletin_entries_scraped_at ON bulletin_entries(scraped_at DESC);

-- Composite index for matching queries
CREATE INDEX idx_bulletin_entries_case_juzgado ON bulletin_entries(case_number, juzgado);

COMMENT ON TABLE bulletin_entries IS 'Central shared database of all scraped court bulletin data';
COMMENT ON COLUMN bulletin_entries.raw_text IS 'Full case details as they appear in bulletin';
COMMENT ON COLUMN bulletin_entries.source IS 'Bulletin source city or court type';

-- ============================================================================
-- 4. ALERTS
-- ============================================================================

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  monitored_case_id UUID REFERENCES monitored_cases(id) ON DELETE CASCADE NOT NULL,
  bulletin_entry_id UUID REFERENCES bulletin_entries(id) ON DELETE CASCADE NOT NULL,

  -- Match details
  matched_on VARCHAR(50) DEFAULT 'case_number' NOT NULL, -- Always 'case_number' (exact match)
  matched_value VARCHAR(255), -- The case number that matched

  -- Notification status
  whatsapp_sent BOOLEAN DEFAULT false NOT NULL,
  whatsapp_error TEXT, -- Error message if send failed
  sent_at TIMESTAMP,

  -- User interaction
  read_at TIMESTAMP, -- When user viewed in dashboard

  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Prevent duplicate alerts
  UNIQUE(user_id, bulletin_entry_id, monitored_case_id)
);

CREATE INDEX idx_alerts_user_id_created ON alerts(user_id, created_at DESC);
CREATE INDEX idx_alerts_user_id_unread ON alerts(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_alerts_unsent ON alerts(whatsapp_sent, created_at) WHERE whatsapp_sent = false;

COMMENT ON TABLE alerts IS 'Tracks when bulletin entries match monitored cases';
COMMENT ON COLUMN alerts.whatsapp_sent IS 'Whether WhatsApp notification was sent successfully';
COMMENT ON COLUMN alerts.read_at IS 'When user viewed this alert in dashboard';

-- ============================================================================
-- 5. SCRAPE LOG
-- ============================================================================

CREATE TABLE scrape_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What we tried to scrape
  bulletin_date DATE NOT NULL,
  source VARCHAR(50) NOT NULL,

  -- Result
  found BOOLEAN NOT NULL, -- true = bulletin exists, false = 404
  entries_count INTEGER DEFAULT 0, -- How many cases in this bulletin
  error_message TEXT, -- Network error, parsing error, etc.

  -- When
  scraped_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_scrape_log_date_source ON scrape_log(bulletin_date DESC, source);

-- Only one successful scrape per day per source
CREATE UNIQUE INDEX idx_scrape_log_unique_success
  ON scrape_log(bulletin_date, source, DATE(scraped_at))
  WHERE found = true;

COMMENT ON TABLE scrape_log IS 'Tracks scraping attempts and results for monitoring';
COMMENT ON COLUMN scrape_log.found IS 'Whether bulletin was found (false = 404 error)';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all user tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_entries ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Monitored cases policies
CREATE POLICY "Users view own cases"
  ON monitored_cases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own cases"
  ON monitored_cases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own cases"
  ON monitored_cases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own cases"
  ON monitored_cases FOR DELETE
  USING (auth.uid() = user_id);

-- Alerts policies
CREATE POLICY "Users view own alerts"
  ON alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own alerts"
  ON alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Bulletin entries policies (public read for authenticated users)
CREATE POLICY "Authenticated users view bulletins"
  ON bulletin_entries FOR SELECT
  TO authenticated
  USING (true);

-- Service role policies (for scraper and system operations)
CREATE POLICY "Service role full access on bulletins"
  ON bulletin_entries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on alerts"
  ON alerts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on scrape_log"
  ON scrape_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles.updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA (Optional - for testing)
-- ============================================================================

-- Note: Actual user accounts are created via Supabase Auth
-- This is just a placeholder to show the structure

COMMENT ON SCHEMA public IS 'PJBC Legal Case Monitoring System - Production Database';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify the schema was created correctly:

-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT * FROM user_profiles LIMIT 1;
-- SELECT * FROM monitored_cases LIMIT 1;
-- SELECT * FROM bulletin_entries LIMIT 1;
-- SELECT * FROM alerts LIMIT 1;
-- SELECT * FROM scrape_log LIMIT 1;
