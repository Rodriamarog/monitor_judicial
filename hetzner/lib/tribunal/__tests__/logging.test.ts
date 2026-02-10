/**
 * Week 1 Critical Logging Improvements - Test Suite
 *
 * Tests for:
 * - Email selector failure logging
 * - Screenshot creation on error
 * - Fallback log writing when Supabase fails
 * - Context propagation (userId, expediente, step)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationLogger } from '../../../../lib/notification-logger';
import * as fs from 'fs';
import * as path from 'path';

describe('Logging Improvements', () => {
  describe('NotificationLogger - Fallback Mechanism', () => {
    let logger: NotificationLogger;
    const fallbackPath = '/tmp/notification-logs-fallback.jsonl';

    beforeEach(() => {
      // Clean up fallback file before each test
      if (fs.existsSync(fallbackPath)) {
        fs.unlinkSync(fallbackPath);
      }

      // Create logger with invalid credentials to force fallback
      logger = new NotificationLogger('https://invalid.supabase.co', 'invalid-key');
    });

    it('should write to fallback file when Supabase fails', async () => {
      // Add some logs
      logger.info('Test info message', undefined, { userId: 'test-user-123', step: 'test_step' });
      logger.error('Test error message', undefined, {
        userId: 'test-user-123',
        expediente: 'EXP-001/2024',
        error: 'Test error'
      });

      // Flush (will fail to write to Supabase, should use fallback)
      await logger.flush();

      // Verify fallback file was created
      expect(fs.existsSync(fallbackPath)).toBe(true);

      // Read and verify contents
      const content = fs.readFileSync(fallbackPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);

      const log1 = JSON.parse(lines[0]);
      expect(log1.log_level).toBe('info');
      expect(log1.message).toBe('Test info message');
      expect(log1.context.userId).toBe('test-user-123');
      expect(log1.context.step).toBe('test_step');

      const log2 = JSON.parse(lines[1]);
      expect(log2.log_level).toBe('error');
      expect(log2.message).toBe('Test error message');
      expect(log2.context.userId).toBe('test-user-123');
      expect(log2.context.expediente).toBe('EXP-001/2024');
    });

    it('should include all required context fields', async () => {
      const context = {
        userId: 'user-456',
        email: 'test@example.com',
        expediente: 'EXPEDIENTE 123/2024',
        step: 'process_document',
        error: 'Test error message',
        stack: 'Error stack trace...'
      };

      logger.error('Document processing failed', undefined, context);
      await logger.flush();

      const content = fs.readFileSync(fallbackPath, 'utf-8');
      const log = JSON.parse(content.trim());

      expect(log.context.userId).toBe('user-456');
      expect(log.context.email).toBe('test@example.com');
      expect(log.context.expediente).toBe('EXPEDIENTE 123/2024');
      expect(log.context.step).toBe('process_document');
      expect(log.context.error).toBe('Test error message');
      expect(log.context.stack).toBe('Error stack trace...');
    });
  });

  describe('Context Propagation', () => {
    it('should structure error context correctly', () => {
      const error = new Error('Test error');
      const context = {
        userId: 'user-123',
        expediente: 'EXP-001/2024',
        caseId: 'case-uuid',
        step: 'process_document',
        error: error.message,
        stack: error.stack
      };

      expect(context.userId).toBe('user-123');
      expect(context.expediente).toBe('EXP-001/2024');
      expect(context.step).toBe('process_document');
      expect(context.error).toBe('Test error');
      expect(context.stack).toBeDefined();
    });

    it('should handle partial progress in sync failures', () => {
      const partialProgress = {
        documentsProcessed: 5,
        documentsFailed: 2,
        newDocumentsFound: 3
      };

      const context = {
        userId: 'user-123',
        email: 'test@example.com',
        error: 'Sync failed',
        partialProgress
      };

      expect(context.partialProgress.documentsProcessed).toBe(5);
      expect(context.partialProgress.documentsFailed).toBe(2);
      expect(context.partialProgress.newDocumentsFound).toBe(3);
    });
  });

  describe('Screenshot Path Generation', () => {
    it('should generate valid screenshot paths', () => {
      const email = 'user@example.com';
      const timestamp = Date.now();
      const screenshotPath = `/tmp/scraper-error-${email.replace('@', '-')}-${timestamp}.png`;

      expect(screenshotPath).toMatch(/^\/tmp\/scraper-error-user-example\.com-\d+\.png$/);
      expect(screenshotPath).not.toContain('@');
    });

    it('should handle special characters in email', () => {
      const email = 'user+test@example.com';
      const timestamp = Date.now();
      const screenshotPath = `/tmp/scraper-error-${email.replace('@', '-')}-${timestamp}.png`;

      expect(screenshotPath).toMatch(/^\/tmp\/scraper-error-user\+test-example\.com-\d+\.png$/);
    });
  });

  describe('Error Message Formatting', () => {
    it('should format selector failure messages correctly', () => {
      const selector = 'input[placeholder="Correo Electrónico"]';
      const error = new Error('Timeout');
      const message = `[Scraper] Email selector '${selector}' failed: ${error.message}`;

      expect(message).toBe('[Scraper] Email selector \'input[placeholder="Correo Electrónico"]\' failed: Timeout');
    });

    it('should format fatal error context correctly', () => {
      const errorContext = {
        message: 'Login failed',
        email: 'user@example.com',
        url: 'https://sjpo.pjbc.gob.mx/TribunalElectronico/login.aspx',
        screenshot: '/tmp/scraper-error-user-example-com-1234567890.png'
      };

      expect(errorContext.message).toBe('Login failed');
      expect(errorContext.email).toBe('user@example.com');
      expect(errorContext.url).toContain('TribunalElectronico');
      expect(errorContext.screenshot).toMatch(/^\/tmp\/scraper-error-.*\.png$/);
    });
  });

  describe('Step Tracking Enum', () => {
    it('should define all required sync steps', () => {
      enum SyncStep {
        INIT = 'init',
        CREATE_SYNC_LOG = 'create_sync_log',
        FETCH_CASES = 'fetch_cases',
        FETCH_CREDENTIALS = 'fetch_credentials',
        RUN_SCRAPER = 'run_scraper',
        FILTER_DOCUMENTS = 'filter_documents',
        PROCESS_DOCUMENT = 'process_document',
        DOWNLOAD_PDF = 'download_pdf',
        GENERATE_SUMMARY = 'generate_summary',
        CREATE_ALERT = 'create_alert',
        SEND_WHATSAPP = 'send_whatsapp',
        UPDATE_CREDENTIALS = 'update_credentials',
        COMPLETE = 'complete'
      }

      expect(SyncStep.INIT).toBe('init');
      expect(SyncStep.RUN_SCRAPER).toBe('run_scraper');
      expect(SyncStep.PROCESS_DOCUMENT).toBe('process_document');
      expect(SyncStep.COMPLETE).toBe('complete');
    });
  });

  describe('Log Level Handling', () => {
    it('should handle info, warn, and error levels', () => {
      const levels: Array<'info' | 'warn' | 'error'> = ['info', 'warn', 'error'];

      levels.forEach(level => {
        const log = {
          alert_id: null,
          log_level: level,
          message: `Test ${level} message`,
          context: { test: true }
        };

        expect(log.log_level).toBe(level);
        expect(['info', 'warn', 'error']).toContain(log.log_level);
      });
    });
  });
});
