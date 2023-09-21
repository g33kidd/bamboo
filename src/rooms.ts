import { WebSocketEndpoint } from '..'

export type Room = {
  presence: {
    [room: string]: {
      [user: string]: object & { online_since: number }
    }
  }
}

export type RealtimeHandler = (
  endpoint: WebSocketEndpoint,
) => Promise<WebSocketEndpoint>
export type RoomConfig = {
  handlers: {
    [key: string]: RealtimeHandler
  }
}

export default class RoomService {
  rooms: Map<string, Room> = new Map()
}
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
