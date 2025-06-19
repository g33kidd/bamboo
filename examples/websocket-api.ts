import { engine, ws, wsPipe } from '../'
import WebSocketEndpoint from '../src/endpoint/WebSocketEndpoint'

// ============================================================================
// WEBSOCKET PIPES
// ============================================================================

// Authentication pipe for WebSocket connections
const wsAuthPipe = wsPipe('auth', async (endpoint: WebSocketEndpoint) => {
  const token = endpoint.get('token')
  
  if (!token) {
    return endpoint.err('Authentication required')
  }
  
  // Simulate token validation
  if (token !== 'valid-token') {
    return endpoint.err('Invalid token')
  }
  
  // Store user info in connection state
  endpoint.push('user', { id: 1, name: 'John Doe' })
  return endpoint
})

// Rate limiting pipe for WebSocket messages
const wsRateLimitPipe = wsPipe('rate-limit', async (endpoint: WebSocketEndpoint) => {
  const userId = endpoint.get('user.id')
  const key = `ws_rate_limit:${userId}`
  const current = (globalThis as any)[key] || 0
  
  if (current > 50) { // 50 messages per minute
    return endpoint.err('Rate limit exceeded')
  }
  
  (globalThis as any)[key] = current + 1
  
  // Reset counter after 1 minute
  setTimeout(() => {
    (globalThis as any)[key] = 0
  }, 60000)
  
  return endpoint
})

// ============================================================================
// DATA STORE (In-memory for demo)
// ============================================================================

interface Message {
  id: string
  content: string
  userId: number
  roomId: string
  timestamp: Date
}

interface Room {
  id: string
  name: string
  participants: Set<number>
  messages: Message[]
}

const rooms = new Map<string, Room>([
  ['general', { id: 'general', name: 'General', participants: new Set(), messages: [] }],
  ['random', { id: 'random', name: 'Random', participants: new Set(), messages: [] }]
])

// ============================================================================
// WEBSOCKET ACTIONS
// ============================================================================

const wsActions = [
  // Join a chat room
  ws('rooms:join', async (endpoint: WebSocketEndpoint) => {
    const roomId = endpoint.param<string>('roomId') || ''
    const user = endpoint.get('user')
    
    if (!roomId) {
      return endpoint.err('Room ID required')
    }
    
    const room = rooms.get(roomId)
    if (!room) {
      return endpoint.err('Room not found')
    }
    
    // Add user to room
    room.participants.add(user.id)
    endpoint.push('current_room', roomId)
    
    // Send room info and recent messages
    return endpoint.json({
      event: 'room_joined',
      room: {
        id: room.id,
        name: room.name,
        participants: Array.from(room.participants).length
      },
      messages: room.messages.slice(-50) // Last 50 messages
    })
  }, [wsAuthPipe]),
  
  // Leave a chat room
  ws('rooms:leave', async (endpoint: WebSocketEndpoint) => {
    const roomId = endpoint.get('current_room')
    const user = endpoint.get('user')
    
    if (!roomId) {
      return endpoint.err('Not in a room')
    }
    
    const room = rooms.get(roomId)
    if (room) {
      room.participants.delete(user.id)
    }
    
    endpoint.remove('current_room')
    
    return endpoint.json({
      event: 'room_left',
      roomId
    })
  }, [wsAuthPipe]),
  
  // Send a message to the current room
  ws('rooms:message', async (endpoint: WebSocketEndpoint) => {
    const content = endpoint.param<string>('content') || ''
    const roomId = endpoint.get('current_room')
    const user = endpoint.get('user')
    
    if (!content) {
      return endpoint.err('Message content required')
    }
    
    if (!roomId) {
      return endpoint.err('Not in a room')
    }
    
    const room = rooms.get(roomId)
    if (!room) {
      return endpoint.err('Room not found')
    }
    
    const message: Message = {
      id: crypto.randomUUID(),
      content,
      userId: user.id,
      roomId,
      timestamp: new Date()
    }
    
    room.messages.push(message)
    
    // Keep only last 100 messages
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100)
    }
    
    // Broadcast message to all participants in the room
    engine.server?.publish(`room:${roomId}`, JSON.stringify({
      event: 'new_message',
      message: {
        id: message.id,
        content: message.content,
        userId: message.userId,
        timestamp: message.timestamp
      }
    }))
    
    return endpoint.json({
      event: 'message_sent',
      messageId: message.id
    })
  }, [wsAuthPipe, wsRateLimitPipe]),
  
  // Get list of available rooms
  ws('rooms:list', async (endpoint: WebSocketEndpoint) => {
    const roomList = Array.from(rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      participants: room.participants.size
    }))
    
    return endpoint.json({
      event: 'rooms_list',
      rooms: roomList
    })
  }, [wsAuthPipe]),
  
  // Get user's current status
  ws('user:status', async (endpoint: WebSocketEndpoint) => {
    const user = endpoint.get('user')
    const currentRoom = endpoint.get('current_room')
    
    return endpoint.json({
      event: 'user_status',
      user: {
        id: user.id,
        name: user.name,
        currentRoom
      }
    })
  }, [wsAuthPipe]),
  
  // Ping/Pong for connection health
  ws('ping', async (endpoint: WebSocketEndpoint) => {
    return endpoint.json({
      event: 'pong',
      timestamp: Date.now()
    })
  }),
  
  // Echo message (for testing)
  ws('echo', async (endpoint: WebSocketEndpoint) => {
    const message = endpoint.param('message')
    
    return endpoint.json({
      event: 'echo',
      message,
      timestamp: Date.now()
    })
  })
]

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

engine.configure({
  websocket: {
      pipes: [],
      actions: wsActions,
      async open(ws) {
          // Send welcome message
          ws.send(JSON.stringify({
              event: 'connected',
              message: 'Welcome to Bamboo WebSocket API!',
              timestamp: Date.now()
          }))
      },
  }
})

console.log('🚀 WebSocket API Server starting...')
console.log('📖 Available WebSocket events:')
console.log('  rooms:join - Join a chat room')
console.log('  rooms:leave - Leave current room')
console.log('  rooms:message - Send message to room')
console.log('  rooms:list - Get list of rooms')
console.log('  user:status - Get user status')
console.log('  ping - Health check')
console.log('  echo - Echo message (testing)')
console.log('')
console.log('🔑 Set token in WebSocket connection for authentication')
console.log('📡 Connect to ws://localhost:3000/websocket')

engine.serve() 