import WebSocketEndpoint from './endpoint/WebSocketEndpoint'

export type PipeOptions = {}

export type WebSocketPipeHandler = (
  endpoint: WebSocketEndpoint,
) => Promise<WebSocketEndpoint>

export default class WebSocketPipe {
  name: string
  handler: WebSocketPipeHandler

  constructor(
    name: string,
    handler: WebSocketPipeHandler,
    prereq?: Array<string>,
  ) {
    if (name.length <= 0) {
      throw new Error('Cannot create a Pipe with no name.')
    }

    this.name = name
    this.handler = handler
  }

  async handle(endpoint: WebSocketEndpoint) {
    return this.handler(endpoint)
  }
}

/**
 * Creates a new WebSocket pipe.
 */
export function wsPipe(
  name: string,
  handler: WebSocketPipeHandler,
  prereq?: Array<string>,
) {
  return new WebSocketPipe(name, handler, prereq)
}
