/**
 * Test factory functions for creating mock data
 */

import type { Document } from '../../tribunal/document-scraper';
import type { SyncUserParams } from '../../tribunal/sync-service';
import { normalizeExpediente } from '../../tribunal/normalize-expediente';
import { createMockSupabase } from './mocks';
import { createMockLogger } from './mocks';

/**
 * Creates a mock document with default values
 */
export function createMockDocument(overrides?: Partial<Document>): Document {
  return {
    numero: 1,
    expediente: 'EXPEDIENTE 01234/2025',
    expedienteLink: 'https://sjpo.pjbc.gob.mx/Sentencias_JEF/ExpedienteDetalle.aspx?Exp=01234/2025',
    juzgado: 'JUZGADO PRIMERO CIVIL',
    fechaPublicacion: '09/02/2026',
    ciudad: 'TIJUANA',
    descripcion: 'AUTO DE TRÁMITE',
    promociones: '0',
    downloadOnclick: 'VerArchivoNotificacion(1,2,3,4,5,"doc.pdf",0)',
    ...overrides
  };
}

/**
 * Creates an expediente map from case data
 */
export function createExpedienteMap(
  cases: Array<{ caseNumber: string; id: string }>
): Map<string, string> {
  const map = new Map<string, string>();
  cases.forEach(c => {
    map.set(normalizeExpediente(c.caseNumber), c.id);
  });
  return map;
}

/**
 * Creates mock sync parameters with defaults
 */
export function createSyncParams(overrides?: Partial<SyncUserParams>): SyncUserParams {
  return {
    userId: 'test-user-123',
    vaultPasswordId: 'vault-pwd-id',
    vaultKeyFileId: 'vault-key-id',
    vaultCerFileId: 'vault-cer-id',
    email: 'test@example.com',
    retryCount: 0,
    supabase: createMockSupabase() as any,
    logger: createMockLogger(),
    ...overrides
  };
}

/**
 * Creates multiple mock documents with sequential numbers
 */
export function createMockDocuments(count: number, overrides?: Partial<Document>): Document[] {
  return Array.from({ length: count }, (_, i) =>
    createMockDocument({
      numero: i + 1,
      expediente: `EXPEDIENTE ${String(i + 1).padStart(5, '0')}/2025`,
      ...overrides
    })
  );
}

/**
 * Creates a mock case file record
 */
export function createMockCaseFile(overrides?: {
  id?: string;
  caseId?: string;
  expediente?: string;
  numero?: number;
  descripcion?: string;
}) {
  return {
    id: overrides?.id || 'case-file-123',
    case_id: overrides?.caseId || 'case-123',
    expediente: overrides?.expediente || '01234/2025',
    numero: overrides?.numero || 1,
    descripcion: overrides?.descripcion || 'AUTO DE TRÁMITE',
    fecha_publicacion: '2026-02-09',
    ciudad: 'TIJUANA',
    juzgado: 'JUZGADO PRIMERO CIVIL',
    pdf_url: null,
    ai_summary: null,
    created_at: new Date().toISOString()
  };
}

/**
 * Creates a mock user profile
 */
export function createMockUserProfile(overrides?: {
  userId?: string;
  phone?: string | null;
  whatsappEnabled?: boolean;
}) {
  return {
    id: overrides?.userId || 'test-user-123',
    phone: overrides?.phone !== undefined ? overrides.phone : '+526641234567',
    whatsapp_enabled: overrides?.whatsappEnabled !== undefined ? overrides.whatsappEnabled : true,
    created_at: new Date().toISOString()
  };
}
