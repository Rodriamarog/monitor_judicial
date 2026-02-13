/**
 * Test fixtures - sample document data for testing
 */

import type { Document } from '../../document-scraper';

/**
 * Sample valid documents
 */
export const VALID_DOCUMENTS: Document[] = [
  {
    numero: 1,
    expediente: 'EXPEDIENTE 01234/2025',
    expedienteLink: 'https://sjpo.pjbc.gob.mx/Sentencias_JEF/ExpedienteDetalle.aspx?Exp=01234/2025',
    juzgado: 'JUZGADO PRIMERO CIVIL',
    fechaPublicacion: '09/02/2026',
    ciudad: 'TIJUANA',
    descripcion: 'AUTO DE TRÁMITE',
    promociones: '0',
    downloadOnclick: 'VerArchivoNotificacion(1,2,3,4,5,"documento.pdf",0)'
  },
  {
    numero: 2,
    expediente: 'EXPEDIENTE 00567/2025',
    expedienteLink: 'https://sjpo.pjbc.gob.mx/Sentencias_JEF/ExpedienteDetalle.aspx?Exp=00567/2025',
    juzgado: 'JUZGADO SEGUNDO MERCANTIL',
    fechaPublicacion: '08/02/2026',
    ciudad: 'MEXICALI',
    descripcion: 'SENTENCIA DEFINITIVA',
    promociones: '2',
    downloadOnclick: 'VerArchivoNotificacion(6,7,8,9,10,"sentencia.pdf",1)'
  },
  {
    numero: 3,
    expediente: 'EXPEDIENTE 00890/2024',
    expedienteLink: 'https://sjpo.pjbc.gob.mx/Sentencias_JEF/ExpedienteDetalle.aspx?Exp=00890/2024',
    juzgado: 'JUZGADO TERCERO FAMILIAR',
    fechaPublicacion: '07/02/2026',
    ciudad: 'ENSENADA',
    descripcion: 'ACUERDO',
    promociones: '1',
    downloadOnclick: 'VerArchivoNotificacion(11,12,13,14,15,"acuerdo.pdf",0)'
  }
];

/**
 * Documents with edge cases
 */
export const EDGE_CASE_DOCUMENTS: Document[] = [
  // Expediente without prefix
  {
    numero: 1,
    expediente: '123/2025',
    expedienteLink: 'https://sjpo.pjbc.gob.mx/Sentencias_JEF/ExpedienteDetalle.aspx?Exp=123/2025',
    juzgado: 'JUZGADO PRIMERO',
    fechaPublicacion: '09/02/2026',
    ciudad: 'TIJUANA',
    descripcion: 'AUTO',
    promociones: '0',
    downloadOnclick: 'VerArchivoNotificacion(1,2,3,4,5,"doc.pdf",0)'
  },
  // Expediente with suffix
  {
    numero: 2,
    expediente: '456/24-CV',
    expedienteLink: 'https://sjpo.pjbc.gob.mx/Sentencias_JEF/ExpedienteDetalle.aspx?Exp=456/24-CV',
    juzgado: 'JUZGADO SEGUNDO',
    fechaPublicacion: '08/02/2026',
    ciudad: 'MEXICALI',
    descripcion: 'SENTENCIA',
    promociones: '0',
    downloadOnclick: 'VerArchivoNotificacion(6,7,8,9,10,"sent.pdf",0)'
  },
  // Invalid date format
  {
    numero: 3,
    expediente: '789/2025',
    expedienteLink: 'https://sjpo.pjbc.gob.mx/Sentencias_JEF/ExpedienteDetalle.aspx?Exp=789/2025',
    juzgado: 'JUZGADO TERCERO',
    fechaPublicacion: '32/13/2026', // Invalid
    ciudad: 'ENSENADA',
    descripcion: 'ACUERDO',
    promociones: '0',
    downloadOnclick: 'VerArchivoNotificacion(11,12,13,14,15,"doc.pdf",0)'
  },
  // No downloadOnclick
  {
    numero: 4,
    expediente: '999/2025',
    expedienteLink: 'https://sjpo.pjbc.gob.mx/Sentencias_JEF/ExpedienteDetalle.aspx?Exp=999/2025',
    juzgado: 'JUZGADO CUARTO',
    fechaPublicacion: '07/02/2026',
    ciudad: 'TIJUANA',
    descripcion: 'NOTIFICACIÓN',
    promociones: '0',
    downloadOnclick: '' // Empty onclick
  }
];

/**
 * Sample onclick attribute values
 */
export const ONCLICK_EXAMPLES = {
  valid: 'VerArchivoNotificacion(308,12345,67890,1,0,"SENTENCIA_DEFINITIVA.pdf",0)',
  missingParams: 'VerArchivoNotificacion(308,12345)',
  invalidFormat: 'InvalidFunction(1,2,3)',
  emptyName: 'VerArchivoNotificacion(308,12345,67890,1,0,"",0)',
  negativeIndex: 'VerArchivoNotificacion(308,12345,67890,-1,0,"doc.pdf",0)'
};

/**
 * Sample date formats
 */
export const DATE_EXAMPLES = {
  valid: {
    'DD/MM/YYYY': '09/02/2026',
    'D/M/YYYY': '9/2/2026',
    'DD/MM/YY': '09/02/26'
  },
  invalid: {
    'ISO format': '2026-02-09',
    'wrong separator': '09-02-2026',
    'month > 12': '09/13/2026',
    'day > 31': '32/02/2026',
    empty: '',
    null: null as any
  }
};

/**
 * Sample expediente formats
 */
export const EXPEDIENTE_EXAMPLES = {
  withPrefix: 'EXPEDIENTE 01234/2025',
  withoutPrefix: '01234/2025',
  unpadded: '123/2025',
  withSuffix: '01234/25-CV',
  lowercase: 'expediente 123/2025',
  withSpaces: '  01234/2025  ',
  twoDigitYear: '01234/25',
  malformed: 'ABC/2025'
};

/**
 * Sample case file records
 */
export const CASE_FILES = [
  {
    id: 'file-001',
    case_id: 'case-001',
    expediente: '01234/2025',
    numero: 1,
    descripcion: 'AUTO DE TRÁMITE',
    fecha_publicacion: '2026-02-09'
  },
  {
    id: 'file-002',
    case_id: 'case-001',
    expediente: '01234/2025',
    numero: 2,
    descripcion: 'SENTENCIA',
    fecha_publicacion: '2026-02-08'
  }
];

/**
 * Sample monitored cases
 */
export const MONITORED_CASES = [
  {
    id: 'case-001',
    user_id: 'user-123',
    case_number: '01234/2025',
    court: 'JUZGADO PRIMERO CIVIL'
  },
  {
    id: 'case-002',
    user_id: 'user-123',
    case_number: '00567/2025',
    court: 'JUZGADO SEGUNDO MERCANTIL'
  }
];
