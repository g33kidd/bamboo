import { ServerWebSocket } from 'bun'
import { engine } from '../..'
import BaseEndpoint from './BaseEndpoint'

export type MessageParameters = {
  event: string
  parameters?: any
}

/**
 * WebSocketEndpoint is the websocket equivalent to Endpoint.
 *
 * This is for a single connection.
 *
 * websocket messages can have the following formats:
 *
 * Text: If you're just sending a simple action that requires no data, you can
 *       simply state the action as text.
 *
 *       Message -> auth
 *
 * JSON: You can also send some JSON data in that includes parameters the action expects.
 *       Sending messages this way, an "action" must be specified in order to resolve
 *       the appropriate action.
 *
 *      Message -> {action: "auth", params: { token: "1234" }}
 *
 *  NOTE: ^^ this changed, it's now {event: string, data: object}
 *
 *
 * TODO: Request ID
 */

export type WebSocketEndpointData = { [key: string]: any }
export default class WebSocketEndpoint extends BaseEndpoint {
  ws: ServerWebSocket<WebSocketEndpointData>
  locked: boolean = false
  compressed: boolean = false
  parsedMessage?: MessageParameters
  message?: string | Buffer
  response?: string

  // I am using <any> here because I don't know the structure of data at the moment.
  // I'll add to it, then when I am sure of the structure I will add the type definition.
  constructor(
    ws: ServerWebSocket<WebSocketEndpointData>,
    message?: string | Buffer,
  ) {
    super(true)

    this.message = message
    this.parseMessage()
    this.ws = ws
  }

  // Returns debug information about this Endpoint.
  override debug() {
    super.debug(`[realtime] ${this.parsedMessage?.event}`)
  }

  /**
   * Locks this request from being modified again.
   */
  lock() {
    this.locked = true
  }

  /**
   * TODO: Improve this functionality. Ideally, it should allow for data to be listened to.
   */

  /**
   * Adds data to the websocket connection.
   */
  push(key: string, value: any) {
    this.ws.data = {
      ...this.ws.data,
      [key]: value,
    }
  }

  /**
   * Adds data to the websocket context, based on a conditional argument.
   */
  pushIf(cond: boolean, key: string, value: any) {
    if (cond) {
      this.push(key, value)
    }
  }

  /**
   * Adds data to the websocket context in bulk.
   */
  pushMany(data: { [key: string]: any }) {
    this.ws.data = {
      ...this.ws.data,
      ...data,
    }
  }

  /** Gets data from the websocket context. */
  get(key: string, defaultValue?: any) {
    return this.ws.data[key] || defaultValue || null
  }

  /**
   * Removes data from the websocket context.
   */
  remove(key: string) {
    if (Object.hasOwn(this.ws.data, key)) {
      const clone = this.ws.data
      delete clone[key]
      this.ws.data = clone
    }
  }

  /**
   * To keep track of a connection, you can pass in a token when connecting through a WebSocket client.
   * This token can then be used to update the list of active connections & send messages to the socket outside of actions/pipes.
   * On the web, this would look like:
   *
   *    new WebSocket("wss://{host}/ws?token={token}")
   *
   * where {token} is potentially created using createSecureToken().
   */
  getToken() {
    if (this.ws.data) {
      const data = this.ws.data as any
      if (data.token) {
        return data.token
      } else {
        return null
      }
    } else {
      return null
    }
  }

  /**
   * TODO: Create an entire token generator within the Engine that can sign/verify and invalidate tokens.
   *
   * Shuffles the websocket token that the connection originally started with.
   * Useful for invalidating the original token and using a token that the user cannot see.
   */
  // shuffleToken() {
  //   if (this.getToken()) {
  //     // Replace the token with a new token.

  //   }
  // }

  /**
   * Converts the received string message into an object.
   */
  parseMessage() {
    if (this.message) {
      try {
        const json = JSON.parse(this.message.toString())
        this.parsedMessage = {
          event: json.event,
          parameters: json.data,
        }

        this.useParams(json.data)
      } catch (e) {
        // This request is not a JSON message.
        this.parsedMessage = {
          event: this.message.toString(),
        }
      }
    }
  }

  // TODO: Move functions like this into a base class that can be used by Endpoint and WebSocketEndpoint.
  // Helper for accessing a service from the engine.
  // service<T>(name: string): T {
  //   return engine.service<T>(name)
  // }

  /**
   * Returns true if the ratelimit has exceeded, returns false otherwise.
   */
  ratelimit(
    context: string,
    limit: number = 60,
    forIP: boolean = false,
  ): boolean {
    // TODO: Confirm that this IP address isn't blacklisted or anything.
    if (forIP) {
      const ip = this.ws.remoteAddress.toString()
      const ipHash = Buffer.from(ip).toString('base64')
      return engine.ratelimit(`${context}/${ipHash}`, limit)
    } else {
      return engine.ratelimit(context, limit)
    }
  }

  /**
   * Gets a parameter from the message payload.
   * NOTE: This only works if the expected payload is JSON.
   */
  param<T>(key: string, defaultValue?: any): T | null {
    if (this.parsedMessage && this.parsedMessage?.parameters) {
      if (Object.hasOwn(this.parsedMessage.parameters, key)) {
        return this.parsedMessage.parameters[key]
      } else {
        return defaultValue || null
      }
    } else {
      return defaultValue || null
    }
  }

  /**
   * Sends a JSON response to the websocket.
   *
   * NOTE: This differs from the HTTP Endpoint because you can set a lock or not set a lock.
   * Since WS is a persistent connection, send as many or as few responses within an action as you want.
   */
  async json(data: any, lock = false) {
    const resp = JSON.stringify({
      event: this.parsedMessage?.event,
      data,
    })

    if (lock) {
      if (!this.locked) {
        this.response = resp
        this.lock()
        this.send()
      }
    } else {
      this.response = resp
      this.lock()
      this.send()
    }

    return this
  }

  /**
   * Publishes a message to a topic channel (from this connection) as a JSON event.
   */
  pub(topic: string, event: string, data: object) {
    if (this.ws.isSubscribed(topic)) {
      const response = JSON.stringify({
        event,
        data,
      })

      this.ws.publish(topic, response)
    } else {
      throw new Error(
        'Cannot publish message. Connection not subscribed to topic.',
      )
    }
  }

  /**
   * Sends the defined message to the client.
   * Or, if undefined, sends the stored response as a message.
   *
   * TODO: Refactor this. Why?
   * NOTE: I still don't remember why I need to refactor this at all.
   */
  send(data?: string | Buffer) {
    if (!data) {
      if (this.response) {
        this.ws.send(this.response, this.compressed)
        // console.log(sentBytes); TODO: Logging
      }
    } else {
      if (typeof data === 'string') {
        this.ws.send(data, this.compressed)
      } else {
        this.ws.send(data.buffer, this.compressed)
      }
    }
  }

  /**
   * Sends an operational error message as a response. Code and message are optional.
   */
  err(message?: string, code?: number) {
    return this.json({
      message: message || 'Could not perform this operation.',
      code: code || 3,
    })
  }

  // Utility functions for performing actions on the WS itself.
  subscribe = (topic: string) => this.ws.subscribe(topic)
  unsubscribe = (topic: string) => this.ws.unsubscribe(topic)
  forceClose = async (_message: string) => this.ws.terminate()
}
