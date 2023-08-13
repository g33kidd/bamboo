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

  async rateLimit(ctx: string) {
    // This needs to access a key/value store in the engine.
  }

  /**
   * Gets a parameter from the message payload.
   * NOTE: This only works if the expected payload is JSON.
   */
  async param(key: string, defaultValue?: any) {
    // TODO: This
  }

  async send(data?: string | Buffer) {
    if (!data) {
      if (this.response) {
        this.ws.send(this.response, this.compressed);
      } else {
        // Don't send anything.
        return;
      }
    } else {
      this.ws.send(data, this.compressed);
    }
  }
}
