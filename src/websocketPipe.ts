import WebSocketEndpoint from "./websocketEndpoint";

export type PipeOptions = {};

export type WebSocketPipeHandler = (
  endpoint: WebSocketEndpoint
) => Promise<WebSocketEndpoint>;

// TODO: Remove the need for duplication here..
export default class WebSocketPipe {
  name: string;
  handler: WebSocketPipeHandler;

  constructor(
    _name: string,
    _handler: WebSocketPipeHandler,
    _prereq?: Array<string>
  ) {
    if (_name.length <= 0) {
      throw new Error("Cannot create a Pipe with no name.");
    }

    this.name = _name;
    this.handler = _handler;
  }

  async handle(endpoint: WebSocketEndpoint) {
    return this.handler(endpoint);
  }
}

// Prereq is currently unused.
export function wsPipe(
  _name: string,
  _handler: WebSocketPipeHandler,
  _prereq?: Array<string>
) {
  return new WebSocketPipe(_name, _handler, _prereq);
}
