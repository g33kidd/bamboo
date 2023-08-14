import { ServerWebSocket } from "bun";
import { Engine } from "..";

export default class WebSocketEndpoint {
  ws: ServerWebSocket;
  engine: Engine;
  compressed: boolean = false;
  message?: string | Buffer;
  response?: string;

  constructor(engine: Engine, ws: ServerWebSocket, message?: string | Buffer) {
    this.engine = engine;
    this.ws = ws;
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
