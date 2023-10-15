import Pipe from '../core/pipe'
import Endpoint from '../endpoint/Endpoint'
import Action from './action'

// TODO: This should also be moved into core/

export default class ActionGroup {
  scope: string
  actions: Action[]
  pipes?: Pipe<Endpoint>[]

  constructor(_scope: string, _actions: Action[], _pipes?: Pipe<Endpoint>[]) {
    if (_scope.length <= 0) {
      throw new Error('Cannot create an ActionGroup without a scope.')
    }

    this.scope = _scope
    this.actions = _actions
    this.pipes = _pipes
  }
}

export function group(
  scope: string,
  actions: Action[],
  pipes?: Pipe<Endpoint>[],
) {
  return new ActionGroup(scope, actions, pipes)
}
