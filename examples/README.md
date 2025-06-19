# Bamboo Examples

This directory contains examples demonstrating Bamboo's key features and capabilities.

## Quick Start

```bash
# Run any example
bun run examples/hello.ts
bun run examples/rest-api.ts
bun run examples/websocket-api.ts
bun run examples/telegram-example.ts
```

## Examples Overview

### 1. Hello World (`hello.ts`)
**Basic HTTP endpoint with middleware**

Demonstrates:
- Basic HTTP routing
- Middleware pipes
- JSON responses
- Request/response flow

```typescript
// Simple GET endpoint with UUID middleware
const helloWorld = action(
  'GET /',
  async (endpoint: Endpoint) => {
    const uuid = endpoint.stash('uuid')
    return endpoint.json({ hello: 'world', uuid })
  },
  [helloPipe]
)
```

**Test it:**
```bash
curl http://localhost:3000/
# Response: {"hello":"world","uuid":"..."}
```

### 2. REST API (`rest-api.ts`)
**Complete REST API with authentication and rate limiting**

Demonstrates:
- Full CRUD operations
- Authentication middleware
- Rate limiting
- Error handling
- Pagination
- Route grouping

**Features:**
- User management (CRUD)
- Post management with author relationships
- JWT-style authentication
- Rate limiting (100 req/min)
- Health checks and API info

**Test it:**
```bash
# Get users
curl http://localhost:3000/users

# Create user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'

# Protected route
curl -X POST http://localhost:3000/posts \
  -H "Authorization: Bearer valid-token" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","content":"World"}'
```

### 3. WebSocket API (`websocket-api.ts`)
**Real-time chat system with rooms**

Demonstrates:
- WebSocket connections
- Real-time messaging
- Room-based chat
- Connection state management
- Broadcasting

**Features:**
- Join/leave chat rooms
- Send messages to rooms
- User authentication
- Rate limiting for messages
- Connection health checks

**Test it:**
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/websocket')

// Join a room
ws.send(JSON.stringify({
  event: 'rooms:join',
  roomId: 'general'
}))

// Send a message
ws.send(JSON.stringify({
  event: 'rooms:message',
  content: 'Hello, world!'
}))
```

### 4. Telegram Distributed Messaging (`telegram-example.ts`)
**Multi-instance communication system**

Demonstrates:
- Distributed messaging
- Multi-service architecture
- Message broadcasting
- Service coordination

**Features:**
- Telegram server (message broker)
- Multiple client instances
- Cross-service communication
- Event-driven architecture

**Architecture:**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Web Server  │    │   Worker    │    │ Analytics   │
│   Client    │    │   Client    │    │   Client    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌─────────────┐
                    │  Telegram   │
                    │   Server    │
                    └─────────────┘
```

**Test it:**
```bash
# Trigger user action (broadcasts to all instances)
curl -X POST http://localhost:3000/user-action \
  -H "Content-Type: application/json" \
  -d '{"userId": 123, "action": "login"}'
```

## Key Concepts Demonstrated

### 1. Pipes (Middleware)
```typescript
const authPipe = pipe('auth', async (endpoint: Endpoint) => {
  const token = endpoint.header('authorization')
  if (!token) return endpoint.status(401, 'Unauthorized')
  endpoint.stash('user', { id: 1, name: 'John' })
  return endpoint
})
```

### 2. Actions (Routes)
```typescript
action('GET /users', async (endpoint: Endpoint) => {
  const users = await getUsers()
  return endpoint.json({ users })
})
```

### 3. WebSocket Events
```typescript
ws('rooms:join', async (endpoint: WebSocketEndpoint) => {
  const roomId = endpoint.param('roomId')
  // Handle room joining logic
  return endpoint.json({ event: 'room_joined', roomId })
})
```

### 4. State Management
```typescript
// Connection-level state (persists across requests)
endpoint.push('user.id', userId)

// Request-level state (scoped to single request)
endpoint.stash('request.id', requestId)
```

### 5. Distributed Messaging
```typescript
// Broadcast to all connected instances
telegramClient.broadcast({
  type: 'user_action',
  data: { userId, action },
  timestamp: Date.now()
})
```

## Development Tips

### 1. Running Examples
```bash
# Development mode with hot reload
bun --watch examples/rest-api.ts

# Production mode
bun run examples/rest-api.ts
```

### 2. Debugging
```typescript
// Add debug logging
endpoint.debug('Processing request')

// Check request details
console.log('Method:', endpoint.request.method)
console.log('Path:', endpoint.url.pathname)
console.log('Headers:', endpoint.request.headers)
```

### 3. Error Handling
```typescript
try {
  const result = await someOperation()
  return endpoint.json(result)
} catch (error) {
  console.error('Error:', error)
  return endpoint.status(500, 'Internal Server Error')
}
```

### 4. Testing
```bash
# Test HTTP endpoints
curl -X GET http://localhost:3000/health
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com"}'

# Test WebSocket
wscat -c ws://localhost:3000/websocket
```

## Next Steps

1. **Explore the codebase**: Look at the actual implementation in `src/`
2. **Build your own**: Use these examples as templates
3. **Check documentation**: See the main README for more details
4. **Join the community**: Contribute examples and improvements

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in the example
2. **Import errors**: Make sure you're running from the bamboo directory
3. **WebSocket connection failed**: Check if the server is running
4. **Telegram connection failed**: Ensure the Telegram server is started

### Getting Help

- Check the main README for framework documentation
- Look at the test files for more examples
- Open an issue if you find bugs or need help 