/**
 * Mock builders for external dependencies
 */

import { vi } from 'vitest';

/**
 * Creates a mock Supabase client with chainable methods
 * This creates a proper chainable API that tracks all method calls
 */
export function createMockSupabase() {
  // Create a chainable mock object
  const mock: any = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    neq: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    rpc: vi.fn()
  };

  // Make chainable methods return the mock itself
  mock.from.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  mock.insert.mockReturnValue(mock);
  mock.update.mockReturnValue(mock);
  mock.upsert.mockReturnValue(mock);
  mock.delete.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);
  mock.in.mockReturnValue(mock);
  mock.neq.mockReturnValue(mock);

  // Terminal methods return promises (these can be overridden by tests)
  mock.single.mockResolvedValue({ data: {}, error: null });
  mock.maybeSingle.mockResolvedValue({ data: null, error: null });
  mock.rpc.mockResolvedValue({ data: 'mock-secret', error: null });

  // Add storage separately
  mock.storage = {
    from: vi.fn().mockReturnThis(),
    upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
    download: vi.fn().mockResolvedValue({
      data: new Blob(['mock pdf content'], { type: 'application/pdf' }),
      error: null
    }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/mock.pdf' }
    })
  };

  return mock;
}

/**
 * Creates a mock Puppeteer page object
 */
export function createMockPage() {
  const mockPage: any = {
    goto: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn(),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    waitForNavigation: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    type: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('https://sjpo.pjbc.gob.mx/'),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('mock screenshot')),
    cookies: vi.fn().mockResolvedValue([
      { name: 'ASP.NET_SessionId', value: 'mock-session-id' }
    ]),
    close: vi.fn().mockResolvedValue(undefined),
    setRequestInterception: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    setUserAgent: vi.fn().mockResolvedValue(undefined),
    setViewport: vi.fn().mockResolvedValue(undefined),
    $: vi.fn(),
    $$: vi.fn().mockResolvedValue([]),
    $eval: vi.fn(),
    waitForTimeout: vi.fn().mockResolvedValue(undefined)
  };

  return mockPage;
}

/**
 * Creates a mock Puppeteer browser object
 */
export function createMockBrowser() {
  const mockBrowser: any = {
    newPage: vi.fn().mockResolvedValue(createMockPage()),
    close: vi.fn().mockResolvedValue(undefined),
    pages: vi.fn().mockResolvedValue([]),
    version: vi.fn().mockReturnValue('Chrome/120.0.0.0')
  };

  return mockBrowser;
}

/**
 * Creates a mock logger with all methods
 */
export function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    addContext: vi.fn()
  };
}

/**
 * Creates a mock Gemini model
 */
export function createMockGeminiModel() {
  return {
    generateContent: vi.fn().mockResolvedValue({
      response: {
        text: vi.fn().mockReturnValue('Mock AI summary of the document')
      }
    })
  };
}

/**
 * Creates a mock Twilio client
 */
export function createMockTwilioClient() {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        sid: 'SM-mock-message-sid',
        status: 'queued',
        to: 'whatsapp:+526641234567'
      })
    }
  };
}

/**
 * Creates a mock fetch response
 */
export function createMockFetchResponse(data: any, options?: {
  status?: number;
  headers?: Record<string, string>;
}) {
  return {
    ok: (options?.status || 200) >= 200 && (options?.status || 200) < 300,
    status: options?.status || 200,
    statusText: options?.status === 404 ? 'Not Found' : 'OK',
    headers: new Headers(options?.headers || {}),
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    arrayBuffer: vi.fn().mockResolvedValue(
      typeof data === 'string' ? new TextEncoder().encode(data).buffer : data
    ),
    blob: vi.fn().mockResolvedValue(new Blob([data]))
  };
}

/**
 * Mock PDF buffer with valid PDF header
 */
export function createMockPDFBuffer(size: number = 5000): Buffer {
  const header = Buffer.from('%PDF-1.4\n');
  const content = Buffer.alloc(size - header.length, 'x');
  return Buffer.concat([header, content]);
}

/**
 * Mock invalid PDF buffer (too small or wrong format)
 */
export function createInvalidPDFBuffer(): Buffer {
  return Buffer.from('Not a PDF');
}
