/**
 * Error Tracker - система отслеживания ошибок в session storage
 */

export interface TrackedError {
  id: string;
  timestamp: string;
  type: 'polling' | 'send_message' | 'network' | 'timeout' | 'session' | 'unknown' | 'dom_capture';
  error: string;
  context?: {
    chatId?: string;
    visitorId?: string;
    url?: string;
    statusCode?: number;
    retryAttempt?: number;
    [key: string]: any;
  };
  resolved?: boolean;
}

const STORAGE_KEY = 'chat_widget_errors';
const MAX_ERRORS = 100; // Максимум ошибок в хранилище
const ERROR_RETENTION_TIME = 24 * 60 * 60 * 1000; // 24 часа

class ErrorTracker {
  private errors: TrackedError[] = [];

  constructor() {
    this.loadErrors();
    this.cleanOldErrors();
  }

  /**
   * Загружает ошибки из session storage
   */
  private loadErrors(): void {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.errors = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load error history:', error);
      this.errors = [];
    }
  }

  /**
   * Сохраняет ошибки в session storage
   */
  private saveErrors(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.errors));
    } catch (error) {
      console.error('Failed to save error history:', error);
    }
  }

  /**
   * Очищает старые ошибки
   */
  private cleanOldErrors(): void {
    const now = Date.now();
    const before = this.errors.length;
    
    this.errors = this.errors.filter(error => {
      const errorTime = new Date(error.timestamp).getTime();
      return (now - errorTime) < ERROR_RETENTION_TIME;
    });

    // Ограничиваем количество
    if (this.errors.length > MAX_ERRORS) {
      this.errors = this.errors.slice(-MAX_ERRORS);
    }

    if (before !== this.errors.length) {
      this.saveErrors();
    }
  }

  /**
   * Отслеживает новую ошибку
   */
  track(
    type: TrackedError['type'],
    error: Error | string,
    context?: TrackedError['context']
  ): string {
    const errorMessage = error instanceof Error ? error.message : error;
    
    const trackedError: TrackedError = {
      id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      type,
      error: errorMessage,
      context,
      resolved: false
    };

    this.errors.push(trackedError);
    
    // Ограничиваем размер
    if (this.errors.length > MAX_ERRORS) {
      this.errors = this.errors.slice(-MAX_ERRORS);
    }

    this.saveErrors();
    
    // Логируем в консоль с подробностями
    console.error(`[ErrorTracker] ${type}:`, {
      error: errorMessage,
      context,
      id: trackedError.id
    });

    return trackedError.id;
  }

  /**
   * Помечает ошибку как разрешенную
   */
  resolve(errorId: string): void {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      this.saveErrors();
      console.log(`[ErrorTracker] Error resolved: ${errorId}`);
    }
  }

  /**
   * Получает все ошибки
   */
  getAll(): TrackedError[] {
    return [...this.errors];
  }

  /**
   * Получает ошибки по типу
   */
  getByType(type: TrackedError['type']): TrackedError[] {
    return this.errors.filter(e => e.type === type);
  }

  /**
   * Получает неразрешенные ошибки
   */
  getUnresolved(): TrackedError[] {
    return this.errors.filter(e => !e.resolved);
  }

  /**
   * Получает последние N ошибок
   */
  getRecent(count: number = 10): TrackedError[] {
    return this.errors.slice(-count).reverse();
  }

  /**
   * Получает статистику ошибок
   */
  getStats(): {
    total: number;
    unresolved: number;
    byType: Record<string, number>;
    last24h: number;
  } {
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);

    const byType: Record<string, number> = {};
    let last24h = 0;

    this.errors.forEach(error => {
      // Count by type
      byType[error.type] = (byType[error.type] || 0) + 1;
      
      // Count last 24h
      const errorTime = new Date(error.timestamp).getTime();
      if (errorTime > dayAgo) {
        last24h++;
      }
    });

    return {
      total: this.errors.length,
      unresolved: this.getUnresolved().length,
      byType,
      last24h
    };
  }

  /**
   * Очищает все ошибки
   */
  clear(): void {
    this.errors = [];
    this.saveErrors();
    console.log('[ErrorTracker] All errors cleared');
  }

  /**
   * Очищает разрешенные ошибки
   */
  clearResolved(): void {
    const before = this.errors.length;
    this.errors = this.errors.filter(e => !e.resolved);
    if (before !== this.errors.length) {
      this.saveErrors();
      console.log(`[ErrorTracker] Cleared ${before - this.errors.length} resolved errors`);
    }
  }

  /**
   * Экспортирует ошибки для отладки
   */
  export(): string {
    return JSON.stringify({
      exported_at: new Date().toISOString(),
      stats: this.getStats(),
      errors: this.errors
    }, null, 2);
  }

  /**
   * Выводит красивый лог ошибок в консоль
   */
  printReport(): void {
    const stats = this.getStats();
    const recent = this.getRecent(5);

    console.group('📊 Error Tracker Report');
    console.log('Total errors:', stats.total);
    console.log('Unresolved:', stats.unresolved);
    console.log('Last 24h:', stats.last24h);
    console.log('By type:', stats.byType);
    
    if (recent.length > 0) {
      console.group('🔴 Recent errors (last 5):');
      recent.forEach(error => {
        console.log(`[${error.type}] ${error.timestamp}:`, error.error, error.context);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

// Глобальный доступ для удобства отладки
if (typeof window !== 'undefined') {
  (window as any).chatErrorTracker = errorTracker;
}

