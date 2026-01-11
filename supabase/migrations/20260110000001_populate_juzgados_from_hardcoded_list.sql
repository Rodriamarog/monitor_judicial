-- Populate juzgados table with the known hardcoded list of 65 juzgados
-- This ensures all known courts are in the database with proper metadata
-- Source: lib/juzgados.ts (auto-generated from PJBC bulletins on 2025-10-20)

-- Insert Tijuana juzgados
INSERT INTO juzgados (name, state, city, type, is_active) VALUES
  ('JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE TIJUANA', 'Baja California', 'Tijuana', 'Familiar - Violencia', true),
  ('TRIBUNAL LABORAL DE TIJUANA', 'Baja California', 'Tijuana', 'Laboral', true),
  ('JUZGADO HIPOTECARIO DE TIJUANA', 'Baja California', 'Tijuana', 'Civil - Hipotecaria', true),
  ('JUZGADO PRIMERO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO SEGUNDO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO TERCERO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO CUARTO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO QUINTO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO SEXTO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO SEPTIMO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO OCTAVO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO DECIMO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO DECIMO PRIMERO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO CORPORATIVO DECIMO TERCERO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO CORPORATIVO DECIMO CUARTO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO CORPORATIVO DECIMO QUINTO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO CORPORATIVO DECIMO SEXTO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO CORPORATIVO DECIMO SEPTIMO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO CORPORATIVO DECIMO OCTAVO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO CORPORATIVO DECIMO NOVENO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO CORPORATIVO VIGESIMO CIVIL DE TIJUANA', 'Baja California', 'Tijuana', 'Civil', true),
  ('JUZGADO PRIMERO DE LO FAMILIAR DE TIJUANA', 'Baja California', 'Tijuana', 'Familiar', true),
  ('JUZGADO SEGUNDO DE LO FAMILIAR DE TIJUANA', 'Baja California', 'Tijuana', 'Familiar', true),
  ('JUZGADO TERCERO DE LO FAMILIAR DE TIJUANA', 'Baja California', 'Tijuana', 'Familiar', true),
  ('JUZGADO CUARTO DE LO FAMILIAR DE TIJUANA', 'Baja California', 'Tijuana', 'Familiar', true),
  ('JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA', 'Baja California', 'Tijuana', 'Familiar', true),
  ('JUZGADO SEXTO DE LO FAMILIAR DE TIJUANA', 'Baja California', 'Tijuana', 'Familiar', true),
  ('JUZGADO SEPTIMO DE LO FAMILIAR DE TIJUANA', 'Baja California', 'Tijuana', 'Familiar', true),
  ('JUZGADO OCTAVO DE LO FAMILIAR DE TIJUANA', 'Baja California', 'Tijuana', 'Familiar', true)
ON CONFLICT (name) DO UPDATE SET
  city = EXCLUDED.city,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active;

-- Insert Mexicali juzgados
INSERT INTO juzgados (name, state, city, type, is_active) VALUES
  ('JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE MEXICALI', 'Baja California', 'Mexicali', 'Familiar - Violencia', true),
  ('TRIBUNAL LABORAL DE MEXICALI', 'Baja California', 'Mexicali', 'Laboral', true),
  ('JUZGADO HIPOTECARIO DE MEXICALI', 'Baja California', 'Mexicali', 'Civil - Hipotecaria', true),
  ('JUZGADO PRIMERO CIVIL DE MEXICALI', 'Baja California', 'Mexicali', 'Civil', true),
  ('JUZGADO SEGUNDO CIVIL DE MEXICALI', 'Baja California', 'Mexicali', 'Civil', true),
  ('JUZGADO TERCERO CIVIL DE MEXICALI', 'Baja California', 'Mexicali', 'Civil', true),
  ('JUZGADO CUARTO CIVIL DE MEXICALI', 'Baja California', 'Mexicali', 'Civil', true),
  ('JUZGADO QUINTO CIVIL DE MEXICALI', 'Baja California', 'Mexicali', 'Civil', true),
  ('JUZGADO SEXTO CIVIL DE MEXICALI', 'Baja California', 'Mexicali', 'Civil', true),
  ('JUZGADO SEPTIMO CIVIL DE MEXICALI', 'Baja California', 'Mexicali', 'Civil', true),
  ('JUZGADO OCTAVO CIVIL DE MEXICALI', 'Baja California', 'Mexicali', 'Civil', true),
  ('JUZGADO NOVENO CIVIL DE MEXICALI', 'Baja California', 'Mexicali', 'Civil', true),
  ('JUZGADO PRIMERO DE LO FAMILIAR DE MEXICALI, B.C. EL', 'Baja California', 'Mexicali', 'Familiar', true),
  ('JUZGADO SEGUNDO DE LO FAMILIAR DE MEXICALI', 'Baja California', 'Mexicali', 'Familiar', true),
  ('JUZGADO TERCERO DE LO FAMILIAR DE MEXICALI', 'Baja California', 'Mexicali', 'Familiar', true),
  ('JUZGADO CUARTO DE LO FAMILIAR DE MEXICALI', 'Baja California', 'Mexicali', 'Familiar', true),
  ('JUZGADO QUINTO DE LO FAMILIAR DE MEXICALI', 'Baja California', 'Mexicali', 'Familiar', true),
  ('JUZGADO SEXTO DE LO FAMILIAR DE MEXICALI', 'Baja California', 'Mexicali', 'Familiar', true)
