# Tribunal Electrónico Consolidation - Implementation Summary

**Date:** 2026-01-28
**Status:** ✅ **COMPLETED**

---

## Overview

Successfully consolidated the separate "Tribunal Electrónico" section into the main "Monitoreo por Expediente" section. Users now see all documents (manual uploads + TE auto-downloads) in one unified view per expediente.

---

## What Changed

### 1. Database ✅
- **New columns in `case_files`:**
  - `source` - Distinguishes 'manual_upload' vs 'tribunal_electronico'
  - `ai_summary` - Stores Gemini-generated summaries for TE docs
  - `tribunal_descripcion` - For duplicate detection
  - `tribunal_fecha` - For duplicate detection

- **New function:** `normalize_case_number()`
  - Strips "EXPEDIENTE " prefix
  - Pads first number to 5 digits
  - Examples:
    - "EXPEDIENTE 1347/2025" → "01347/2025"
    - "77/2026" → "00077/2026"

- **Migration:** All existing tribunal documents migrated to `case_files`
  - Old table archived as `tribunal_documents_archived`
  - 0 documents migrated (none had PDFs)

- **New constraints:**
  - Unique index on `(user_id, case_number, juzgado)` for monitored_cases
  - Unique index on `(case_id, tribunal_descripcion, tribunal_fecha)` for TE docs

### 2. Sync Logic ✅
**File:** `hetzner/lib/tribunal/sync-service.ts`

**Key Changes:**
- Now fetches user's `monitored_cases` at start of sync
- Creates map: `normalized_expediente + juzgado → case_id`
- Filters scraped documents to only those matching tracked expedientes
- Uses `case_id + descripcion + fecha` for duplicate detection (NOT numero - it changes daily!)
- Inserts into `case_files` (unified table) instead of `tribunal_documents`

**New utility:** `hetzner/lib/tribunal/normalize-expediente.ts`
- Matches the SQL normalization function in TypeScript

### 3. UI Changes ✅
**File:** `components/expediente-modal.tsx`

**Archivos Tab Now Shows:**
- All files together (manual + TE auto-downloads)
- TE documents have "Tribunal Electrónico" badge
- TE documents with AI summaries show blue info box with summary

**Interface updated:**
```typescript
interface CaseFile {
  // ... existing fields
  source: 'manual_upload' | 'tribunal_electronico'
  ai_summary: string | null
}
```

### 4. Navigation ✅
**File:** `components/app-sidebar.tsx`

**Removed:**
- "Tribunal Electrónico" navigation item (line 64 deleted)

**Deleted Files:**
- `app/dashboard/tribunal/page.tsx` - Main TE dashboard
- `app/dashboard/tribunal/settings/` - TE settings page
- `app/api/tribunal/expedientes/` - TE expedientes API
- `app/api/tribunal/documents/` - TE documents API

**Kept Files:**
- `app/api/tribunal/credentials/` - Still needed for settings
- `app/api/tribunal/test-connection/` - Still needed for validation

### 5. Settings Page ✅
**File:** `app/dashboard/settings/page.tsx`

**Added Section:** "Tribunal Electrónico"
- Shows configuration status
- Displays last sync time
- Informs user documents appear in expediente's Archivos tab
- Simplified management (contact support to update)

---

## Verification Results

All database checks passed:

| Check | Status |
|-------|--------|
| normalize_case_number function exists | ✅ PASS |
| case_files has source column | ✅ PASS |
| case_files has ai_summary column | ✅ PASS |
| Tribunal unique index exists | ✅ PASS |
| Monitored cases unique constraint | ✅ PASS |
| tribunal_documents archived | ✅ PASS |

**Current Data:**
- 4 manual upload files (preserved)
- 0 tribunal_electronico files (none to migrate)
- All existing user data intact

**Normalization Function Test:**
```sql
"EXPEDIENTE 1347/2025" → "01347/2025" ✓
"1347/2025" → "01347/2025" ✓
"77/2026" → "00077/2026" ✓
"00077/2026" → "00077/2026" ✓ (already normalized)
"01234/2025-CV" → "01234/2025-CV" ✓ (preserves suffix)
```

---

## How It Works Now

### For Users:
1. User tracks expediente "01234/2025" in "Monitoreo por Expediente"
2. Daily sync runs on Hetzner
3. Sync finds TE document for "1234/2025" (no leading zeros)
4. Normalization: "1234/2025" → "01234/2025" (matches!)
5. Document downloaded, summarized by AI, stored in `case_files`
6. User opens expediente modal → Archivos tab
7. Sees document with "Tribunal Electrónico" badge + AI summary

