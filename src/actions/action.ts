import Endpoint from '../endpoint/Endpoint'
import Pipe from '../core/pipe'

/**
 * TODO: This stuff should be moved into core/actions.
 *
 * The same thing should also be done with Action. Make a reusable
 * base class.
 */

type ActionHandler = (endpoint: Endpoint) => Promise<Endpoint> | Action[]

type ActionGuard = {
  expectedParams: any
  expectedContentType: string
  expectedSearchParams: any
}

export default class Action {
  definition: string
  path: Array<string>
  method: string
  // handler: ActionHandler
  handler: (endpoint: Endpoint) => Promise<Endpoint>
  beforePipes?: (endpoint: Endpoint) => Promise<Endpoint>
  pipes?: Pipe<Endpoint>[]

  constructor(
    _definition: string,
    _handler: (endpoint: Endpoint) => Promise<Endpoint>,
    _pipes?: Pipe<Endpoint>[],
    _beforePipes?: (endpoint: Endpoint) => Promise<Endpoint>,
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
    this.beforePipes = _beforePipes
    this.pipes = _pipes
  }

  async handle(endpoint: Endpoint) {
    /**
     * There may be a case where one needs to perform an action and assign some data before the pipeline is run so
     * that's why this was created.
     */
    if (this.beforePipes) {
      endpoint = await this.beforePipes(endpoint)
    }

    endpoint = await this.handlePipes(endpoint)

    // if (!Array.isArray(this.handler)) {
    //   const result = await this.handler(endpoint)
    //   if (result instanceof Endpoint) {
    //     endpoint = result
    //   }
    // } else {

    // }

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

// TODO: Helper functions for declaring routes.
// TODO: actionGuard needs to be implemented.

export function post(
  endpoint: string,
  handler: (endpoint: Endpoint) => Promise<Endpoint>,
  pipes?: Pipe<Endpoint>[],
  beforePipes?: (endpoint: Endpoint) => Promise<Endpoint>,
  // guard?: ActionGuard = {
  //   expectedContentType: 'application/json',
  //   expectedParams: {},
  //   expectedSearchParams: {}
  // }
) {
  return new Action(`POST ${endpoint}`, handler, pipes, beforePipes)
}

export function get(
  endpoint: string,
  handler: (endpoint: Endpoint) => Promise<Endpoint>,
  pipes?: Pipe<Endpoint>[],
  beforePipes?: (endpoint: Endpoint) => Promise<Endpoint>,
  // guard?: ActionGuard = {
  //   expectedContentType: 'application/json',
  //   expectedParams: {},
  //   expectedSearchParams: {}
  // }
) {
  return new Action(`GET ${endpoint}`, handler, pipes, beforePipes)
}

export function action(
  definition: string,
  handler: (endpoint: Endpoint) => Promise<Endpoint>,
  pipes?: Pipe<Endpoint>[],
  beforePipes?: (endpoint: Endpoint) => Promise<Endpoint>,
  // guard?: ActionGuard = {
  //   expectedContentType: 'application/json',
  //   expectedParams: {},
  //   expectedSearchParams: {}
  // }
) {
  return new Action(definition, handler, pipes, beforePipes)
}

/**
 *
 * @param definition The name of the group
 * @param handler in this case, it's an array of actions.
 * @param pipes functions to run before the main handler
 * @param beforePipes functions to run before the pipes
 * @returns
 */
export function actionGroup(
  definition: string,
  handler: Action[],
  pipes?: Pipe<Endpoint>[],
  beforePipes?: (endpoint: Endpoint) => Promise<Endpoint>,
) {
  if (handler instanceof Array) {
    const actions: Action[] = handler.map((a: Action) => {
      const concatPipes = () => {
        if (pipes?.length && a.pipes?.length) {
          return [...pipes, ...a.pipes]
        } else {
          return []
        }
      }

      // removes the GET_ POST_ part of the original definition
      const ogDef = a.definition.split(' ')
      const actionDefinition = definition + ogDef[1]
      console.log(actionDefinition)
      return new Action(
        `${ogDef[0]} ${actionDefinition}`,
        a.handler,
        concatPipes(),
        a.beforePipes,
      )
    })

    return actions
  } else {
    throw new Error('Unexpected error... handler is not an array.')
  }
}
