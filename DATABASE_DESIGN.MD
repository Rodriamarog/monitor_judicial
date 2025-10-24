# PJBC Legal Case Monitoring - Comprehensive Database Design

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Entity Relationship Overview](#entity-relationship-overview)
3. [Complete Schema](#complete-schema)
4. [Indexes & Performance](#indexes--performance)
5. [Multi-tenancy & Security](#multi-tenancy--security)
6. [Data Integrity](#data-integrity)
7. [Query Patterns](#query-patterns)
8. [Scaling Strategy](#scaling-strategy)

---

## Design Philosophy

### Core Principles

1. **Multi-tenancy First**: Every table with user data has `user_id` and Row-Level Security
2. **Performance by Default**: Index on every common query pattern
3. **Data Integrity**: Constraints prevent bad data at the database level
4. **Immutable Bulletins**: Bulletin entries are append-only (never update scraped data)
5. **Simple & Clear**: No over-engineering, focus on what the business needs now
6. **User-Centric**: Store data the way users think about it (matching Buho Legal UX)

### What We're Optimizing For

- **Fast matching**: Quickly match new bulletins against thousands of monitored cases
- **Read-heavy dashboard**: Users check frequently, scraping happens periodically
- **Scalability**: Support 10,000+ users monitoring 100,000+ cases
- **Data integrity**: Never lose an alert, never send duplicate notifications
- **Simple queries**: Straightforward SQL, easy to debug
- **Clean UX**: Data structure matches what users actually see (Fecha, Juzgado, Expediente, Alerta)

---

## Entity Relationship Overview

```
auth.users (Supabase)
    │
    └─→ user_profiles (our extension)
            │
            └─→ monitored_cases
                    │
                    └─→ alerts ←─── bulletin_entries (central shared database)

scrape_log (independent tracking)
```

**Key Relationships:**
- One user → many monitored cases
- One monitored case → many alerts
- One bulletin entry → many alerts (same entry can match multiple users' cases)
- Bulletin entries are SHARED across all users (central database)
- Scrape log is independent (just tracks what we've scraped)

**Central Database Concept:**
- ALL bulletin data stored in one shared `bulletin_entries` table
- Users don't have separate bulletin data
- Multi-tenancy via `monitored_cases` and `alerts` (per-user)
- 30-day rolling window (old bulletins deleted weekly)

---

## Complete Schema

### 1. `user_profiles`

**Purpose**: Store user data and subscription info

```sql
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
```

**Field Explanations:**
- `id`: References Supabase auth.users (1:1 relationship)
- `phone`: Must be E.164 format for Twilio WhatsApp API (+52...)
- `subscription_tier`: Determines how many cases they can monitor (10/100/500)
- `subscription_status`: Simple states for MVP (trial/active/canceled)

---

### 2. `monitored_cases`

**Purpose**: Track which cases each user is monitoring (per-user data)

**Key Design Decision**: Case numbers are NOT globally unique. A case number like "00696/2019" can exist in multiple juzgados (courts). Therefore, we MUST track both case_number AND juzgado for accurate matching.

```sql
CREATE TABLE monitored_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,

  -- Required: What to monitor
  case_number VARCHAR(100) NOT NULL, -- e.g., "00696/2019"
  juzgado VARCHAR(255) NOT NULL, -- e.g., "JUZGADO PRIMERO CIVIL TIJUANA"

  -- Optional: User reference field (not used in matching)
  nombre VARCHAR(255), -- e.g., "Juan Perez" or "Cliente ABC - Disputa terreno"

  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_monitored_cases_user_id ON monitored_cases(user_id);
CREATE INDEX idx_monitored_cases_case_juzgado ON monitored_cases(case_number, juzgado);
```

**Field Explanations:**
- `case_number`: The case/expediente number (e.g., "00696/2019", "01234/2024")
- `juzgado`: The exact court name where the case is filed (e.g., "JUZGADO PRIMERO CIVIL TIJUANA")
- `nombre`: Optional name/label for user's personal reference - helps them remember which client or party this case relates to. This field is NOT used for matching against bulletins.

**Why juzgado is required:**
- Case numbers reset per court per year
- Case "00696/2019" can exist in multiple courts simultaneously
- Without juzgado, we'd match the wrong cases and send incorrect alerts

**Index Strategy:**
- `(user_id)`: Get all cases for a user's dashboard
- `(case_number, juzgado)`: Fast matching when new bulletin entries arrive (O(log n) lookup)

---

### 3. `bulletin_entries` (Central Shared Database)

**Purpose**: Store ALL scraped court bulletin data (shared by all users)

**Key Design Decisions:**
- **Immutable**: Never UPDATE, only INSERT
- **Shared**: Single table for all users (not per-tenant tables)
- **Simplified**: Only fields users see (Fecha, Juzgado, Expediente, Partes)
- **30-day window**: Old bulletins auto-deleted (weekly cleanup job)

```sql
CREATE TABLE bulletin_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What users see (matches PJBC bulletin display)
  bulletin_date DATE NOT NULL,
  juzgado VARCHAR(255) NOT NULL, -- "JUZGADO SEXTO CIVIL TIJUANA"
  case_number VARCHAR(100) NOT NULL, -- "00520/2023"
  raw_text TEXT NOT NULL, -- Full case details from bulletin (parties, case type, etc.)

  -- System fields
  source VARCHAR(50) NOT NULL, -- e.g. tijuana, mexicali, ensenada, tecate, segunda_instancia, juzgados_mixtos
  bulletin_url VARCHAR(500) NOT NULL, -- Link to bulletin
  scraped_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- One case per juzgado per day
  UNIQUE(bulletin_date, juzgado, case_number)
);

-- Indexes for performance
CREATE INDEX idx_bulletin_entries_date ON bulletin_entries(bulletin_date DESC);
CREATE INDEX idx_bulletin_entries_case_number ON bulletin_entries(case_number);
CREATE INDEX idx_bulletin_entries_source ON bulletin_entries(source);
CREATE INDEX idx_bulletin_entries_scraped_at ON bulletin_entries(scraped_at DESC);

-- Composite index for matching queries (MOST IMPORTANT - this is what we use to find matches)
CREATE INDEX idx_bulletin_entries_case_juzgado ON bulletin_entries(case_number, juzgado);
```

**Field Explanations:**
- `juzgado`: Full court name as appears in bulletin (e.g., "TRIBUNAL LABORAL DE TIJUANA, B.C.")
- `case_number`: The case/expediente number (e.g., "00696/2019")
- `raw_text`: Full case details from bulletin - includes party names, case type, etc. (displayed to user)
- `source`: For scraping organization (determines which bulletin URL to fetch). A `source` can be a city (e.g., `tijuana`) or a special court (e.g., `segunda_instancia`).
- `bulletin_url`: Link back to original bulletin

**UNIQUE constraint:**
- `(bulletin_date, juzgado, case_number)` = unique identifier
- Same case cannot appear twice in same juzgado on same day
- Prevents duplicate scraping

**Why simplified design?**
- **Matching is ONLY by case_number + juzgado** (exact match)
- No need to parse plaintiff/defendant names for matching
- Users provide case number + juzgado when adding a case to monitor
- Users can add a "nombre" (name) field for their own reference (not used for matching)
- `raw_text` contains full bulletin details to display when match found
- Keep it simple, focus on core functionality

---

### 4. `alerts`

**Purpose**: Track when we matched a case and notified a user

**Design Decision: One alert per match**
- Each bulletin entry + monitored case match = ONE alert
- Track notification status (sent/failed/error)
- Never create duplicate alerts (UNIQUE constraint)

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  monitored_case_id UUID REFERENCES monitored_cases(id) ON DELETE CASCADE NOT NULL,
  bulletin_entry_id UUID REFERENCES bulletin_entries(id) ON DELETE CASCADE NOT NULL,
  
  -- Match details
  matched_on VARCHAR(50) NOT NULL, -- Always 'case_number' (exact match)
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
```

**Field Explanations:**
- `matched_on`: Always 'case_number' (we only do exact case number + juzgado matching)
- `matched_value`: The case number that matched (e.g., "00696/2019")
- `whatsapp_sent`: Did notification send successfully?
- `whatsapp_error`: If failed, error message from Twilio
- `read_at`: User interaction tracking (has user seen this in dashboard?)

**UNIQUE constraint prevents:**
- Duplicate alerts for same match
- If scraper runs multiple times, won't create duplicate alerts
- User won't get spammed with same notification

**Index Strategy:**
- `(user_id, created_at DESC)`: Dashboard query (get user's recent alerts)
- `(user_id, read_at) WHERE NULL`: Count unread alerts
- `(whatsapp_sent) WHERE false`: Retry failed notifications

**CASCADE behavior:**
- User deletes account → delete their alerts
- User deletes monitored case → delete related alerts
- Bulletin entry deleted → delete related alerts

---

### 5. `scrape_log`

**Purpose**: Track scraping attempts (success/failure/404)

**Why separate from bulletin_entries?**
- Need to know "did we try?" vs "did we find anything?"
- Track 404s (bulletin not published yet)
- Debug scraping issues

```sql
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
```

**Field Explanations:**
- `found`: Did bulletin exist? (false = 404, true = found and parsed)
- `entries_count`: How many case entries in bulletin (monitoring)
- `error_message`: Network timeout, parse failure, etc.

**UNIQUE INDEX on successful scrapes:**
- Prevents scraping same bulletin multiple times per day
- Allows multiple failed attempts (found = false) until success
- Once found (found = true), stop trying for that day

**Query Pattern:**
```sql
-- Check if already scraped today successfully
SELECT * FROM scrape_log 
WHERE bulletin_date = CURRENT_DATE 
  AND source = 'tijuana' 
  AND found = true
LIMIT 1;

-- If no results → try scraping
-- If results exist → skip (already have data)
```

---

## Indexes & Performance

### Index Strategy Summary

| Table | Index | Purpose | Type | Notes |
|-------|-------|---------|------|-------|
| `user_profiles` | `email` | Login lookup | B-tree | Fast user auth |
| `user_profiles` | `subscription_tier` | Analytics, filtering | B-tree | Group by tier |
| `monitored_cases` | `user_id` | Dashboard queries | B-tree | Get user's cases |
| `monitored_cases` | `case_number` | Exact matching | B-tree | Fast case lookup |
| `monitored_cases` | `party_name` (trigram) | Fuzzy matching | GIN | Similarity search |
| `bulletin_entries` | `bulletin_date` | Date range queries | B-tree | DESC for recent first |
| `bulletin_entries` | `case_number` | Exact matching | B-tree | Fast case lookup |
| `bulletin_entries` | `plaintiff_name` | Name matching | B-tree | Prefix search |
| `bulletin_entries` | `defendant_name` | Name matching | B-tree (partial) | Skip "SECRETO" |
| `alerts` | `user_id, created_at` | Dashboard list | B-tree | Recent alerts |
| `alerts` | `user_id, read_at` (unread) | Unread count | B-tree (partial) | Only unread |
| `alerts` | `whatsapp_sent` (unsent) | Retry failed | B-tree (partial) | Only failed |
| `scrape_log` | `date, source` | Check if scraped | B-tree | Fast lookup |

### Index Types Explained

**B-tree (default):**
- Equality: `WHERE user_id = '...'`
- Ranges: `WHERE created_at > '...'`
- Sorting: `ORDER BY created_at DESC`
- Fast: O(log n) lookups

**GIN (Generalized Inverted Index):**
- Trigrams: Fuzzy text matching
- Example: `WHERE party_name % 'GARCIA'` (% = similarity operator)
- Slower inserts, fast searches

**Partial Indexes** (`WHERE` clause):
- Only index subset of rows
- Example: Only index unsent alerts (`WHERE whatsapp_sent = false`)
- Saves disk space, faster updates on excluded rows

---

## Multi-tenancy & Security

### Row-Level Security (RLS)

**Core Concept:**
- Users can ONLY see/modify their own data
- Enforced at database level (not application code)
- Even if frontend has bug, data is isolated

**Enable RLS on all user tables:**

```sql
-- User profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Monitored cases
ALTER TABLE monitored_cases ENABLE ROW LEVEL SECURITY;

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

-- Alerts
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own alerts"
  ON alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own alerts"
  ON alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Bulletin entries (public read for all authenticated users)
ALTER TABLE bulletin_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view bulletins"
  ON bulletin_entries FOR SELECT
  TO authenticated
  USING (true);

-- Service role can do everything (for scraper cron)
CREATE POLICY "Service role full access"
  ON bulletin_entries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on alerts"
  ON alerts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**How RLS Works:**
1. User authenticates → Gets JWT with `auth.uid()`
2. Every query automatically filtered by RLS policies
3. User A cannot see User B's monitored cases or alerts
4. Bulletin entries are public (all users see same data)
5. Service role (scraper) bypasses RLS

**Benefits:**
- No `WHERE user_id = ...` needed in application code
- Security at database level (cannot be bypassed)
- Protection against SQL injection and auth bugs

---

## Data Integrity

### Constraints Summary

| Table | Constraint | Purpose |
|-------|-----------|---------|
| `user_profiles` | `subscription_tier` CHECK | Only valid tiers |
| `user_profiles` | `subscription_status` CHECK | Only valid statuses |
| `monitored_cases` | `monitor_type` CHECK | Only 'case_number' or 'party_name' |
| `monitored_cases` | `monitored_cases_data_check` CHECK | Must provide data for monitor_type |
| `bulletin_entries` | UNIQUE (date, juzgado, case_number) | No duplicate entries |
| `alerts` | UNIQUE (user, bulletin, case) | No duplicate alerts |
| All tables | `NOT NULL` on required fields | No missing critical data |
| All foreign keys | `ON DELETE CASCADE` | Clean up orphaned records |

### Why These Constraints?

**CHECK constraints**: Prevent invalid data
- Can't insert `subscription_tier = 'invalid'`
- Application bug can't create bad data
- Database enforces business rules

**UNIQUE constraints**: Business logic enforcement
- Can't scrape same bulletin twice
- Can't send same alert to user twice
- Prevents bugs in scraper/matcher

**NOT NULL**: Required fields must exist
- Every alert must have user_id, bulletin_entry_id
- Every bulletin must have date, juzgado, case_number
- Application can't forget critical fields

**Foreign keys with CASCADE**: Data consistency
- User deleted → automatically delete their cases and alerts
- Case deleted → automatically delete related alerts
- No orphaned records

---

## Query Patterns

### Common Queries & Performance

**1. Dashboard: Get user's monitored cases**
```sql
SELECT * FROM monitored_cases
WHERE user_id = $1
ORDER BY created_at DESC;

-- Uses: idx_monitored_cases_user_id
-- Performance: O(log n) + O(k) where k = user's cases
-- Typical: <10ms for 100 cases
```

**2. Dashboard: Get user's recent alerts**
```sql
SELECT 
  a.*,
  mc.case_number,
  mc.party_name,
  be.bulletin_date,
  be.juzgado,
  be.case_number as expediente,
  be.plaintiff_name,
  be.defendant_name,
  be.bulletin_url
FROM alerts a
JOIN monitored_cases mc ON a.monitored_case_id = mc.id
JOIN bulletin_entries be ON a.bulletin_entry_id = be.id
WHERE a.user_id = $1
ORDER BY a.created_at DESC
LIMIT 20;

-- Uses: idx_alerts_user_id_created
-- Performance: O(log n) + O(20 joins) = ~constant time
-- Typical: <50ms
```

**3. Dashboard: Count unread alerts**
```sql
SELECT COUNT(*) FROM alerts
WHERE user_id = $1 AND read_at IS NULL;

-- Uses: idx_alerts_user_id_unread (partial index)
-- Performance: O(log n) + O(unread count)
-- Typical: <5ms
```

**4. Scraper: Check if already scraped today**
```sql
SELECT * FROM scrape_log
WHERE bulletin_date = CURRENT_DATE 
  AND source = $1 
  AND found = true
LIMIT 1;

-- Uses: idx_scrape_log_unique_success
-- Performance: O(1) - unique index lookup
-- Typical: <1ms
```

**5. Matcher: Find monitored cases for a bulletin entry**
```sql
SELECT * FROM monitored_cases
WHERE case_number = $1
  AND juzgado = $2;

-- Uses: idx_monitored_cases_case_juzgado
-- Performance: O(log n)
-- Typical: <5ms even with 100k cases
-- This is the ONLY matching query we need!
```

**6. Check subscription limit**
```sql
SELECT COUNT(*) FROM monitored_cases
WHERE user_id = $1;

-- Uses: idx_monitored_cases_user_id
-- Performance: O(log n) + O(user's cases)
-- Typical: <5ms
```

**7. Store new bulletin entry**
```sql
INSERT INTO bulletin_entries (
  bulletin_date, juzgado, case_number, 
  plaintiff_name, defendant_name, 
  source, raw_text, bulletin_url
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (bulletin_date, juzgado, case_number) DO NOTHING;

-- Uses: UNIQUE index for conflict detection
-- Performance: O(log n) insert + conflict check
-- Typical: <2ms per entry
```

---

## Scaling Strategy

### Current Design Handles

- ✅ 10,000 users
- ✅ 1,000,000 monitored cases (100 per user average)
- ✅ 10,000 bulletin entries (30 days × 3 cities × ~100 per day)
- ✅ 10,000,000 alerts (over time)

### Performance Bottlenecks & Solutions

**Problem: Matching gets slow with many monitored cases**
```
Current: O(n) scan through all monitored cases
Solution 1: Already using indexes (O(log n) lookups)
Solution 2: If still slow, partition by monitor_type
Solution 3: Cache frequently matched cases in Redis
```

**Problem: Bulletin entries table grows unbounded**
```
Current: 30-day rolling window (manual cleanup)
Solution 1: Add weekly cron to delete old entries:
  DELETE FROM bulletin_entries 
  WHERE bulletin_date < NOW() - INTERVAL '30 days';
Solution 2: Partition by bulletin_date (monthly partitions)
Solution 3: Archive old data to separate table
```

**Problem: Too many alerts slow down dashboard**
```
Current: Already limiting to 20 recent (LIMIT 20)
Solution 1: Already using pagination
Solution 2: Add "archived" flag for old alerts
Solution 3: Move alerts >6 months to archive table
```

**Problem: Write contention during scraping**
```
Current: Single scraper process
Solution 1: Parallel scrapers per source (3 workers)
Solution 2: Use UPSERT to handle conflicts gracefully
Solution 3: Batch inserts (already doing ON CONFLICT)
```

### When to Scale

**Metrics to watch:**
- Query time > 500ms → Investigate slow queries
- Table size > 100GB → Consider partitioning
- Matching takes > 10 seconds → Optimize or parallelize
- CPU usage > 80% sustained → Upgrade instance

**Supabase specifics:**
- Free tier: 500MB database (MVP is fine)
- Pro tier: Upgrade when approaching limits
- Can scale vertically (bigger instance) easily

### 30-Day Cleanup (Weekly Cron)

```sql
-- Run weekly to maintain 30-day window
DELETE FROM bulletin_entries 
WHERE bulletin_date < CURRENT_DATE - INTERVAL '30 days';

-- Also clean up old scrape logs
DELETE FROM scrape_log
WHERE bulletin_date < CURRENT_DATE - INTERVAL '90 days';
```

**Why 30 days for bulletins?**
- Users care about recent activity (last week or two)
- 30 days = safety buffer for late checks
- Keeps database size manageable (~10k entries)
- Older data has diminishing value

**Why 90 days for scrape logs?**
- Useful for debugging scraping issues
- Doesn't grow as fast as bulletin entries
- Can keep longer without performance impact

---

## Summary

### Design Highlights

✅ **Simple**: No over-engineering, just what we need
✅ **Fast**: Indexes on every query pattern
✅ **Safe**: RLS prevents data leaks between users
✅ **Scalable**: Handles 10K users easily
✅ **User-Centric**: Data structure matches Buho Legal UX
✅ **Maintainable**: Clear schema, easy to understand
✅ **Future-Proof**: Easy to add payments, teams, etc.

### What We Avoided

❌ Soft deletes (unnecessary complexity)
❌ Audit logs (overkill for MVP)
❌ Over-normalization (separate party tables, etc.)
❌ Premature optimization (caching, denormalization)
❌ Complex subsections/action types (users don't care)

### Central Database Benefits

✅ **Efficient**: Single scrape serves ALL users
✅ **Cost-effective**: One database for everyone
✅ **Scalable**: 10K users query same bulletin data
✅ **Simple**: No per-tenant database provisioning

### When to Revisit

- Queries get slow → Add/optimize indexes
- Tables get huge → Partition or archive
- Adding new features → Extend schema
- Performance issues → Monitor and tune

---

**This database design is production-ready for MVP and scales to 10,000+ users without major changes.**