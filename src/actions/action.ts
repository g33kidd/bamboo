import Endpoint from '../endpoint/Endpoint'
import Pipe from '../core/pipe'

/**
 * TODO: This stuff should be moved into core/actions.
 *
 * The same thing should also be done with Action. Make a reusable
 * base class.
 */

export default class Action {
  definition: string
  path: Array<string>
  method: string
  handler: (endpoint: Endpoint) => Promise<Endpoint>
  pipes?: Pipe<Endpoint>[]

  constructor(
    _definition: string,
    _handler: (endpoint: Endpoint) => Promise<Endpoint>,
    _pipes?: Pipe<Endpoint>[],
  ) {
    this.definition = _definition

    const definition = _definition.split(' ')
    if (definition.length < 2 || definition.length > 2)
      throw new Error('Incorrect action definition format')

    this.method = definition[0]

    const pathParts = definition[1].split('/')
    pathParts.shift()

    if (pathParts.length !== 1) {
      if (pathParts[pathParts.length - 1] === '') {
        pathParts.pop()
      }
    }

    if (pathParts.length === 0) {
      /**
       * Catchall Routes (not Wildcard Routes) can be used to match a section of a route either starting with or ending with a specific value.
       *
       * endsWith:     **.php   -> /any/path/whatever.php, /////whatever.php, literally-anythiing.php
       * startsWith:   /api/**  -> /api/anypath
       */
      if (definition[1].startsWith('**') && definition[1].includes('.')) {
        // Handles catchall wildcard matching without overriding all paths the way a normal wildcard does.
        // This is useful for catching all requests ending with a specific file type.
        // TODO: Currently matches things like **.php|**.xml. Make it so it can match any start/end, so: **-test|**-test.p|test-**.
        this.path = [definition[1]]
      } else {
        throw new Error(
          `Cannot define an action without a path: ${definition.join(' ')}`,
        )
      }
    } else if (pathParts.length === 1 && pathParts[0] === '') {
      this.path = ['__root']
    } else {
      this.path = pathParts
    }

    this.handler = _handler
    this.pipes = _pipes
  }

  async handle(endpoint: Endpoint) {
    endpoint = await this.handlePipes(endpoint)
    endpoint = await this.handler(endpoint)
    return endpoint
  }

  async handlePipes(endpoint: Endpoint) {
    if (this.pipes) {
      for (let index = 0; index < this.pipes.length; index++) {
        const pipe = this.pipes[index]
        endpoint = await pipe.handle(endpoint)
      }
    }

    return endpoint
  }
}

export function action(
  definition: string,
  handler: (endpoint: Endpoint) => Promise<Endpoint>,
  pipes?: Pipe<Endpoint>[],
) {
  return new Action(definition, handler, pipes)
}
