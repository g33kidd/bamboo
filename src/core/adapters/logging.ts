import { createLogAdapter, LogAdapter, LogLevel } from '../logging'

const ConsoleLogAdapter = createLogAdapter('console', (level, message, data, timestamp) => {
  const colors = {
    [LogLevel.DEBUG]: '\x1b[36m', // Cyan
    [LogLevel.INFO]: '\x1b[32m',  // Green
    [LogLevel.WARN]: '\x1b[33m',  // Yellow
    [LogLevel.ERROR]: '\x1b[31m', // Red
    [LogLevel.FATAL]: '\x1b[35m', // Magenta
  }
  
  const reset = '\x1b[0m'
  const color = colors[level] || ''
  
  if (data) {
    console.log(`${color}${message}${reset}`)
    if (typeof data === 'object') {
      console.dir(data, { depth: null, colors: true })
    } else {
      console.log(data)
    }
  } else {
    console.log(`${color}${message}${reset}`)
  }
})

const FileLogAdapter = createLogAdapter('file', (level, message, data, timestamp) => {
  // TODO: Implement file logging
  // This would write to a log file with rotation
  console.log(`[FILE] ${message}`)
})

const JsonLogAdapter = createLogAdapter('json', (level, message, data, timestamp) => {
  const logEntry = {
    timestamp: timestamp?.toISOString(),
    level: LogLevel[level],
    message,
    data,
  }
  console.log(JSON.stringify(logEntry))
})

const SilentLogAdapter = createLogAdapter('silent', () => {
  // Does nothing - useful for testing or when logging is disabled
})

export { 
  ConsoleLogAdapter, 
  FileLogAdapter, 
  JsonLogAdapter, 
  SilentLogAdapter 
}