ON CONFLICT (name) DO UPDATE SET
  city = EXCLUDED.city,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active;

-- Insert Ensenada juzgados
INSERT INTO juzgados (name, state, city, type, is_active) VALUES
  ('JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE ENSENADA', 'Baja California', 'Ensenada', 'Familiar - Violencia', true),
  ('TRIBUNAL LABORAL DE ENSENADA', 'Baja California', 'Ensenada', 'Laboral', true),
  ('JUZGADO PRIMERO CIVIL DE ENSENADA', 'Baja California', 'Ensenada', 'Civil', true),
  ('JUZGADO SEGUNDO CIVIL DE ENSENADA', 'Baja California', 'Ensenada', 'Civil', true),
  ('JUZGADO TERCERO CIVIL DE ENSENADA', 'Baja California', 'Ensenada', 'Civil', true),
  ('JUZGADO CUARTO CIVIL DE ENSENADA', 'Baja California', 'Ensenada', 'Civil', true),
  ('JUZGADO PRIMERO DE LO FAMILIAR DE ENSENADA', 'Baja California', 'Ensenada', 'Familiar', true),
  ('JUZGADO SEGUNDO DE LO FAMILIAR DE ENSENADA', 'Baja California', 'Ensenada', 'Familiar', true)
ON CONFLICT (name) DO UPDATE SET
  city = EXCLUDED.city,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active;

-- Insert Tecate juzgados
INSERT INTO juzgados (name, state, city, type, is_active) VALUES
  ('JUZGADO DE 1ERA INST.CIVIL DE TECATE', 'Baja California', 'Tecate', 'Civil', true),
  ('JUZGADO PRIMERA INSTANCIA DE LO FAMILIAR DE TECATE', 'Baja California', 'Tecate', 'Familiar', true)
ON CONFLICT (name) DO UPDATE SET
  city = EXCLUDED.city,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active;

-- Insert Segunda Instancia (Appeals)
INSERT INTO juzgados (name, state, city, type, is_active) VALUES
  ('H. TRIBUNAL SUPERIOR DE JUSTICIA DEL ESTADO DE BAJA CALIFORNIA', 'Baja California', NULL, 'Segunda Instancia', true)
ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active;

-- Insert Juzgados Mixtos (Mixed jurisdiction courts in smaller cities)
INSERT INTO juzgados (name, state, city, type, is_active) VALUES
  ('JUZGADO DE PRIMERA INSTANCIA CIVIL DE SAN FELIPE', 'Baja California', 'San Felipe', 'Civil', true),
  ('JUZGADO DE PRIMERA INSTANCIA CIVIL DE CD. MORELOS', 'Baja California', 'Ciudad Morelos', 'Civil', true),
  ('JUZGADO DE PRIMERA INSTANCIA CIVIL DE GUADALUPE VICTORIA', 'Baja California', 'Guadalupe Victoria', 'Civil', true),
  ('JUZGADO DE PRIMERA INSTANCIA CIVIL DE PLAYAS DE ROSARITO', 'Baja California', 'Rosarito', 'Civil', true),
  ('JUZGADO PRIMERA INSTANCIA DE LO FAMILIAR DE PLAYAS DE ROSARITO', 'Baja California', 'Rosarito', 'Familiar', true),
  ('TRIBUNAL LABORAL DE SAN QUINTIN', 'Baja California', 'San Quintín', 'Laboral', true),
  ('JUZGADO DE PRIMERA INSTANCIA CIVIL DE SAN QUINTIN', 'Baja California', 'San Quintín', 'Civil', true)
ON CONFLICT (name) DO UPDATE SET
  city = EXCLUDED.city,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active;

-- Add comment
COMMENT ON TABLE juzgados IS 'Master list of all valid juzgados in Baja California (65 total). Populated from hardcoded list verified against PJBC bulletins on 2025-10-20. New juzgados from bulletins are auto-added with is_active=false for manual review.';
