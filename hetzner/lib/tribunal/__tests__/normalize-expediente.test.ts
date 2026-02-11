/**
 * Tests for normalize-expediente.ts
 * Priority 1: Used everywhere, must be bulletproof
 */

import { describe, it, expect, vi } from 'vitest';
import { normalizeExpediente } from '../normalize-expediente';

describe('normalizeExpediente', () => {
  describe('Padding', () => {
    it('should pad 1-digit number to 5 digits', () => {
      expect(normalizeExpediente('7/2026')).toBe('00007/2026');
    });

    it('should pad 2-digit number to 5 digits', () => {
      expect(normalizeExpediente('77/2026')).toBe('00077/2026');
    });

    it('should pad 3-digit number to 5 digits', () => {
      expect(normalizeExpediente('123/2025')).toBe('00123/2025');
    });

    it('should pad 4-digit number to 5 digits', () => {
      expect(normalizeExpediente('1234/2025')).toBe('01234/2025');
    });

    it('should not pad 5-digit number', () => {
      expect(normalizeExpediente('12345/2025')).toBe('12345/2025');
    });

    it('should handle 6-digit number (no padding)', () => {
      expect(normalizeExpediente('123456/2025')).toBe('123456/2025');
    });
  });

  describe('Prefix Stripping', () => {
    it('should strip "EXPEDIENTE " prefix', () => {
      expect(normalizeExpediente('EXPEDIENTE 1234/2025')).toBe('01234/2025');
    });

    it('should strip "EXPEDIENTE " with multiple spaces', () => {
      expect(normalizeExpediente('EXPEDIENTE  1234/2025')).toBe('01234/2025');
    });

    it('should handle lowercase "expediente" prefix', () => {
      expect(normalizeExpediente('expediente 123/2025')).toBe('00123/2025');
    });

    it('should handle mixed case prefix', () => {
      expect(normalizeExpediente('Expediente 99/2025')).toBe('00099/2025');
    });
  });

  describe('Suffix Preservation', () => {
    it('should preserve -CV suffix', () => {
      expect(normalizeExpediente('123/24-CV')).toBe('00123/24-CV');
    });

    it('should preserve -MP suffix', () => {
      expect(normalizeExpediente('456/25-MP')).toBe('00456/25-MP');
    });

    it('should preserve suffix with EXPEDIENTE prefix', () => {
      expect(normalizeExpediente('EXPEDIENTE 789/24-CV')).toBe('00789/24-CV');
    });
  });

  describe('Trimming and Case', () => {
    it('should trim leading spaces', () => {
      expect(normalizeExpediente('  77/2026')).toBe('00077/2026');
    });

    it('should trim trailing spaces', () => {
      expect(normalizeExpediente('77/2026  ')).toBe('00077/2026');
    });

    it('should trim both leading and trailing spaces', () => {
      expect(normalizeExpediente('  77/2026  ')).toBe('00077/2026');
    });

    it('should convert to uppercase', () => {
      expect(normalizeExpediente('expediente 99/25')).toBe('00099/25');
    });
  });

  describe('Edge Cases', () => {
    it('should handle 2-digit year format', () => {
      expect(normalizeExpediente('1234/24')).toBe('01234/24');
    });

    it('should handle 4-digit year format', () => {
      expect(normalizeExpediente('1234/2025')).toBe('01234/2025');
    });

    it('should return as-is for malformed format (letters)', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = normalizeExpediente('ABC/2025');
      expect(result).toBe('ABC/2025');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Could not normalize expediente: ABC/2025');
      consoleWarnSpy.mockRestore();
    });

    it('should return as-is for missing slash', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = normalizeExpediente('12342025');
      expect(result).toBe('12342025');
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should return trimmed uppercase for empty first part', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = normalizeExpediente('/2025');
      expect(result).toBe('/2025');
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });
});
