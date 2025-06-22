// TODO: Support more adapters.
export interface LogAdapter {
  name: string
  log: LogHandler
}

export type LogHandler = (level: LogLevel, message: string, data?: any, timestamp?: Date) => void

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: Date
  adapter: string
}

export default class Logger {
  adapters: LogAdapter[] = []
  level: LogLevel = LogLevel.INFO

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level
  }

  register(adapter: LogAdapter) {
    this.adapters.push(adapter)
  }

  setLevel(level: LogLevel) {
    this.level = level
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const levelName = LogLevel[level]
    const prefix = `[${timestamp}] [${levelName}]`
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data)}`
    }
    return `${prefix} ${message}`
  }

  log(level: LogLevel, message: string, data?: any) {
    if (!this.shouldLog(level)) return

    const timestamp = new Date()
    const formattedMessage = this.formatMessage(level, message, data)

    for (const adapter of this.adapters) {
      try {
        adapter.log(level, formattedMessage, data, timestamp)
      } catch (error) {
        // Fallback to console if adapter fails
        console.error(`Logger adapter '${adapter.name}' failed:`, error)
        console.log(formattedMessage)
      }
    }
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data)
  }

  fatal(message: string, data?: any) {
    this.log(LogLevel.FATAL, message, data)
  }
}

/**
 * Allows the developer to create a log adapter.
 *
 * Example:
 *    createLogAdapter('console', (level, message, data) => console.log(message));
 *
 * It can be used to create more complex adapters or build them on the fly.
 */
export function createLogAdapter(
  name: string,
  log: (level: LogLevel, message: string, data?: any, timestamp?: Date) => void,
): LogAdapter {
  return {
    name,
    log,
  }
}
