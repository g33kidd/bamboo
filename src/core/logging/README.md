# Bamboo Logging System

A flexible, adapter-based logging system for Bamboo applications.

## Quick Start

```typescript
import { engine } from 'bamboo'
import { ConsoleLogAdapter, JsonLogAdapter } from 'bamboo/core/adapters/logging'
import { LogLevel } from 'bamboo/core/logging'

// Register adapters
engine.logging.register(ConsoleLogAdapter)
engine.logging.register(JsonLogAdapter)

// Set log level
engine.logging.setLevel(LogLevel.DEBUG)

// Use logging
engine.logging.info('Server started', { port: 3000 })
engine.logging.error('Database connection failed', { error: 'Connection timeout' })
```

## Log Levels

- `DEBUG` (0) - Detailed debug information
- `INFO` (1) - General information messages
- `WARN` (2) - Warning messages
- `ERROR` (3) - Error messages
- `FATAL` (4) - Fatal errors that cause application shutdown

## Available Adapters

### ConsoleLogAdapter
Colored console output with different colors for each log level.

### JsonLogAdapter
Outputs structured JSON logs for easy parsing.

### FileLogAdapter
Writes logs to files (TODO: implement file rotation).

### SilentLogAdapter
Suppresses all log output (useful for testing).

## Creating Custom Adapters

```typescript
import { createLogAdapter, LogLevel } from 'bamboo/core/logging'

const CustomAdapter = createLogAdapter('custom', (level, message, data, timestamp) => {
  // Your custom logging logic here
  console.log(`[CUSTOM] ${message}`)
})

engine.logging.register(CustomAdapter)
```

## Migration from Old Logging

Replace:
```typescript
engine.logging.log('message', data)
```

With:
```typescript
engine.logging.info('message', data)
```

## Next Steps

1. **File Logging**: Implement file rotation and log archiving
2. **Remote Logging**: Add adapters for external logging services (Sentry, Loggly, etc.)
3. **Performance**: Add async logging for better performance
4. **Structured Logging**: Enhance data formatting and serialization 