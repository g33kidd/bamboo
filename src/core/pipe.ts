export type PipeHandler<EndpointType> = (
  endpoint: EndpointType,
) => Promise<EndpointType>

/**
 * Pipe(s) handle the transformation of an Endpoint
 * object during the lifecycle of a request.
 *
 * A pipe can also have a set of pipes that run before it, and soforth.
 */
export default class Pipe<EndpointType> {
  name: string
  handler: PipeHandler<EndpointType>
  pipes?: Pipe<EndpointType>[]

  constructor(
    _name: string,
    _handler: PipeHandler<EndpointType>,
    _pipes?: Pipe<EndpointType>[],
  ) {
    if (_name.length <= 0) {
      throw new Error('Cannot create a Pipe with no name.')
    }

    this.name = _name
    this.handler = _handler

    if (_pipes && _pipes.length > 0) {
      this.pipes = _pipes
    }
  }

  async handle(endpoint: EndpointType) {
    if (this.pipes && this.pipes.length > 0) {
      for await (let pipe of this.pipes) {
        endpoint = await pipe.handle(endpoint)
      }
    }

    return this.handler(endpoint)
  }
}
