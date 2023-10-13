import Pipe from '../core/pipe'
import WebSocketEndpoint from '../endpoint/WebSocketEndpoint'

// RealtimeAction / RealtimeRegistry

export default class WebSocketAction {
  definition: string
  handler: (endpoint: WebSocketEndpoint) => Promise<WebSocketEndpoint>
  pipes?: Pipe<WebSocketEndpoint>[]

  constructor(
    _definition: string,
    _handler: (endpoint: WebSocketEndpoint) => Promise<WebSocketEndpoint>,
    _pipes?: Pipe<WebSocketEndpoint>[],
  ) {
    this.definition = _definition
    this.handler = _handler
    this.pipes = _pipes
  }

  async handle(endpoint: WebSocketEndpoint) {
    endpoint = await this.handlePipes(endpoint)
    endpoint = await this.handler(endpoint)
    return endpoint
  }

  async handlePipes(endpoint: WebSocketEndpoint) {
    if (this.pipes && this.pipes?.length > 0) {
      const pipeLogNames = this.pipes.map((p) => p.name).join(' -> ')

      // TODO: Logging: Replace this with logging.
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${this.definition} pipe flow]:\n\n\t${pipeLogNames}\n`)
      }
      for await (let pipe of this.pipes) {
        endpoint = await pipe.handle(endpoint)
      }
    }

    return endpoint
  }
}

// Helper function for declaring websocket actions.
export function ws(
  definition: string,
  handler: (endpoint: WebSocketEndpoint) => Promise<WebSocketEndpoint>,
  pipes?: Pipe<WebSocketEndpoint>[],
) {
  return new WebSocketAction(definition, handler, pipes)
}
