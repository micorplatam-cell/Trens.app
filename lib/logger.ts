// ============================================================================
// LOGGER UTILITY - Sistema de logs con niveles
// En producción (__DEV__ = false) solo muestra WARN y ERROR
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enableDebugInProd?: boolean;
  prefix?: string;
}

const LOG_COLORS = {
  debug: '🔍',
  info: '📝',
  warn: '⚠️',
  error: '❌',
};

class Logger {
  private prefix: string;
  private enableDebugInProd: boolean;

  constructor(config: LoggerConfig = {}) {
    this.prefix = config.prefix || 'TRENS';
    this.enableDebugInProd = config.enableDebugInProd || false;
  }

  private shouldLog(level: LogLevel): boolean {
    // En desarrollo, siempre loguear
    if (__DEV__) return true;

    // En producción, solo warn y error (a menos que se habilite debug)
    if (this.enableDebugInProd) return true;

    return level === 'warn' || level === 'error';
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) return;

    const emoji = LOG_COLORS[level];
    const timestamp = new Date().toISOString().slice(11, 19);
    const formattedPrefix = `[${this.prefix}]`;

    switch (level) {
      case 'debug':
        console.log(`${emoji} ${timestamp} ${formattedPrefix}`, message, ...args);
        break;
      case 'info':
        console.info(`${emoji} ${timestamp} ${formattedPrefix}`, message, ...args);
        break;
      case 'warn':
        console.warn(`${emoji} ${timestamp} ${formattedPrefix}`, message, ...args);
        break;
      case 'error':
        console.error(`${emoji} ${timestamp} ${formattedPrefix}`, message, ...args);
        break;
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.formatMessage('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.formatMessage('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.formatMessage('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.formatMessage('error', message, ...args);
  }

  /**
   * Crea un logger con prefijo específico para un módulo
   */
  child(modulePrefix: string): Logger {
    return new Logger({
      prefix: `${this.prefix}:${modulePrefix}`,
      enableDebugInProd: this.enableDebugInProd,
    });
  }
}

// Logger global por defecto
export const logger = new Logger();

// Loggers especializados para módulos críticos
export const hankLogger = logger.child('HANK');
export const spotifyLogger = logger.child('SPOTIFY');
export const proLogger = logger.child('PRO');
export const authLogger = logger.child('AUTH');
export const syncLogger = logger.child('SYNC');

export default logger;
