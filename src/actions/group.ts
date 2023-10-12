import Pipe from '../pipe'
import Action from './action'

export default class ActionGroup {
  scope: string
  actions: Action[]
  pipes?: Pipe[]

  constructor(_scope: string, _actions: Action[], _pipes?: Pipe[]) {
    if (_scope.length <= 0) {
      throw new Error('Cannot create an ActionGroup without a scope.')
    }

    this.scope = _scope
    this.actions = _actions
    this.pipes = _pipes
  }
}

export function group(scope: string, actions: Action[], pipes?: Pipe[]) {
  return new ActionGroup(scope, actions, pipes)
}