### Key Design Decision:
**Unique key = `case_id + descripcion + fecha`**

Why not `numero`?
- `numero` is just page ranking on TE website
- Changes daily as new documents are added
- Same document keeps same descripcion + fecha
- Reliable duplicate detection

---

## Architecture

### Before (Problematic):
```
Monitoreo por Expediente → monitored_cases + case_files
Tribunal Electrónico → tribunal_documents (separate table, separate UI)

Problem: Same expediente appears in two places
```

### After (Unified):
```
monitored_cases (user's tracked expedientes)
    ↓
case_files (ALL documents for that case)
    ├─ Manual uploads (source: 'manual_upload')
    └─ TE auto-downloads (source: 'tribunal_electronico')

UI: Single expediente modal with "Archivos" tab showing both
```

---

## Edge Cases Handled

1. **Same case number, different juzgados:**
   - Unique constraint includes juzgado
   - "01234/2025" in Juzgado A ≠ "01234/2025" in Juzgado B

2. **Document without date:**
   - fecha = NULL
   - Unique index handles NULL values correctly

3. **Race condition (two syncs process same doc):**
   - Second INSERT hits unique constraint (code 23505)
   - Gracefully skipped with log message

4. **User doesn't track any expedientes:**
   - Sync gets 0 monitored_cases
   - Filter returns empty array
   - No errors - just logs "0 documents match"

5. **TE document for untracked expediente:**
   - Filter excludes it
   - Not downloaded, not alerted
   - Expected behavior

---

## Safety Measures

✅ **No existing data modified:**
- Existing 4 case_files preserved (all manual_upload)
- Existing monitored_cases unchanged (already normalized)
- No duplicates created

✅ **Rollback available:**
- `tribunal_documents_archived` table kept for backup
- Can delete migrated records: `DELETE FROM case_files WHERE source = 'tribunal_electronico'`

✅ **No breaking changes to Monitoreo por Expediente:**
- Added columns have defaults
- Existing queries still work
- API uses `SELECT *` (automatically includes new columns)

---

## Files Modified

### Created:
- `supabase/migrations/20260128000001_normalize_case_numbers.sql`
- `supabase/migrations/20260128000002_add_tribunal_fields_to_case_files.sql`
- `supabase/migrations/20260128000003_migrate_tribunal_to_case_files.sql`
- `supabase/migrations/20260128000004_add_case_number_unique_constraint.sql`
- `supabase/migrations/20260128000005_archive_tribunal_documents.sql`
- `hetzner/lib/tribunal/normalize-expediente.ts`

### Modified:
- `hetzner/lib/tribunal/sync-service.ts` (major refactor)
- `hetzner/lib/tribunal/whatsapp-notifier.ts` (documentId now optional)
- `components/expediente-modal.tsx` (added TE badge + AI summary display)
- `components/app-sidebar.tsx` (removed TE nav item)
- `app/dashboard/settings/page.tsx` (added TE config section)

### Deleted:
- `app/dashboard/tribunal/page.tsx`
- `app/dashboard/tribunal/settings/page.tsx`
- `app/api/tribunal/expedientes/route.ts`
- `app/api/tribunal/documents/route.ts`
- `app/api/tribunal/documents/[id]/route.ts`
- `app/api/tribunal/documents/[id]/download/route.ts`

---

## Next Steps

1. **Test end-to-end:**
   - Add new monitored case
   - Wait for daily sync (or trigger manually)
   - Verify document appears in Archivos tab with badge

2. **Monitor first sync:**
   - Check Hetzner logs for normalization messages
   - Verify documents match correctly
   - Confirm no duplicates created

3. **Optional cleanup (after 1-2 weeks):**
   - Drop `tribunal_documents_archived` table
   - Remove unused indexes

---

## Success Criteria ✅

- [x] Database migrations applied successfully
- [x] All verification checks pass
- [x] Existing data preserved (4 case_files intact)
- [x] Sync logic only processes tracked expedientes
- [x] UI shows unified file view with badges
- [x] TE navigation removed
- [x] Settings page shows TE config
- [x] No breaking changes to existing features

---

## Support

If issues arise:
1. Check sync logs in Hetzner
2. Verify normalization: `SELECT normalize_case_number('EXPEDIENTE 1234/2025')`
3. Check for duplicates: See verification query in plan
4. Rollback if needed: See "Safety Measures" section above
