import WebSocketEndpoint from '../endpoint/WebSocketEndpoint'
import WebSocketPipe from '../websocketPipe'

export default class WebSocketAction {
  definition: string
  handler: (endpoint: WebSocketEndpoint) => Promise<WebSocketEndpoint>
  pipes?: WebSocketPipe[]

  constructor(
    _definition: string,
    _handler: (endpoint: WebSocketEndpoint) => Promise<WebSocketEndpoint>,
    _pipes?: WebSocketPipe[],
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${this.definition} pipe flow]:\n\n\t${pipeLogNames}\n`)
      }
      for (let i = 0; i < this.pipes.length; i++) {
        const pipe = this.pipes[i]
        endpoint = await pipe.handle(endpoint)
      }
    }

    return endpoint
  }
}

// Helper function for declaring websocket actions.
export function ws(
  _definition: string,
  _handler: (endpoint: WebSocketEndpoint) => Promise<WebSocketEndpoint>,
  _pipes?: WebSocketPipe[],
) {
  return new WebSocketAction(_definition, _handler, _pipes)
}
