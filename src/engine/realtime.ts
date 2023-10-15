import WebSocketAction from '../actions/websocketAction'
import WebSocketActionRegistry from '../actions/websocketRegistry'
import Pipe from '../core/pipe'
import WebSocketEndpoint from '../endpoint/WebSocketEndpoint'

// === from the previous rooms.ts
// import { WebSocketEndpoint } from '..'

// export type Room = {
//   presence: {
//     [room: string]: {
//       [user: string]: object & { online_since: number }
//     }
//   }
// }

// export type RealtimeHandler = (
//   endpoint: WebSocketEndpoint,
// ) => Promise<WebSocketEndpoint>
// export type RoomConfig = {
//   handlers: {
//     [key: string]: RealtimeHandler
//   }
// }

// export default class RoomService {
//   rooms: Map<string, Room> = new Map()
// }
// const presence = {
//   "room:1": {
//     users: {
//       username: { online: true, idle: false },
//     },
//   },
// };

// function createRoom(name: string, opts: RoomConfig, pipes?: WebSocketPipe[]) {
//   if (engine.websocketHandlers.has('rooms:join')) {
//     engine.websocket.handlers.create('rooms:join', async (endpoint) => {
//       const room = endpoint.param('room')
//       if (room) {

//       }
//     })

//     engine.websocket.handlers.create('rooms:leave', async (endpoint) => {
//       const room = endpoint.param('room')
//       if (room) {

//       }
//     })
//   }
// }

// function createRoom(name: string, opts: RoomConfig, pipes?: WebSocketPipe[]) {
//   if (!engine.websocketRegistry?.store.has('rooms:join')) {
//     const action = ws('rooms:join', async (endpoint) => {
//       const roomName = endpoint.param('room', null)
//       if (roomName) {

//       }

//       return endpoint
//     })

//     engine.websocketRegistry?.action(ws('rooms:join'))
//   }
// }

// === from the previous rooms.ts

type RoomHandler = (endpoint: WebSocketEndpoint) => Promise<WebSocketEndpoint>

type RoomOptions = {
  handle: {
    join: RoomHandler
    leave: RoomHandler
  }

  events: {
    [key: string]: RoomHandler
  }
}

interface Room {
  presence: {
    [key: string]: any
  }
}

/**
 * Handles data storage for realtime communication features. This includes storing the available
 * actions for /ws and pipes. This also contains functionality for a pubsub-like rooms feature.
 */
export default class RealtimeEngine {
  // config: RealtimeEngineConfig

  // rcp-like actions for the engine.
  actions: WebSocketActionRegistry = new WebSocketActionRegistry()

  // Pipes that run before EVERY action.
  pipes: Pipe<WebSocketEndpoint>[] = []

  // Stores connected clients based on their token value used when connecting to the /ws endpoint.
  clients: Map<string, any> = new Map()

  // Realtime pubsub topics that have their own set of actions.
  rooms: Map<string, Room> = new Map()

  // Constructor
  constructor() {}

  /**
   * Creates a new room.
   */
  createRoom<T>(definition: string, opts: RoomOptions) {
    this.maybeCreateRoomHandlers()

    if (!this.rooms.has(definition)) {
      const room: Room = {
        presence: {},
      }

      this.rooms.set(definition, room)
    }
  }

  /**
   * Create the room websocket handlers if they don't exist yet. We only want them if the rooms functionality is used.
   */
  maybeCreateRoomHandlers() {
    if (!this.actions.store.has('rooms:join')) {
      const action = new WebSocketAction('rooms:join', this.handleRoomJoin, [])
      this.actions.action(action)
    }

    if (!this.actions.store.has('rooms:leave')) {
      const action = new WebSocketAction(
        'rooms:leave',
        this.handleRoomLeave,
        [],
      )
      this.actions.action(action)
    }
  }

  /**
   * Handles a client joining a room.
   */
  async handleRoomJoin(endpoint: WebSocketEndpoint) {
    const roomName = endpoint.param<string>('room')
    if (!roomName) return endpoint

    endpoint.ws.subscribe(roomName)

    return endpoint
  }

  /**
   * Handles a client leaving the room.
   */
  async handleRoomLeave(endpoint: WebSocketEndpoint) {
    const roomName = endpoint.param<string>('room')
    if (!roomName) return endpoint

    if (endpoint.ws.isSubscribed(roomName)) {
      endpoint.ws.unsubscribe(roomName)
    }

    return endpoint
  }
}
