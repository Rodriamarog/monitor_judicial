/**
 * Name Variations Generator
 *
 * Generates search variations for person names based on search mode
 * Handles Mexican naming conventions: First Middle Paternal Maternal
 */

export interface NameParts {
  firstName: string;
  middleName?: string;
  paternalSurname: string;
  maternalSurname?: string;
}

/**
 * Parse a full name into components
 * Example: "JUAN ALBERTO PEREZ GONZALEZ" → {firstName: "JUAN", middleName: "ALBERTO", ...}
 */
export function parseFullName(fullName: string): NameParts {
  const normalized = fullName.trim().toUpperCase();
  const parts = normalized.split(/\s+/);

  if (parts.length < 2) {
    throw new Error('Name must have at least 2 words (first + last name)');
  }

  // Assume Mexican naming: First [Middle] Paternal [Maternal]
  if (parts.length === 2) {
    return {
      firstName: parts[0],
      paternalSurname: parts[1],
    };
  } else if (parts.length === 3) {
    return {
      firstName: parts[0],
      middleName: parts[1],
      paternalSurname: parts[2],
    };
  } else {
    // 4+ parts: First Middle Paternal Maternal [...]
    return {
      firstName: parts[0],
      middleName: parts[1],
      paternalSurname: parts[2],
      maternalSurname: parts[3],
    };
  }
}

/**
 * Generate search patterns based on search mode
 */
export function generateSearchPatterns(
  fullName: string,
  searchMode: 'exact' | 'fuzzy'
): string[] {
  const normalized = fullName.trim().toUpperCase();

  if (searchMode === 'exact') {
    // Only exact full name
    return [normalized];
  }

  // Fuzzy mode: Generate reasonable variations
  const parts = parseFullName(fullName);
  const patterns: string[] = [];

  // Always include full name
  patterns.push(normalized);

  // First + Paternal (most common bulletin format)
  patterns.push(`${parts.firstName} ${parts.paternalSurname}`);

  // With middle initial
  if (parts.middleName) {
    patterns.push(`${parts.firstName} ${parts.middleName[0]}. ${parts.paternalSurname}`);
    patterns.push(`${parts.firstName} ${parts.middleName[0]} ${parts.paternalSurname}`);
  }

  // With maternal surname
  if (parts.maternalSurname) {
    patterns.push(`${parts.firstName} ${parts.paternalSurname} ${parts.maternalSurname}`);

    // With maternal initial
    patterns.push(`${parts.firstName} ${parts.paternalSurname} ${parts.maternalSurname[0]}.`);
    patterns.push(`${parts.firstName} ${parts.paternalSurname} ${parts.maternalSurname[0]}`);
  }

  // First initial + Paternal (rare but possible)
  patterns.push(`${parts.firstName[0]}. ${parts.paternalSurname}`);
  patterns.push(`${parts.firstName[0]} ${parts.paternalSurname}`);

  // Remove duplicates
  return Array.from(new Set(patterns));
}

/**
 * Normalize name for storage and comparison (remove accents, uppercase)
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}

/**
 * Validate name meets minimum requirements
 */
export function validateName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: 'El nombre no puede estar vacío' };
  }

  const words = trimmed.split(/\s+/);
  if (words.length < 2) {
    return {
      valid: false,
      error: 'Debe ingresar al menos nombre y apellido (mínimo 2 palabras)'
    };
  }

  // Check for reasonable length
  if (trimmed.length < 5) {
    return { valid: false, error: 'El nombre es demasiado corto' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'El nombre es demasiado largo (máximo 100 caracteres)' };
  }

  return { valid: true };
}
