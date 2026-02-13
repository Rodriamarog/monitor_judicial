/**
 * Tests for ai-summarizer.ts
 * Priority 6: PDF download, base64 encoding, Gemini API integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDocumentSummary, SummaryParams } from '../ai-summarizer';
import { createMockSupabase, createMockGeminiModel, createMockPDFBuffer } from '../../__tests__/test-utils/mocks';
import * as gemini from '../../gemini';

// Mock the gemini module
vi.mock('../../gemini', () => ({
  getGeminiClient: vi.fn()
}));

describe('generateDocumentSummary', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let mockGeminiModel: ReturnType<typeof createMockGeminiModel>;
  let baseParams: SummaryParams;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    mockGeminiModel = createMockGeminiModel();

    baseParams = {
      pdfPath: 'user-123/tribunal/2026-02-09/01234-2025_1234567890.pdf',
      supabase: mockSupabase as any,
      expediente: '01234/2025',
      juzgado: 'JUZGADO PRIMERO CIVIL',
      descripcion: 'AUTO DE TRÁMITE'
    };

    // Default: Gemini returns model with generateContent
    vi.spyOn(gemini, 'getGeminiClient').mockReturnValue({
      getGenerativeModel: vi.fn().mockReturnValue(mockGeminiModel)
    } as any);
  });

  describe('PDF Download from Storage', () => {
    it('should download PDF from tribunal-documents bucket', async () => {
      const mockPdfBuffer = createMockPDFBuffer();
      mockSupabase.storage.download.mockResolvedValue({
        data: new Blob([mockPdfBuffer], { type: 'application/pdf' }),
        error: null
      });

      await generateDocumentSummary(baseParams);

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('tribunal-documents');
      expect(mockSupabase.storage.download).toHaveBeenCalledWith(baseParams.pdfPath);
    });

    it('should return error when PDF download fails', async () => {
      mockSupabase.storage.download.mockResolvedValue({
        data: null,
        error: { message: 'File not found' }
      });

      const result = await generateDocumentSummary(baseParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al descargar PDF');
      expect(result.error).toContain('File not found');
    });

    it('should return error when PDF data is null', async () => {
      mockSupabase.storage.download.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await generateDocumentSummary(baseParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No data');
    });
  });

  describe('Base64 Encoding', () => {
    it('should convert PDF ArrayBuffer to base64', async () => {
      const mockPdfBuffer = createMockPDFBuffer(100);
      mockSupabase.storage.download.mockResolvedValue({
        data: new Blob([mockPdfBuffer], { type: 'application/pdf' }),
        error: null
      });

      const result = await generateDocumentSummary(baseParams);

      // Should call Gemini with base64 data
      expect(mockGeminiModel.generateContent).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ text: expect.any(String) }),
          expect.objectContaining({
            inlineData: expect.objectContaining({
              mimeType: 'application/pdf',
              data: expect.any(String) // base64 string
            })
          })
        ])
      );
    });

    it('should handle large PDFs', async () => {
      const largePdfBuffer = createMockPDFBuffer(5000);
      mockSupabase.storage.download.mockResolvedValue({
        data: new Blob([largePdfBuffer], { type: 'application/pdf' }),
        error: null
      });

      const result = await generateDocumentSummary(baseParams);

      expect(result.success).toBe(true);
      expect(mockGeminiModel.generateContent).toHaveBeenCalled();
    });
  });

  describe('Gemini API Integration', () => {
    beforeEach(() => {
      const mockPdfBuffer = createMockPDFBuffer();
      mockSupabase.storage.download.mockResolvedValue({
        data: new Blob([mockPdfBuffer], { type: 'application/pdf' }),
        error: null
      });
    });

    it('should call Gemini with correct model', async () => {
      const mockGetModel = vi.fn().mockReturnValue(mockGeminiModel);
      vi.spyOn(gemini, 'getGeminiClient').mockReturnValue({
        getGenerativeModel: mockGetModel
      } as any);

      await generateDocumentSummary(baseParams);

      expect(mockGetModel).toHaveBeenCalledWith({ model: 'gemini-3-flash-preview' });
    });

    it('should pass expediente, juzgado, and descripcion in prompt', async () => {
      await generateDocumentSummary(baseParams);

      expect(mockGeminiModel.generateContent).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('01234/2025')
          })
        ])
      );

      expect(mockGeminiModel.generateContent).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('JUZGADO PRIMERO CIVIL')
          })
        ])
      );

      expect(mockGeminiModel.generateContent).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('AUTO DE TRÁMITE')
          })
        ])
      );
    });

    it('should extract summary text from response', async () => {
      const mockSummary = 'Auto de trámite. Se recibieron las pruebas. No hay acciones urgentes.';
      mockGeminiModel.generateContent.mockResolvedValue({
        response: {
          text: vi.fn().mockReturnValue(mockSummary)
        }
      });

      const result = await generateDocumentSummary(baseParams);

      expect(result.success).toBe(true);
      expect(result.summary).toBe(mockSummary);
    });

    it('should return error when Gemini returns empty summary', async () => {
      mockGeminiModel.generateContent.mockResolvedValue({
        response: {
          text: vi.fn().mockReturnValue('')
        }
      });

      const result = await generateDocumentSummary(baseParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No se generó resumen');
    });

    it('should handle Gemini API timeout', async () => {
      mockGeminiModel.generateContent.mockRejectedValue(new Error('Request timeout'));

      const result = await generateDocumentSummary(baseParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });

    it('should handle Gemini API rate limit (429)', async () => {
      mockGeminiModel.generateContent.mockRejectedValue(new Error('Rate limit exceeded'));

      const result = await generateDocumentSummary(baseParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });
  });

  describe('Error Handling', () => {
    it('should catch and return error when exception is thrown', async () => {
      mockSupabase.storage.download.mockRejectedValue(new Error('Storage service unavailable'));

      const result = await generateDocumentSummary(baseParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage service unavailable');
    });

    it('should handle non-Error exceptions', async () => {
      mockSupabase.storage.download.mockRejectedValue('String error');

      const result = await generateDocumentSummary(baseParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error desconocido al generar resumen');
    });

    it('should log error context', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabase.storage.download.mockRejectedValue(new Error('Test error'));

      await generateDocumentSummary(baseParams);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AI Summary] Error:',
        expect.objectContaining({
          message: 'Test error',
          expediente: '01234/2025',
          juzgado: 'JUZGADO PRIMERO CIVIL',
          step: 'generate_summary'
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Prompt Engineering', () => {
    beforeEach(() => {
      const mockPdfBuffer = createMockPDFBuffer();
      mockSupabase.storage.download.mockResolvedValue({
        data: new Blob([mockPdfBuffer], { type: 'application/pdf' }),
        error: null
      });
    });

    it('should include WhatsApp conciseness instruction', async () => {
      await generateDocumentSummary(baseParams);

      const call = mockGeminiModel.generateContent.mock.calls[0][0];
      const promptText = call[0].text;

      expect(promptText).toContain('WhatsApp');
      expect(promptText).toContain('EXTREMADAMENTE CONCISO');
    });

    it('should include 100 word limit', async () => {
      await generateDocumentSummary(baseParams);

      const call = mockGeminiModel.generateContent.mock.calls[0][0];
      const promptText = call[0].text;

      expect(promptText).toContain('Máximo 100 palabras');
    });

    it('should prohibit markdown formatting', async () => {
      await generateDocumentSummary(baseParams);

      const call = mockGeminiModel.generateContent.mock.calls[0][0];
      const promptText = call[0].text;

      expect(promptText).toContain('NO uses asteriscos');
      expect(promptText).toContain('negritas');
      expect(promptText).toContain('formato markdown');
    });
  });
});
