/**
 * Notification Logger
 *
 * Logs notification events to the database for debugging and audit trail.
 * Bypasses Vercel's 1-hour log retention limitation.
 */

import { createClient } from '@supabase/supabase-js';

export type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

export class NotificationLogger {
  private supabaseUrl: string;
  private supabaseKey: string;
  private batchLogs: Array<{
    alert_id: string | null;
    log_level: LogLevel;
    message: string;
    context: LogContext | null;
  }> = [];

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
  }

  /**
   * Log an info message
   */
  info(message: string, alertId?: string, context?: LogContext) {
    this.log('info', message, alertId, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, alertId?: string, context?: LogContext) {
    this.log('warn', message, alertId, context);
  }

  /**
   * Log an error message
   */
  error(message: string, alertId?: string, context?: LogContext) {
    this.log('error', message, alertId, context);
  }

  /**
   * Add log to batch (for performance)
   */
  private log(level: LogLevel, message: string, alertId?: string, context?: LogContext) {
    // Also log to console for immediate visibility
    const consoleMsg = `[${level.toUpperCase()}]${alertId ? ` [Alert: ${alertId}]` : ''} ${message}`;

    if (level === 'error') {
      console.error(consoleMsg, context || '');
    } else if (level === 'warn') {
      console.warn(consoleMsg, context || '');
    } else {
      console.log(consoleMsg, context || '');
    }

    // Validate UUID format (basic check)
    const isValidUUID = alertId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(alertId) : false;

    // Add to batch
    this.batchLogs.push({
      alert_id: isValidUUID ? alertId : null,
      log_level: level,
      message,
      context: context || null,
    });
  }

  /**
   * Flush all batched logs to database
   */
  async flush(): Promise<void> {
    if (this.batchLogs.length === 0) {
      return;
    }

    const supabase = createClient(this.supabaseUrl, this.supabaseKey);

    try {
      const { error } = await supabase
        .from('notification_logs')
        .insert(this.batchLogs);

      if (error) {
        console.error('Failed to write notification logs to database:', error);
      } else {
        console.log(`✓ Flushed ${this.batchLogs.length} notification logs to database`);
      }
    } catch (err) {
      console.error('Error flushing notification logs:', err);
    } finally {
      // Clear batch regardless of success/failure
      this.batchLogs = [];
    }
  }

  /**
   * Log and flush immediately (for critical errors)
   */
  async logAndFlush(level: LogLevel, message: string, alertId?: string, context?: LogContext): Promise<void> {
    this.log(level, message, alertId, context);
    await this.flush();
  }
}

/**
 * Helper function to create a logger instance
 */
export function createNotificationLogger(supabaseUrl: string, supabaseKey: string): NotificationLogger {
  return new NotificationLogger(supabaseUrl, supabaseKey);
}
