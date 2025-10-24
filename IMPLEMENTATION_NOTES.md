# Implementation Notes - PJBC Monitor Judicial

## Key Decisions Made (2025-10-22)

### 1. Simplified Matching Logic

**REMOVED: Party name fuzzy matching**
- Too unreliable for Spanish names (abbreviations, multiple surnames, etc.)
- Users don't actually need it

**KEEPING: Exact case number + juzgado matching**
- Simple, fast, reliable
- No false positives
- Matches how Buho Legal works

### 2. Critical Discovery: Case Numbers Are NOT Unique

Case numbers like "00696/2019" can exist in **multiple juzgados** simultaneously.

**Example:**
- JUZGADO PRIMERO CIVIL TIJUANA → Case 00696/2019
- JUZGADO SEGUNDO CIVIL MEXICALI → Case 00696/2019 (different case!)

**Solution:** Users MUST provide both:
1. Case number (`00696/2019`)
2. Juzgado (`JUZGADO PRIMERO CIVIL TIJUANA`)

### 3. Bulletin Structure (Real Data Analysis)

Bulletins are **HTML tables**, not plain text.

**Tecate Bulletin Structure:**
```
Line 0: JUZGADO DE 1ERA INST.CIVIL DE TECATE, B.C. 20 DE OCTUBRE...
Line 1: PRIMER SECRETARIA
Line 2: Acuerdos
Line 3: 1
Line 4: 00501/2018
Line 5: MA. DEL SOCORRO... VS SECRETO. SUCESORIO
Line 6: 2
Line 7: 00696/2019
Line 8: CESAR ALEJANDRO... VS SERGIO... ORDINARIO CIVIL
```

**Pattern:**
- Juzgado name appears at the top
- Then sections (Acuerdos, Sentencias, etc.)
- Then entries: Number → Case Number → Parties

### 4. Updated Database Schema

**monitored_cases:**
```sql
CREATE TABLE monitored_cases (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  case_number VARCHAR(100) NOT NULL,  -- Required
  juzgado VARCHAR(255) NOT NULL,      -- Required
  notes TEXT,                         -- Optional (for user reference only)
  created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_monitored_cases_case_juzgado
  ON monitored_cases(case_number, juzgado);
```

**Matching Query (SIMPLE):**
```sql
SELECT * FROM monitored_cases
WHERE case_number = $bulletin_case_number
  AND juzgado = $bulletin_juzgado;
```

### 5. UX Flow

**Add Case Form:**
```
1. Case Number: [00696/2019         ] (required)
2. Juzgado:     [Select dropdown    ] (required)
3. Notes:       [Cliente: Juan...   ] (optional - just for user notes)
```

**Juzgado Dropdown:**
```
Tijuana
  - Juzgado Primero Civil
  - Juzgado Segundo Civil
  - ...

Mexicali
  - Juzgado Primero Civil
  - ...

Ensenada
  - ...

Segunda Instancia
  - ...
```

### 6. Juzgado List Strategy

**Decision:** Hardcode the juzgado list (with option to add more later)

**How to build it:**
1. Run scraper for 7-10 days
2. Extract unique juzgado names from all bulletins
3. Clean/normalize names
4. Create TypeScript const with ~50-100 juzgados
5. Group by region (Tijuana, Mexicali, Ensenada, etc.)

**From today's bulletins (2025-10-22):**
- Found 155 "juzgado" entries (BUT most are garbage - amparo references, party names, etc.)
- Need to write better extraction logic that only gets ACTUAL court names

### 7. What's Left to Build

**Phase 1: Database Setup**
- [ ] Create Supabase project
- [ ] Run migrations (user_profiles, monitored_cases, bulletin_entries, alerts, scrape_log)
- [ ] Set up Row-Level Security policies
- [ ] Test with sample data

**Phase 2: Scraper**
- [ ] Write cheerio-based bulletin parser
- [ ] Extract juzgado names properly (from HTML structure, not random text)
- [ ] Parse case entries (number → case_number → parties)
- [ ] Build URL generator for all 6 sources
- [ ] Store in bulletin_entries table
- [ ] Log scraping attempts in scrape_log

**Phase 3: Matcher**
- [ ] Query: Find monitored cases matching (case_number + juzgado)
- [ ] Create alerts for matches
- [ ] Send WhatsApp notifications
- [ ] Mark alerts as sent

**Phase 4: Frontend**
- [ ] Landing page with pricing
- [ ] Auth (Google OAuth + Email/Password)
- [ ] Dashboard: List monitored cases
- [ ] Add case form (case_number + juzgado dropdown + notes)
- [ ] Alerts list
- [ ] Settings (phone number for WhatsApp)

**Phase 5: Deployment**
- [ ] Deploy to Vercel
- [ ] Set up Vercel Cron (every 30 min, 6am-2pm Tijuana time)
- [ ] Connect Twilio WhatsApp
- [ ] Test end-to-end

## Next Immediate Steps

1. **Fix juzgado extraction script**
   - Parse HTML tables properly with cheerio
   - Extract court names from bulletin headers (first ~10 lines)
   - Filter out amparo references and party names

2. **Build juzgado list**
   - Run for multiple days
   - Create TypeScript constant file
   - Group by region

3. **Write bulletin parser**
   - Use cheerio to parse tables
   - Extract: entry_number, case_number, plaintiff, defendant, case_type
   - Handle multi-line party names
   - Store raw_text for debugging

4. **Set up Supabase**
   - Create project
   - Run schema migrations
   - Test with sample data

## Questions Answered

✓ Should we ask for case number AND party name? **NO** - just case number + juzgado
✓ Is party name matching needed? **NO** - too unreliable, users don't need it
✓ Are case numbers unique? **NO** - must include juzgado to disambiguate
✓ Should we normalize juzgado names? **YES** - but do it server-side, not visible to user
✓ Fuzzy matching for juzgados? **YES** - when matching bulletins against user selections
✓ How many juzgados in BC? **~50-100 estimated**
✓ Do we need regex parsing? **NO** - use cheerio to parse HTML tables

## Files Updated

- [x] `DATABASE_DESIGN.MD` - Updated monitored_cases schema
- [ ] `MVP_REQUIREMENTS.MD` - Need to update with new UX flow
- [x] `scripts/extract_juzgados.js` - Written (but needs fixing)
- [x] `scripts/analyze_bulletin.js` - Written
- [x] `scripts/parse_bulletin_structure.js` - Written
