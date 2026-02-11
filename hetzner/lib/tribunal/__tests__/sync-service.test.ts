/**
 * Tests for sync-service.ts
 * Priority 2: Most complex component - comprehensive testing with proper mocking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncTribunalForUser, SyncUserParams } from '../sync-service';
import { createMockLogger, createMockBrowser, createMockPage } from '../../__tests__/test-utils/mocks';
import { createSyncParams, createMockDocument } from '../../__tests__/test-utils/factory';
import * as scraperRunner from '../scraper-runner';
import * as pdfDownloader from '../pdf-downloader';
import * as aiSummarizer from '../ai-summarizer';
import * as whatsappNotifier from '../whatsapp-notifier';

// Mock external modules
vi.mock('../scraper-runner');
vi.mock('../pdf-downloader');
vi.mock('../ai-summarizer');
vi.mock('../whatsapp-notifier');
vi.mock('puppeteer-extra', () => ({
  default: {
    use: vi.fn()
  }
}));
vi.mock('puppeteer-extra-plugin-stealth', () => ({
  default: vi.fn()
}));

describe('syncTribunalForUser', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let params: SyncUserParams;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockBrowser = createMockBrowser();
    mockPage = createMockPage();
  });

  /**
   * Helper to create a properly chained Supabase mock
   */
  function createSupabaseMock() {
    const mockSupabase: any = {};

    // Create a chainable query builder that returns a proper Promise
    const createQueryBuilder = (resolveValue: any = { data: null, error: null }) => {
      const promise = Promise.resolve(resolveValue);

      const builder: any = {
        from: vi.fn(),
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        eq: vi.fn(),
        single: vi.fn(),
        maybeSingle: vi.fn()
      };

      // Make all methods return builder for chaining
      builder.from.mockReturnValue(builder);
      builder.select.mockReturnValue(builder);
      builder.insert.mockReturnValue(builder);
      builder.update.mockReturnValue(builder);
      builder.eq.mockReturnValue(promise); // eq returns a promise

      // Terminal methods return promises
      builder.single.mockResolvedValue(resolveValue);
      builder.maybeSingle.mockResolvedValue(resolveValue);

      // Copy Promise methods to builder so select().eq() is awaitable
      Object.setPrototypeOf(builder, Promise.prototype);
      (builder as any).then = promise.then.bind(promise);
      (builder as any).catch = promise.catch.bind(promise);
      (builder as any).finally = promise.finally.bind(promise);

      return builder;
    };

    // Create the main supabase client
    let queryBuilder = createQueryBuilder();

    mockSupabase.from = vi.fn().mockImplementation(() => queryBuilder);
    mockSupabase.rpc = vi.fn().mockResolvedValue({ data: 'mock-secret', error: null });

    // Storage mock
    mockSupabase.storage = {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
      download: vi.fn().mockResolvedValue({
        data: new Blob(['mock pdf'], { type: 'application/pdf' }),
        error: null
      })
    };

    // Helper to reset with new query builder
    mockSupabase._resetQueryBuilder = (resolveValue?: any) => {
      queryBuilder = createQueryBuilder(resolveValue);
      mockSupabase.from.mockImplementation(() => queryBuilder);
      return queryBuilder;
    };

    return mockSupabase;
  }

  describe('Error Handling', () => {
    it('should return error when sync log creation fails', async () => {
      const mockSupabase = createSupabaseMock();
      const builder = mockSupabase._resetQueryBuilder({
        data: null,
        error: { message: 'Database error' }
      });

      params = createSyncParams({ supabase: mockSupabase, logger: mockLogger });
      const result = await syncTribunalForUser(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al crear sync log');
    });

    it('should return error when monitored cases fetch fails', async () => {
      const mockSupabase = createSupabaseMock();

      // First call: sync log creation succeeds
      mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });

      // Second call: monitored cases fetch fails
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });
        } else {
          return mockSupabase._resetQueryBuilder({
            data: null,
            error: { message: 'Cases fetch error' }
          });
        }
      });

      params = createSyncParams({ supabase: mockSupabase, logger: mockLogger });
      const result = await syncTribunalForUser(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error fetching monitored cases');
    });

    it('should return error when credentials fetch fails', async () => {
      const mockSupabase = createSupabaseMock();

      // Sync log creation succeeds
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Sync log insert
          return mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });
        } else {
          // Monitored cases select
          const builder = mockSupabase._resetQueryBuilder();
          builder.select.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          });
          return builder;
        }
      });

      // RPC fails
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Vault error' }
      });

      params = createSyncParams({ supabase: mockSupabase, logger: mockLogger });
      const result = await syncTribunalForUser(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al obtener credenciales del Vault');
    });

    it('should return error when credentials are incomplete', async () => {
      const mockSupabase = createSupabaseMock();

      // Setup successful initial calls
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });
        } else {
          const builder = mockSupabase._resetQueryBuilder();
          builder.select.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          });
          return builder;
        }
      });

      // Password succeeds, keyFile is null, cerFile succeeds
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 'password123', error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: 'cerFile', error: null });

      params = createSyncParams({ supabase: mockSupabase, logger: mockLogger });
      const result = await syncTribunalForUser(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Credenciales incompletas en Vault');
    });
  });

  describe('Scraper Integration', () => {
    it('should return error when scraper fails', async () => {
      const mockSupabase = createSupabaseMock();

      // Setup successful initial calls
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });
        } else {
          const builder = mockSupabase._resetQueryBuilder();
          builder.select.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          });
          return builder;
        }
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'secret', error: null });

      vi.spyOn(scraperRunner, 'runTribunalScraper').mockResolvedValue({
        success: false,
        documents: [],
        error: 'Login failed',
        browser: null,
        page: null
      });

      params = createSyncParams({ supabase: mockSupabase, logger: mockLogger });
      const result = await syncTribunalForUser(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Scraper failed');
    });

    it('should process empty document list successfully', async () => {
      const mockSupabase = createSupabaseMock();

      // Setup successful calls including final updates
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Sync log insert
          return mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });
        } else if (callCount === 2) {
          // Monitored cases select
          const builder = mockSupabase._resetQueryBuilder();
          builder.select.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          });
          return builder;
        } else {
          // Update calls (credentials, sync log)
          const builder = mockSupabase._resetQueryBuilder();
          builder.update.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: {}, error: null })
          });
          return builder;
        }
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'secret', error: null });

      vi.spyOn(scraperRunner, 'runTribunalScraper').mockResolvedValue({
        success: true,
        documents: [],
        browser: mockBrowser,
        page: mockPage
      });

      params = createSyncParams({ supabase: mockSupabase, logger: mockLogger });
      const result = await syncTribunalForUser(params);

      expect(result.success).toBe(true);
      expect(result.documentsProcessed).toBe(0);
      expect(result.newDocuments).toBe(0);
    });

    it('should close browser on completion', async () => {
      const mockSupabase = createSupabaseMock();

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });
        } else if (callCount === 2) {
          const builder = mockSupabase._resetQueryBuilder();
          builder.select.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          });
          return builder;
        } else {
          const builder = mockSupabase._resetQueryBuilder();
          builder.update.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: {}, error: null })
          });
          return builder;
        }
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'secret', error: null });

      const mockBrowserWithSpy = {
        ...mockBrowser,
        close: vi.fn().mockResolvedValue(undefined)
      };

      vi.spyOn(scraperRunner, 'runTribunalScraper').mockResolvedValue({
        success: true,
        documents: [],
        browser: mockBrowserWithSpy,
        page: mockPage
      });

      params = createSyncParams({ supabase: mockSupabase, logger: mockLogger });
      await syncTribunalForUser(params);

      expect(mockBrowserWithSpy.close).toHaveBeenCalled();
    });
  });

  describe('Document Filtering', () => {
    it('should filter documents by tracked expedientes', async () => {
      const mockSupabase = createSupabaseMock();

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });
        } else if (callCount === 2) {
          // Monitored cases - return one tracked case
          const builder = mockSupabase._resetQueryBuilder();
          builder.select.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'case-001', case_number: '1234/2025', juzgado: 'JUZGADO PRIMERO' }],
              error: null
            })
          });
          return builder;
        } else {
          const builder = mockSupabase._resetQueryBuilder();
          builder.update.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: {}, error: null })
          });
          return builder;
        }
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'secret', error: null });

      // Scraper returns 2 documents, only 1 matches
      vi.spyOn(scraperRunner, 'runTribunalScraper').mockResolvedValue({
        success: true,
        documents: [
          createMockDocument({ expediente: 'EXPEDIENTE 01234/2025' }), // Matches
          createMockDocument({ expediente: 'EXPEDIENTE 99999/2025' })  // Doesn't match
        ],
        browser: mockBrowser,
        page: mockPage
      });

      params = createSyncParams({ supabase: mockSupabase, logger: mockLogger });
      await syncTribunalForUser(params);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('1 documents match tracked expedientes (filtered from 2)')
      );
    });

    it('should skip all documents when no cases tracked', async () => {
      const mockSupabase = createSupabaseMock();

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });
        } else if (callCount === 2) {
          const builder = mockSupabase._resetQueryBuilder();
          builder.select.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          });
          return builder;
        } else {
          const builder = mockSupabase._resetQueryBuilder();
          builder.update.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: {}, error: null })
          });
          return builder;
        }
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'secret', error: null });

      vi.spyOn(scraperRunner, 'runTribunalScraper').mockResolvedValue({
        success: true,
        documents: [createMockDocument()],
        browser: mockBrowser,
        page: mockPage
      });

      params = createSyncParams({ supabase: mockSupabase, logger: mockLogger });
      const result = await syncTribunalForUser(params);

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('0 documents match')
      );
    });
  });

  describe('Retry Logic', () => {
    it('should increment retry count on scraper failure', async () => {
      const mockSupabase = createSupabaseMock();

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });
        } else if (callCount === 2) {
          const builder = mockSupabase._resetQueryBuilder();
          builder.select.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          });
          return builder;
        } else {
          // Capture update call
          const builder = mockSupabase._resetQueryBuilder();
          const updateSpy = vi.fn().mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: {}, error: null })
          });
          builder.update = updateSpy;
          return builder;
        }
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'secret', error: null });

      vi.spyOn(scraperRunner, 'runTribunalScraper').mockResolvedValue({
        success: false,
        documents: [],
        error: 'Login failed',
        browser: null,
        page: null
      });

      params = createSyncParams({
        supabase: mockSupabase,
        logger: mockLogger,
        retryCount: 0
      });

      await syncTribunalForUser(params);

      // Should call update with retry status
      expect(mockSupabase.from).toHaveBeenCalledWith('tribunal_credentials');
    });

    it('should reset retry count on successful sync', async () => {
      const mockSupabase = createSupabaseMock();

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });
        } else if (callCount === 2) {
          const builder = mockSupabase._resetQueryBuilder();
          builder.select.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          });
          return builder;
        } else {
          const builder = mockSupabase._resetQueryBuilder();
          builder.update.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: {}, error: null })
          });
          return builder;
        }
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'secret', error: null });

      vi.spyOn(scraperRunner, 'runTribunalScraper').mockResolvedValue({
        success: true,
        documents: [],
        browser: mockBrowser,
        page: mockPage
      });

      params = createSyncParams({
        supabase: mockSupabase,
        logger: mockLogger,
        retryCount: 2
      });

      const result = await syncTribunalForUser(params);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('tribunal_credentials');
    });
  });

  describe('Date Parsing', () => {
    it('should convert DD/MM/YYYY to YYYY-MM-DD', () => {
      const dateString = '09/02/2026';
      const parts = dateString.split('/');
      const expected = `${parts[2]}-${parts[1]}-${parts[0]}`;

      expect(expected).toBe('2026-02-09');
    });

    it('should handle invalid date format gracefully', () => {
      const invalidDate = 'invalid';
      const parts = invalidDate.split('/');

      expect(parts.length).not.toBe(3);
    });
  });

  describe('Credential Validation', () => {
    it('should require all 3 credentials (null password)', async () => {
      const mockSupabase = createSupabaseMock();

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });
        } else {
          const builder = mockSupabase._resetQueryBuilder();
          builder.select.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          });
          return builder;
        }
      });

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: 'key', error: null })
        .mockResolvedValueOnce({ data: 'cer', error: null });

      params = createSyncParams({ supabase: mockSupabase, logger: mockLogger });
      const result = await syncTribunalForUser(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Credenciales incompletas');
    });

    it('should require all 3 credentials (null keyFile)', async () => {
      const mockSupabase = createSupabaseMock();

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });
        } else {
          const builder = mockSupabase._resetQueryBuilder();
          builder.select.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          });
          return builder;
        }
      });

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 'pwd', error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: 'cer', error: null });

      params = createSyncParams({ supabase: mockSupabase, logger: mockLogger });
      const result = await syncTribunalForUser(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Credenciales incompletas');
    });

    it('should require all 3 credentials (null cerFile)', async () => {
      const mockSupabase = createSupabaseMock();

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabase._resetQueryBuilder({ data: { id: 'sync-log-123' }, error: null });
        } else {
          const builder = mockSupabase._resetQueryBuilder();
          builder.select.mockReturnValue({
            ...builder,
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          });
          return builder;
        }
      });

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 'pwd', error: null })
        .mockResolvedValueOnce({ data: 'key', error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      params = createSyncParams({ supabase: mockSupabase, logger: mockLogger });
      const result = await syncTribunalForUser(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Credenciales incompletas');
    });
  });
});
