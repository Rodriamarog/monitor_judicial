# Juzgado Aliases System

## Overview
The boletin judicial sometimes publishes juzgado names with slight variations (e.g., adding ", B.C. LISTA" or ", DEL" suffixes). To handle these variations, we've implemented an alias system that maps these variations to canonical juzgado names.

## How It Works

### 1. Database Schema
- **juzgado_aliases table**: Maps alias names to canonical juzgado names
  - `alias`: The variation seen in the bulletin (e.g., "JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA, B.C. LISTA (BOLETIN) DEL")
  - `canonical_name`: The canonical name from the juzgados table (e.g., "JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA")
  - `notes`: Description of the variation
  - Foreign key ensures canonical_name exists in juzgados table

### 2. Database Function
- **resolve_juzgado_alias(TEXT)**: Resolves an alias to its canonical name
  - Returns canonical name if alias exists
  - Returns original name if no alias found
  - Used in queries and can be called from SQL

### 3. Scraper Integration
When scraping bulletins, the system:
1. Loads all aliases at the start of `scrapeAllBulletins()`
2. For each bulletin entry, checks if the juzgado name is an alias
3. Resolves to canonical name before inserting into `bulletin_entries` table
4. Logs alias resolutions to console for visibility

**File**: `lib/scraper.ts` (lines 265-281, 333-350)

### 4. Matcher Integration
When matching bulletin entries to monitored cases:
1. Loads all aliases at the start of `findAndCreateMatches()`
2. For each bulletin entry, resolves juzgado name using alias map
3. Matches against monitored cases using canonical names
4. Ensures historical entries with alias names still match correctly

**File**: `lib/matcher.ts` (lines 66-82, 168-173)

### 5. New Juzgado Detection
The `find_new_juzgados()` function excludes known aliases:
- Checks if a juzgado name exists in the `juzgados` table
- Also checks if it's a known alias in the `juzgado_aliases` table
- Only alerts admin about truly unknown juzgados

**File**: `supabase/migrations/20260112130000_update_find_new_juzgados_check_aliases.sql`

## Current Known Aliases

| Alias (Bulletin Variation) | Canonical Name (Database) |
|----------------------------|---------------------------|
| JUZGADO CORPORATIVO DECIMO PRIMERO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA, B.C. LISTA | JUZGADO CORPORATIVO DECIMO PRIMERO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA |
| JUZGADO CORPORATIVO DECIMO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA, B.C. LISTA | JUZGADO CORPORATIVO DECIMO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA |
| JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA, B.C. LISTA (BOLETIN) DEL | JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA |
| JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE MEXICALI, DEL | JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE MEXICALI |

## Adding New Aliases

When you receive an email alert about a "new" juzgado that is actually a variation:

### Via SQL
```sql
INSERT INTO juzgado_aliases (alias, canonical_name, notes)
VALUES (
  'JUZGADO NAME WITH SUFFIX',
  'CANONICAL JUZGADO NAME',
  'Description of the variation'
);
```

### Via Supabase Dashboard
1. Go to Table Editor → juzgado_aliases
2. Click "Insert row"
3. Fill in:
   - **alias**: The exact name from the bulletin (with suffixes)
   - **canonical_name**: The canonical name from the juzgados table
   - **notes**: Brief description (e.g., "Common variation with ', DEL' suffix")

### Important Notes
- The `canonical_name` must exist in the `juzgados` table (enforced by foreign key)
- Alias names must be unique
- Changes take effect immediately (no restart needed)
- Next scraper run will resolve the new alias automatically

## Testing Alias Resolution

```sql
-- Test a specific alias
SELECT resolve_juzgado_alias('JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA, B.C. LISTA (BOLETIN) DEL');
-- Returns: 'JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA'

-- View all aliases
SELECT alias, canonical_name, notes FROM juzgado_aliases ORDER BY canonical_name;

-- Check if aliases appear in find_new_juzgados (should return empty)
SELECT * FROM find_new_juzgados();
```

## Migration Files
- `20260112120000_create_juzgado_aliases_table.sql`: Creates table, function, and inserts initial aliases
- `20260112130000_update_find_new_juzgados_check_aliases.sql`: Updates detection function to exclude aliases

## Benefits
1. **No false alerts**: Admin won't get emails about known variations
2. **Automatic matching**: Cases match correctly even if bulletin uses variations
3. **Easy management**: Add new aliases via SQL or Supabase dashboard
4. **Historical support**: Matcher resolves old entries with alias names
5. **Audit trail**: Notes field documents why each alias exists
