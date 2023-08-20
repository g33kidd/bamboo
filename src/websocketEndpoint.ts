import { ServerWebSocket } from "bun";
import { Engine } from "..";
import { hrtime } from "process";

export type MessageParameters = {
  action: string;
  parameters?: object;
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
 */
export default class WebSocketEndpoint {
  ws: ServerWebSocket;
  engine: Engine;
  compressed: boolean = false;
  parsedMessage?: MessageParameters;
  message?: string | Buffer;
  response?: string;
  timeStart: bigint;
  timeEnd?: bigint;

  constructor(engine: Engine, ws: ServerWebSocket, message?: string | Buffer) {
    this.timeStart = hrtime.bigint();
    this.message = message;
    this.engine = engine;
    this.ws = ws;

    this.parseMessage();
  }

  // Determines the action and parameters sent in.
  parseMessage() {
    if (this.message) {
      try {
        const json = JSON.parse(this.message.toString());
        this.parsedMessage = {
          action: json.action,
          parameters: json.params,
        };
      } catch (e) {
        // This request is not a JSON message.
        this.parsedMessage = {
          action: this.message.toString(),
        };
      }
    }
  }

  // Helper for accessing a service from the engine.
  service<T>(name: string): T {
    return this.engine.service<T>(name);
  }

  // Returns the time taken to handle the request in microseconds.
  time(): number {
    if (this.timeEnd) {
      return Number(this.timeEnd - this.timeStart) / 1000;
    } else {
      return 0;
    }
  }

  // Returns debug information about this Endpoint.
  debug() {
    const time = this.time();
    const timeDisplay =
      time < 800 ? `${Math.round(time)}µs` : `${Math.round(time / 1000)}ms`;

    console.log(
      `[WS ${this.ws.readyState}] ${this.parsedMessage?.action} in ${timeDisplay}`
    );
    // console.log(
    //   `[${this.request.method}] ${this.url.pathname} -> ${this.response?.status} in ${timeDisplay}`
    // );
  }

  /**
   * Forcefully closes a connection
   */
  forceClose = async (message: string) => this.ws.terminate();

  /**
   * Returns true if the ratelimit has exceeded, returns false otherwise.
   */
  async ratelimit(context: string): Promise<boolean> {
    return false;
  }

  /**
   * Gets a parameter from the message payload.
   * NOTE: This only works if the expected payload is JSON.
   */
  async param(key: string, defaultValue?: any) {
    // TODO: This
  }

  /**
   * Sends a JSON response to the websocket.
   */
  async json(data: any) {
    this.response = JSON.stringify(data);
    this.send();
    return this;
  }

  /**
   * Sends the defined message to the client.
   * Or, if undefined, sends the stored response as a message.
   */
  send(data?: string | Buffer) {
    if (!data) {
      if (this.response) {
        this.ws.send(this.response, this.compressed);
      }
    } else {
      this.ws.send(data, this.compressed);
    }
  }
}
