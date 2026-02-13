/**
 * Test assertion helpers and utilities
 */

import { expect } from 'vitest';
import type { Document } from '../../tribunal/document-scraper';

/**
 * Asserts that a document has all required fields
 */
export function assertValidDocument(doc: Document) {
  expect(doc).toHaveProperty('numero');
  expect(doc).toHaveProperty('expediente');
  expect(doc.expediente).toBeTruthy();
  expect(doc).toHaveProperty('expedienteLink');
  expect(doc).toHaveProperty('juzgado');
  expect(doc).toHaveProperty('fechaPublicacion');
  expect(doc).toHaveProperty('ciudad');
  expect(doc).toHaveProperty('descripcion');
}

/**
 * Asserts that a date string is in YYYY-MM-DD format
 */
export function assertDateFormat(dateStr: string | null) {
  if (dateStr === null) {
    expect(dateStr).toBeNull();
  } else {
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
}

/**
 * Asserts that a normalized expediente matches expected format
 */
export function assertNormalizedExpediente(expediente: string) {
  // Should be uppercase, padded to at least 5 digits before slash
  expect(expediente).toMatch(/^[A-Z0-9\s-]+$/);

  // Check for number/year pattern
  const match = expediente.match(/(\d+)\/(\d+)/);
  if (match) {
    const [, number] = match;
    // Number should be padded to 5 digits
    expect(number.length).toBeGreaterThanOrEqual(5);
  }
}

/**
 * Asserts that a phone number is in WhatsApp format
 */
export function assertWhatsAppFormat(phone: string) {
  expect(phone).toMatch(/^whatsapp:\+\d{10,15}$/);
}

/**
 * Asserts that a PDF buffer has valid PDF header
 */
export function assertValidPDFBuffer(buffer: Buffer) {
  expect(buffer.length).toBeGreaterThan(1000);
  const header = buffer.slice(0, 8).toString('utf-8');
  expect(header).toContain('%PDF');
}

/**
 * Asserts that a storage path follows expected format
 */
export function assertValidStoragePath(path: string) {
  // Format: userId/tribunal/YYYY-MM-DD/expediente_timestamp.pdf
  expect(path).toMatch(/^[\w-]+\/tribunal\/\d{4}-\d{2}-\d{2}\/[\w-]+_\d+\.pdf$/);
}

/**
 * Waits for a condition to be true with timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 1000,
  checkIntervalMs: number = 50
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Creates a delay promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Asserts that a mock function was called with partial arguments
 */
export function expectCalledWithPartial(
  mockFn: any,
  expectedPartial: Record<string, any>
) {
  const calls = mockFn.mock.calls;
  expect(calls.length).toBeGreaterThan(0);

  const matchingCall = calls.find((call: any[]) => {
    const arg = call[0];
    return Object.entries(expectedPartial).every(
      ([key, value]) => arg[key] === value
    );
  });

  expect(matchingCall).toBeDefined();
}

/**
 * Extracts error message from caught error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Asserts that an async function throws with specific message
 */
export async function expectAsyncThrow(
  fn: () => Promise<any>,
  expectedMessage?: string | RegExp
) {
  let error: Error | undefined;

  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  expect(error).toBeDefined();

  if (expectedMessage) {
    if (typeof expectedMessage === 'string') {
      expect(error!.message).toContain(expectedMessage);
    } else {
      expect(error!.message).toMatch(expectedMessage);
    }
  }
}
