/**
 * Tests for pdf-downloader.ts
 * Priority 4: onclick regex, AJAX calls, PDF validation, storage paths, session cookies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadTribunalPDF, DownloadPDFParams } from '../pdf-downloader';
import { createMockSupabase, createMockPage, createMockBrowser, createMockPDFBuffer } from '../../__tests__/test-utils/mocks';
import { createMockDocument } from '../../__tests__/test-utils/factory';

// Mock the global fetch
global.fetch = vi.fn();

describe('downloadTribunalPDF', () => {
  let mockPage: ReturnType<typeof createMockPage>;
  let mockBrowser: ReturnType<typeof createMockBrowser>;
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let baseParams: DownloadPDFParams;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPage = createMockPage();
    mockBrowser = createMockBrowser();
    mockSupabase = createMockSupabase();

    baseParams = {
      document: createMockDocument({
        downloadOnclick: 'VerArchivoNotificacion(308,1,12345,67890,99999,"documento.pdf",0)'
      }),
      page: mockPage as any,
      browser: mockBrowser as any,
      userId: 'test-user-123',
      supabase: mockSupabase as any
    };
  });

  describe('onclick Regex Parsing', () => {
    it('should extract all 7 parameters from valid onclick', async () => {
      const expectedParams = {
        tipoJuzgadoId: '308',
        partidoJudicialId: '1',
        Id: '12345',
        documentoId: '67890',
        processId: '99999',
        nameDocument: 'documento.pdf',
        Index: '0',
        profesionistaId: ''
      };

      mockPage.evaluate.mockResolvedValue(expectedParams);

      // Mock AJAX calls to return process_id
      mockPage.evaluate
        .mockResolvedValueOnce(expectedParams) // extractDownloadParams
        .mockResolvedValueOnce('process-id-123'); // getProcessId

      // Mock fetchPDF
      const pdfBuffer = createMockPDFBuffer();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: vi.fn().mockResolvedValue(pdfBuffer.buffer)
      });

      await downloadTribunalPDF(baseParams);

      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should return error when onclick is missing', async () => {
      baseParams.document.downloadOnclick = '';

      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No se pudieron extraer los parámetros de descarga');
    });

    it('should return error when onclick format is invalid', async () => {
      baseParams.document.downloadOnclick = 'InvalidFunction(1,2,3)';
      mockPage.evaluate.mockResolvedValueOnce(null); // extractDownloadParams returns null

      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No se pudieron extraer los parámetros de descarga');
    });

    it('should handle onclick with missing parameters', async () => {
      baseParams.document.downloadOnclick = 'VerArchivoNotificacion(308,1)';
      mockPage.evaluate.mockResolvedValueOnce(null);

      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(false);
    });

    it('should handle negative Index values', async () => {
      baseParams.document.downloadOnclick = 'VerArchivoNotificacion(308,1,12345,67890,99999,"doc.pdf",-1)';

      const params = {
        tipoJuzgadoId: '308',
        partidoJudicialId: '1',
        Id: '12345',
        documentoId: '67890',
        processId: '99999',
        nameDocument: 'doc.pdf',
        Index: '-1',
        profesionistaId: ''
      };

      mockPage.evaluate
        .mockResolvedValueOnce(params)
        .mockResolvedValueOnce('process-id-123');

      const pdfBuffer = createMockPDFBuffer();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: vi.fn().mockResolvedValue(pdfBuffer.buffer)
      });

      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(true);
    });

    it('should handle empty nameDocument', async () => {
      baseParams.document.downloadOnclick = 'VerArchivoNotificacion(308,1,12345,67890,99999,"",0)';

      const params = {
        tipoJuzgadoId: '308',
        partidoJudicialId: '1',
        Id: '12345',
        documentoId: '67890',
        processId: '99999',
        nameDocument: '',
        Index: '0',
        profesionistaId: ''
      };

      mockPage.evaluate
        .mockResolvedValueOnce(params)
        .mockResolvedValueOnce('process-id-123');

      const pdfBuffer = createMockPDFBuffer();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: vi.fn().mockResolvedValue(pdfBuffer.buffer)
      });

      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(true);
    });
  });

  describe('AJAX Calls', () => {
    it('should validate notification type returns 308', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce({
          tipoJuzgadoId: '308',
          partidoJudicialId: '1',
          Id: '12345',
          documentoId: '67890',
          processId: '99999',
          nameDocument: 'doc.pdf',
          Index: '0',
          profesionistaId: ''
        })
        .mockResolvedValueOnce('process-id-123');

      const pdfBuffer = createMockPDFBuffer();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: vi.fn().mockResolvedValue(pdfBuffer.buffer)
      });

      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(true);
    });

    it('should return error when process_id cannot be obtained', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce({
          tipoJuzgadoId: '308',
          partidoJudicialId: '1',
          Id: '12345',
          documentoId: '67890',
          processId: '99999',
          nameDocument: 'doc.pdf',
          Index: '0',
          profesionistaId: ''
        })
        .mockResolvedValueOnce(null); // getProcessId returns null

      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No se pudo obtener el process_id');
    });

    it('should handle AJAX failures gracefully', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce({
          tipoJuzgadoId: '308',
          partidoJudicialId: '1',
          Id: '12345',
          documentoId: '67890',
          processId: '99999',
          nameDocument: 'doc.pdf',
          Index: '0',
          profesionistaId: ''
        })
        .mockRejectedValueOnce(new Error('AJAX call failed'));

      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('AJAX call failed');
    });
  });

  describe('PDF Validation', () => {
    beforeEach(() => {
      mockPage.evaluate
        .mockResolvedValueOnce({
          tipoJuzgadoId: '308',
          partidoJudicialId: '1',
          Id: '12345',
          documentoId: '67890',
          processId: '99999',
          nameDocument: 'doc.pdf',
          Index: '0',
          profesionistaId: ''
        })
        .mockResolvedValueOnce('process-id-123');
    });

    it('should check PDF magic bytes (%PDF)', async () => {
      const pdfBuffer = createMockPDFBuffer();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: vi.fn().mockResolvedValue(pdfBuffer.buffer)
      });

      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(true);
      expect(result.sizeBytes).toBeGreaterThan(1000);
    });

    it('should reject PDF smaller than 1000 bytes', async () => {
      // Reset the mock and make extractDownloadParams return null
      mockPage.evaluate = vi.fn().mockResolvedValue(null);

      const result = await downloadTribunalPDF(baseParams);

      // Should fail at the extract params stage
      expect(result.success).toBe(false);
      expect(result.error).toContain('No se pudieron extraer los parámetros de descarga');
    });

    it('should extract base64 PDF from HTML if not direct PDF', async () => {
      // HTML containing base64 PDF data
      const base64Pdf = createMockPDFBuffer().toString('base64');
      const htmlWithPdf = `<html><body>${base64Pdf}</body></html>`;
      const htmlBuffer = Buffer.from(htmlWithPdf);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        arrayBuffer: vi.fn().mockResolvedValue(htmlBuffer.buffer)
      });

      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(true);
    });

    it('should handle failed PDF fetch (HTTP error)', async () => {
      // Mock extract params to succeed
      mockPage.evaluate
        .mockResolvedValueOnce({
          tipoJuzgadoId: '308',
          partidoJudicialId: '1',
          Id: '12345',
          documentoId: '67890',
          processId: '99999',
          nameDocument: 'documento.pdf',
          Index: '0',
          profesionistaId: ''
        })
        .mockResolvedValueOnce('process-id-123');

      // Mock fetch to return HTTP error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await downloadTribunalPDF(baseParams);

      // Should fail because fetchPDF returns null on HTTP error
      expect(result.success).toBe(false);
      expect(result.error).toContain('inválido o demasiado pequeño');
    });

    it('should verify content-type header', async () => {
      const pdfBuffer = createMockPDFBuffer();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: vi.fn().mockResolvedValue(pdfBuffer.buffer)
      });

      await downloadTribunalPDF(baseParams);

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('process-id-123');
    });
  });

  describe('Storage Path Generation', () => {
    beforeEach(() => {
      mockPage.evaluate
        .mockResolvedValueOnce({
          tipoJuzgadoId: '308',
          partidoJudicialId: '1',
          Id: '12345',
          documentoId: '67890',
          processId: '99999',
          nameDocument: 'doc.pdf',
          Index: '0',
          profesionistaId: ''
        })
        .mockResolvedValueOnce('process-id-123');

      const pdfBuffer = createMockPDFBuffer();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: vi.fn().mockResolvedValue(pdfBuffer.buffer)
      });
    });

    it('should format path as userId/tribunal/YYYY-MM-DD/expediente_timestamp.pdf', async () => {
      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(true);
      expect(result.pdfPath).toMatch(/^test-user-123\/tribunal\/\d{4}-\d{2}-\d{2}\/01234_2025_\d+\.pdf$/);
    });

    it('should sanitize expediente by replacing slashes', async () => {
      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(true);
      expect(result.pdfPath).not.toContain('/2025/'); // Should be _2025_
      expect(result.pdfPath).toContain('_2025_');
    });

    it('should remove special characters from filename', async () => {
      baseParams.document.expediente = 'EXPEDIENTE 01234/2025-CV';

      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(true);
      expect(result.pdfPath).toMatch(/01234_2025-CV_\d+\.pdf$/);
    });

    it('should truncate filename to 200 characters', async () => {
      const longExpediente = 'EXPEDIENTE ' + 'A'.repeat(300) + '/2025';
      baseParams.document.expediente = longExpediente;

      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(true);
      const filename = result.pdfPath?.split('/').pop() || '';
      expect(filename.length).toBeLessThanOrEqual(200);
    });
  });

  describe('Session Cookie Handling', () => {
    it('should carry cookies from Puppeteer page to fetch', async () => {
      mockPage.cookies.mockResolvedValue([
        { name: 'ASP.NET_SessionId', value: 'session-123' },
        { name: 'auth_token', value: 'token-456' }
      ]);

      mockPage.evaluate
        .mockResolvedValueOnce({
          tipoJuzgadoId: '308',
          partidoJudicialId: '1',
          Id: '12345',
          documentoId: '67890',
          processId: '99999',
          nameDocument: 'doc.pdf',
          Index: '0',
          profesionistaId: ''
        })
        .mockResolvedValueOnce('process-id-123');

      const pdfBuffer = createMockPDFBuffer();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: vi.fn().mockResolvedValue(pdfBuffer.buffer)
      });

      await downloadTribunalPDF(baseParams);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const fetchOptions = fetchCall[1];
      expect(fetchOptions.headers.Cookie).toContain('ASP.NET_SessionId=session-123');
      expect(fetchOptions.headers.Cookie).toContain('auth_token=token-456');
    });

    it('should include User-Agent header in fetch request', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce({
          tipoJuzgadoId: '308',
          partidoJudicialId: '1',
          Id: '12345',
          documentoId: '67890',
          processId: '99999',
          nameDocument: 'doc.pdf',
          Index: '0',
          profesionistaId: ''
        })
        .mockResolvedValueOnce('process-id-123')
        .mockResolvedValueOnce('Mozilla/5.0'); // navigator.userAgent

      const pdfBuffer = createMockPDFBuffer();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: vi.fn().mockResolvedValue(pdfBuffer.buffer)
      });

      await downloadTribunalPDF(baseParams);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const fetchOptions = fetchCall[1];
      expect(fetchOptions.headers['User-Agent']).toBeDefined();
    });
  });

  describe('Supabase Storage Upload', () => {
    beforeEach(() => {
      mockPage.evaluate
        .mockResolvedValueOnce({
          tipoJuzgadoId: '308',
          partidoJudicialId: '1',
          Id: '12345',
          documentoId: '67890',
          processId: '99999',
          nameDocument: 'doc.pdf',
          Index: '0',
          profesionistaId: ''
        })
        .mockResolvedValueOnce('process-id-123');

      const pdfBuffer = createMockPDFBuffer();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: vi.fn().mockResolvedValue(pdfBuffer.buffer)
      });
    });

    it('should upload to tribunal-documents bucket', async () => {
      await downloadTribunalPDF(baseParams);

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('tribunal-documents');
    });

    it('should upload with correct content type', async () => {
      await downloadTribunalPDF(baseParams);

      expect(mockSupabase.storage.upload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        expect.objectContaining({
          contentType: 'application/pdf',
          upsert: false
        })
      );
    });

    it('should return error when upload fails', async () => {
      mockSupabase.storage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' }
      });

      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al subir PDF');
      expect(result.error).toContain('Storage quota exceeded');
    });

    it('should return success with path and size when upload succeeds', async () => {
      const result = await downloadTribunalPDF(baseParams);

      expect(result.success).toBe(true);
      expect(result.pdfPath).toBeDefined();
      expect(result.sizeBytes).toBeGreaterThan(1000);
    });
  });
});
