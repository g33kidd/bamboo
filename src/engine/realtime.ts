import { WebSocketAction, WebSocketEndpoint, WebSocketPipe } from '../..'
import WebSocketActionRegistry from '../actions/websocketRegistry'

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
  pipes: WebSocketPipe[] = []

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
