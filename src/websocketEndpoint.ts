import { ServerWebSocket } from "bun";
import { engine } from "..";
import { hrtime } from "process";

export type MessageParameters = {
  event: string;
  parameters?: any;
};

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
export default class WebSocketEndpoint {
  ws: ServerWebSocket;
  compressed: boolean = false;
  parsedMessage?: MessageParameters;
  message?: string | Buffer;
  response?: string;
  timeStart: bigint;
  timeEnd?: bigint;

  constructor(ws: ServerWebSocket, message?: string | Buffer) {
    this.timeStart = hrtime.bigint();
    this.message = message;
    this.parseMessage();
    this.ws = ws;
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
      const data = this.ws.data as any;
      if (data.token) {
        return data.token;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  /**
   * Converts the received string message into an object.
   */
  parseMessage() {
    if (this.message) {
      try {
        const json = JSON.parse(this.message.toString());
        this.parsedMessage = {
          event: json.event,
          parameters: json.data,
        };
      } catch (e) {
        // This request is not a JSON message.
        this.parsedMessage = {
          event: this.message.toString(),
        };
      }
    }
  }

  // TODO: Move functions like this into a base class that can be used by Endpoint and WebSocketEndpoint.
  // Helper for accessing a service from the engine.
  service<T>(name: string): T {
    return engine.service<T>(name);
  }

  // TODO: Move functions like this into a base class that can be used by Endpoint and WebSocketEndpoint.
  // Returns the time taken to handle the request in microseconds.
  time(): number {
    if (this.timeEnd) {
      return Number(this.timeEnd - this.timeStart) / 1000;
    } else {
      return 0;
    }
  }

  // TODO: Move functions like this into a base class that can be used by Endpoint and WebSocketEndpoint.
  // Returns debug information about this Endpoint.
  debug() {
    const time = this.time();
    const timeDisplay =
      time < 800 ? `${Math.round(time)}µs` : `${Math.round(time / 1000)}ms`;

    console.log(
      `[WS ${this.ws.readyState}] ${this.parsedMessage?.event} in ${timeDisplay}`
    );
  }

  /**
   * Returns true if the ratelimit has exceeded, returns false otherwise.
   */
  ratelimit(context: string, limit: number = 60): boolean {
    const ip = this.ws.remoteAddress.toString();
    const ipHash = Buffer.from(ip).toString("base64");
    context += `/${ipHash}`;
    return engine.ratelimit(context, limit);
  }

  /**
   * Gets a parameter from the message payload.
   * NOTE: This only works if the expected payload is JSON.
   */
  param(key: string, defaultValue?: any) {
    if (this.parsedMessage && this.parsedMessage?.parameters) {
      if (Object.hasOwn(this.parsedMessage.parameters, key)) {
        return this.parsedMessage.parameters[key];
      } else {
        return defaultValue || null;
      }
    } else {
      return defaultValue || null;
    }
  }

  /**
   * Sends a JSON response to the websocket.
   */
  async json(data: any) {
    this.response = JSON.stringify({ event: this.parsedMessage?.event, data });
    this.send();
    return this;
  }

  /**
   * Sends the defined message to the client.
   * Or, if undefined, sends the stored response as a message.
   *
   * TODO: Refactor this.
   */
  send(data?: string | Buffer) {
    if (!data) {
      if (this.response) {
        const sentBytes = this.ws.send(this.response, this.compressed);
        console.log(sentBytes);
      }
    } else {
      const sentBytes = this.ws.send(data, this.compressed);
      console.log(sentBytes);
    }
  }

  // Utility functions for performing actions on the WS itself.
  subscribe = (topic: string) => this.ws.subscribe(topic);
  unsubscribe = (topic: string) => this.ws.unsubscribe(topic);
  forceClose = async (_message: string) => this.ws.terminate();
}
