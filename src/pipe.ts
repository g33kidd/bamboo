import Endpoint from './endpoint'

export type PipeHandler = (endpoint: Endpoint) => Promise<Endpoint>

// TODO: Combine this with WebSocketPipe so we don't need two.

export default class Pipe {
  name: string
  handler: PipeHandler

  constructor(_name: string, _handler: PipeHandler, _prereq?: Array<string>) {
    if (_name.length <= 0) {
      throw new Error('Cannot create a Pipe with no name.')
    }

    this.name = _name
    this.handler = _handler
  }

  async handle(endpoint: Endpoint) {
    return this.handler(endpoint)
  }
}

// Prereq is currently not used.
export function pipe(
  _name: string,
  _handler: PipeHandler,
  _prereq?: Array<string>,
) {
  return new Pipe(_name, _handler, _prereq)
}
