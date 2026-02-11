/**
 * Tests for scraper-runner.ts
 * Priority 3: Email selector fallback, login verification, tribunal navigation,
 * certificate handling, screenshot on error, browser lifecycle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runTribunalScraper, ScraperParams } from '../scraper-runner';
import { createMockPage, createMockBrowser } from '../../__tests__/test-utils/mocks';
import * as puppeteer from 'puppeteer-extra';
import * as fs from 'fs';

// Mock puppeteer-extra
vi.mock('puppeteer-extra', () => {
  const actual = vi.importActual('puppeteer-extra');
  return {
    ...actual,
    default: {
      use: vi.fn(),
      launch: vi.fn()
    }
  };
});

// Mock fs for certificate handling
vi.mock('fs');

// Mock the scraper module
vi.mock('../../../tribunal_electronico/src/scraper', () => ({
  scrapeDocumentos: vi.fn().mockResolvedValue([
    {
      numero: 1,
      expediente: 'EXPEDIENTE 01234/2025',
      expedienteLink: 'https://example.com/exp',
      juzgado: 'JUZGADO PRIMERO CIVIL',
      fechaPublicacion: '09/02/2026',
      ciudad: 'TIJUANA',
      descripcion: 'AUTO DE TRÁMITE',
      promociones: '0',
      downloadOnclick: 'VerArchivoNotificacion(1,2,3,4,5,"doc.pdf",0)'
    }
  ])
}));

describe('runTribunalScraper', () => {
  let mockPage: ReturnType<typeof createMockPage>;
  let mockBrowser: ReturnType<typeof createMockBrowser>;
  let baseParams: ScraperParams;

  // Helper to set up successful flow
  const setupSuccessfulFlow = () => {
    // Email selector succeeds
    mockPage.waitForSelector.mockResolvedValue({} as any);
    mockPage.click.mockResolvedValue(undefined);
    mockPage.type.mockResolvedValue(undefined);

    // File upload
    mockPage.$$.mockResolvedValue([
      { uploadFile: vi.fn().mockResolvedValue(undefined) },
      { uploadFile: vi.fn().mockResolvedValue(undefined) }
    ] as any);

    // Login button found and clicked
    mockPage.evaluate.mockResolvedValue(true);

    // Navigation completes
    mockPage.waitForNavigation.mockResolvedValue(null as any);

    // No error message
    mockPage.$eval.mockRejectedValue(new Error('No element'));

    // URL verification
    mockPage.url.mockReturnValue('https://sjpo.pjbc.gob.mx/tribunalelectronico/default.aspx');

    // Find documentos links
    mockPage.evaluate.mockResolvedValue([{
      text: 'DOCUMENTOS',
      href: 'https://tribunalelectronico.pjbc.gob.mx/Documentos/ObtenerDocumentos/'
    }]);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPage = createMockPage();
    mockBrowser = createMockBrowser();
    mockBrowser.newPage.mockResolvedValue(mockPage);

    baseParams = {
      email: 'test@example.com',
      password: 'password123',
      keyFileBase64: Buffer.from('mock key file').toString('base64'),
      cerFileBase64: Buffer.from('mock cer file').toString('base64')
    };

    // Mock puppeteer launch
    (puppeteer.default.launch as any) = vi.fn().mockResolvedValue(mockBrowser);

    // Mock fs
    (fs.writeFileSync as any).mockImplementation(() => {});
    (fs.existsSync as any).mockReturnValue(true);
    (fs.unlinkSync as any).mockImplementation(() => {});

    // Mock setTimeout and setInterval to execute immediately
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Email Selector Fallback', () => {
    it('should try first selector and succeed if available', async () => {
      setupSuccessfulFlow();

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        'input[placeholder="Correo Electrónico"]',
        expect.any(Object)
      );
      expect(mockPage.type).toHaveBeenCalledWith(
        'input[placeholder="Correo Electrónico"]',
        'test@example.com',
        { delay: 50 }
      );
      expect(result.success).toBe(true);
    });

    it('should try second selector if first fails', async () => {
      let waitCount = 0;
      mockPage.waitForSelector.mockImplementation((selector: string) => {
        waitCount++;
        // First email selector fails, second succeeds
        if (selector.includes('placeholder') && waitCount === 1) {
          return Promise.reject(new Error('Not found'));
        }
        return Promise.resolve({} as any);
      });

      setupSuccessfulFlow();

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      const result = await promise;

      // Should have tried multiple selectors
      const calls = (mockPage.waitForSelector as any).mock.calls;
      expect(calls.length).toBeGreaterThan(1);
      expect(result.success).toBe(true);
    });

    it('should throw error when all email selectors fail', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Not found'));

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('No se pudo encontrar el campo de correo');
    });

    it('should stop after first successful selector', async () => {
      setupSuccessfulFlow();

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      await promise;

      // First email selector should succeed, so no retry
      const emailCalls = (mockPage.type as any).mock.calls.filter((call: any) =>
        call[1] === 'test@example.com'
      );
      expect(emailCalls.length).toBe(1);
    });
  });

  describe('Login Verification', () => {
    it('should detect error messages after login', async () => {
      setupSuccessfulFlow();
      mockPage.$eval.mockResolvedValue('Credenciales incorrectas');

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error de autenticación');
    });

    it('should verify URL contains expected paths', async () => {
      setupSuccessfulFlow();
      mockPage.url.mockReturnValue('https://sjpo.pjbc.gob.mx/invalid-page');

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('No se pudo verificar el inicio de sesión');
    });

    it('should succeed when URL contains default.aspx', async () => {
      setupSuccessfulFlow();

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
    });

    it('should succeed when URL contains home', async () => {
      setupSuccessfulFlow();
      mockPage.url.mockReturnValue('https://sjpo.pjbc.gob.mx/home');

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
    });
  });

  describe('Tribunal Navigation', () => {
    it('should try ID selector first for tribunal button', async () => {
      setupSuccessfulFlow();

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      await promise;

      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        '#MainContent_Button2',
        expect.any(Object)
      );
      expect(mockPage.click).toHaveBeenCalledWith('#MainContent_Button2');
    });

    it('should throw error when both selectors fail', async () => {
      setupSuccessfulFlow();

      let selectorCount = 0;
      mockPage.waitForSelector.mockImplementation((selector: string) => {
        selectorCount++;
        if (selector === '#MainContent_Button2') {
          return Promise.reject(new Error('Not found'));
        }
        return Promise.resolve({} as any);
      });

      // Make both button attempts fail
      mockPage.evaluate
        .mockResolvedValueOnce(true) // login button works
        .mockResolvedValueOnce(false); // tribunal button fallback fails

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('No se pudo encontrar el botón de Tribunal');
    });
  });

  describe('Certificate Handling', () => {
    it('should decode base64 to buffers', async () => {
      setupSuccessfulFlow();

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      await promise;

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.key'),
        expect.any(Buffer)
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.cer'),
        expect.any(Buffer)
      );
    });

    it('should write temp files with timestamp', async () => {
      setupSuccessfulFlow();

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      await promise;

      const calls = (fs.writeFileSync as any).mock.calls;
      expect(calls[0][0]).toMatch(/tribunal_scraper_\d+\.key/);
      expect(calls[1][0]).toMatch(/tribunal_scraper_\d+\.cer/);
    });

    it('should verify file existence', async () => {
      (fs.existsSync as any).mockReturnValue(false);

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('No se pudo crear el archivo .key');
    });

    it('should upload files via file inputs', async () => {
      const mockUpload1 = vi.fn().mockResolvedValue(undefined);
      const mockUpload2 = vi.fn().mockResolvedValue(undefined);

      setupSuccessfulFlow();
      mockPage.$$.mockResolvedValue([
        { uploadFile: mockUpload1 },
        { uploadFile: mockUpload2 }
      ] as any);

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      await promise;

      expect(mockUpload1).toHaveBeenCalledWith(expect.stringContaining('.key'));
      expect(mockUpload2).toHaveBeenCalledWith(expect.stringContaining('.cer'));
    });

    it('should cleanup temp files', async () => {
      setupSuccessfulFlow();

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      await promise;

      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('.key'));
      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('.cer'));
    });

    it('should throw error with less than 2 file inputs', async () => {
      setupSuccessfulFlow();
      mockPage.$$.mockResolvedValue([{ uploadFile: vi.fn() }] as any);

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('No se encontraron los campos para subir archivos');
    });
  });

  describe('Screenshot on Error', () => {
    it('should take screenshot when error occurs', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Test error'));

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      await promise;

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        path: expect.stringMatching(/\/tmp\/scraper-error-.*\.png/),
        fullPage: true
      });
    });

    it('should handle screenshot failures gracefully', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Test error'));
      mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      // Should still return error even if screenshot fails
      expect(result.error).toBeTruthy();
    });
  });

  describe('Browser Lifecycle', () => {
    it('should close browser on error', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Test error'));

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      await promise;

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should keep browser open on success', async () => {
      setupSuccessfulFlow();

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(mockBrowser.close).not.toHaveBeenCalled();
      expect(result.browser).toBe(mockBrowser);
      expect(result.page).toBe(mockPage);
    });
  });

  describe('Full Flow Integration', () => {
    it('should complete entire scraper flow successfully', async () => {
      setupSuccessfulFlow();

      const promise = runTribunalScraper(baseParams);
      await vi.runAllTimersAsync();
      const result = await promise;

      // Verify key steps were executed
      expect(puppeteer.default.launch).toHaveBeenCalled(); // ✓ Launch browser
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2); // ✓ Write cert files
      expect(mockPage.type).toHaveBeenCalled(); // ✓ Enter credentials
      expect(mockPage.$$).toHaveBeenCalled(); // ✓ Upload files
      expect(mockPage.evaluate).toHaveBeenCalled(); // ✓ Click buttons
      expect(mockPage.goto).toHaveBeenCalled(); // ✓ Navigate
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2); // ✓ Cleanup files

      expect(result.success).toBe(true);
      expect(result.documents.length).toBeGreaterThan(0);
    });
  });
});
