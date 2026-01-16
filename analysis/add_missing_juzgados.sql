-- Migration: Add Missing Juzgados from Historical Analysis
-- Generated: 2026-01-16T06:03:14.249Z
-- Found 17 new juzgados in historical bulletins
-- ⚠️ REVIEW BEFORE APPLYING - Verify names, cities, and types!

-- JUZGADO CUARTO CIVIL MEXICALI
-- First seen: 2006-01-09, Last seen: 2006-01-10, Appearances: 75
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO CUARTO CIVIL MEXICALI',
  'Baja California',
  'Mexicali', -- ⚠️ VERIFY CITY
  'Civil',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-10',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO PRIMERO CIVIL MEXICALI
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 49
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO PRIMERO CIVIL MEXICALI',
  'Baja California',
  'Mexicali', -- ⚠️ VERIFY CITY
  'Civil',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO PRIMERO DE LO FAMILIAR ENSENADA
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 48
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO PRIMERO DE LO FAMILIAR ENSENADA',
  'Baja California',
  'Ensenada', -- ⚠️ VERIFY CITY
  'Familiar',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO PRIMERO DE LO FAMILIAR TIJUANA
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 98
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO PRIMERO DE LO FAMILIAR TIJUANA',
  'Baja California',
  'Tijuana', -- ⚠️ VERIFY CITY
  'Familiar',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO PRIMERO FAMILIAR MEXICALI B.C., A 15 Diciembre 2005
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 64
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO PRIMERO FAMILIAR MEXICALI B.C., A 15 Diciembre 2005',
  'Baja California',
  'Mexicali', -- ⚠️ VERIFY CITY
  'Familiar',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO QUINTO CIVIL MEXICALI
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 55
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO QUINTO CIVIL MEXICALI',
  'Baja California',
  'Mexicali', -- ⚠️ VERIFY CITY
  'Civil',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO SEGUNDO CIVIL ENSENADA
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 32
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO SEGUNDO CIVIL ENSENADA',
  'Baja California',
  'Ensenada', -- ⚠️ VERIFY CITY
  'Civil',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO SEGUNDO CIVIL MEXICALI
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 66
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO SEGUNDO CIVIL MEXICALI',
  'Baja California',
  'Mexicali', -- ⚠️ VERIFY CITY
  'Civil',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO SEGUNDO DE PAZ CIVIL, DE MEXICALI
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 10
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO SEGUNDO DE PAZ CIVIL, DE MEXICALI',
  'Baja California',
  'Mexicali', -- ⚠️ VERIFY CITY
  'Civil',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO SEGUNDO FAMILIAR MEXICALI B.C., A 15 Diciembre 2005
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 37
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO SEGUNDO FAMILIAR MEXICALI B.C., A 15 Diciembre 2005',
  'Baja California',
  'Mexicali', -- ⚠️ VERIFY CITY
  'Familiar',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO SEGUNDO FAMILIAR TIJUANA B.C., A 15 Diciembre 2005
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 50
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO SEGUNDO FAMILIAR TIJUANA B.C., A 15 Diciembre 2005',
  'Baja California',
  'Tijuana', -- ⚠️ VERIFY CITY
  'Familiar',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO TERCERO CIVIL ENSENADA
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 14
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO TERCERO CIVIL ENSENADA',
  'Baja California',
  'Ensenada', -- ⚠️ VERIFY CITY
  'Civil',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO TERCERO CIVIL MEXICALI
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 69
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO TERCERO CIVIL MEXICALI',
  'Baja California',
  'Mexicali', -- ⚠️ VERIFY CITY
  'Civil',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO TERCERO DE LO FAMILIAR MEXICALI
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 40
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO TERCERO DE LO FAMILIAR MEXICALI',
  'Baja California',
  'Mexicali', -- ⚠️ VERIFY CITY
  'Familiar',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO TERCERO DE LO FAMILIAR TIJUANA
-- First seen: 2006-01-09, Last seen: 2006-01-09, Appearances: 23
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO TERCERO DE LO FAMILIAR TIJUANA',
  'Baja California',
  'Tijuana', -- ⚠️ VERIFY CITY
  'Familiar',  -- ⚠️ VERIFY TYPE
  '2006-01-09',
  '2006-01-09',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO MIXTO DE PAZ, ENSENADA
-- First seen: 2006-01-10, Last seen: 2006-01-10, Appearances: 8
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO MIXTO DE PAZ, ENSENADA',
  'Baja California',
  'Ensenada', -- ⚠️ VERIFY CITY
  'Mixto',  -- ⚠️ VERIFY TYPE
  '2006-01-10',
  '2006-01-10',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

-- JUZGADO PRIMERO CIVIL ENSENADA
-- First seen: 2006-01-10, Last seen: 2006-01-10, Appearances: 111
INSERT INTO juzgados (name, state, city, type, first_seen, last_seen, is_active)
VALUES (
  'JUZGADO PRIMERO CIVIL ENSENADA',
  'Baja California',
  'Ensenada', -- ⚠️ VERIFY CITY
  'Civil',  -- ⚠️ VERIFY TYPE
  '2006-01-10',
  '2006-01-10',
  false
)
ON CONFLICT (name) DO UPDATE SET
  first_seen = LEAST(juzgados.first_seen, EXCLUDED.first_seen),
  last_seen = GREATEST(juzgados.last_seen, EXCLUDED.last_seen),
  is_active = EXCLUDED.is_active;

