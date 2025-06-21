import { ServerWebSocket } from 'bun'
import { engine } from '../..'
import BaseEndpoint from './BaseEndpoint'
import Bamboo from '../bamboo'
import { sign, verify } from '../core/encryption'

// sent events through using WebSocketEndpoint.pub or sendEvent
export type EventContainer = {
  event: string
  data: Object
  persist: boolean
  expiresAt?: string
}

/**
 * used to create response schema, and for types!
 */
function createEventContainer(
  event: string,
  data: Object,
  persist: boolean = false,
  expiresAt?: string,
): EventContainer {
  return {
    event,
    data,
    persist,
    expiresAt: expiresAt ?? '',
  }
}

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
   * Checks if the client is still connected.
   */
  isAvailable() {
    return this.ws.readyState === 1
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
  get<T = any>(key: string, defaultValue?: any) {
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
   * 
   * @param useSignedToken - If true, creates a signed token that can be verified later
   * @returns The new token, or null if shuffling failed
   */
  async shuffleToken(useSignedToken: boolean = false): Promise<string | null> {
    const currentToken = this.getToken()
    if (!currentToken) {
      return null
    }

    try {
      // Generate a new secure token
      const newToken = Bamboo.randomValue('base64')

      // Store the new token in the WebSocket data
      this.push('token', newToken)

      // Store the original token for reference (useful for cleanup)
      this.push('originalToken', currentToken)

      // If using signed tokens, create a signed version
      if (useSignedToken) {
        const signedToken = await sign('websocket:token', newToken)
        this.push('signedToken', signedToken)
        return signedToken
      }

      return newToken
    } catch (error) {
      engine.logging.error('Failed to shuffle WebSocket token', { error })
      return null
    }
  }

  /**
   * Verifies if the current token is valid (if using signed tokens)
   * @param expectedContext - The expected context for the token
   * @returns True if token is valid, false otherwise
   */
  async verifyToken(expectedContext: string = 'websocket:token'): Promise<boolean> {
    const signedToken = this.get('signedToken')
    if (!signedToken) {
      // If no signed token, just check if we have any token
      return !!this.getToken()
    }

    try {
      const result = await verify(expectedContext, signedToken)
      return result ? result.valid : false
    } catch (error) {
      engine.logging.error('Failed to verify WebSocket token', { error })
      return false
    }
  }

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
  async ratelimit(
    context: string,
    limit: number = 60,
    forIP: boolean = false,
  ): Promise<boolean> {
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
   * Gets rate limit information for the current context
   * 
   * @param context The rate limit context
   * @param forIP Whether to include IP in the context
   * @returns Rate limit information including remaining requests and reset time
   */
  async getRateLimitInfo(context: string, forIP: boolean = false) {
    if (forIP) {
      const ip = this.ws.remoteAddress.toString()
      const ipHash = Buffer.from(ip).toString('base64')
      return engine.getRateLimitInfo(`${context}/${ipHash}`)
    } else {
      return engine.getRateLimitInfo(context)
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
   * NOTE: still don't remember why, but keep checking back :)
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
        // NOTE: send as buffer because a string data type will be sent as a buffer anyways.
        this.ws.send(data.buffer, this.compressed)
      }
    }
  }

  /**
   * Sends an event kind of like `pub` would, but sends it to the client
   * directly.
   *
   * TODO: Create a general 'lobby' for the client so we don't have a bunch
   * of random websocket channels laying around.
   */
  sendEvent(event: string, data: object) {
    try {
      if (this.isAvailable()) {
        const response = JSON.stringify({
          event,
          data,
        })

        this.ws.send(response)
      } else {
        throw new Error('Cannot publish event. Client not connected!')
      }
    } catch (error) {
      //
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
