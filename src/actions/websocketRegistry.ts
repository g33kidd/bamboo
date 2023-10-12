import { MessageParameters } from '../endpoint/WebSocketEndpoint'
import WebSocketAction from './websocketAction'

export type WebSocketActionWithParams = {
  action: WebSocketAction
  params: Map<string, any>
}

export default class WebSocketActionRegistry {
  store: Map<string, WebSocketAction> = new Map()

  action(action: WebSocketAction) {
    this.store.set(action.definition, action)
  }

  // TODO: action parameters (not just JSON from the message body).
  parse(message: MessageParameters): WebSocketAction | null {
    const action = this.store.get(message.event)
    if (action) {
      return action
    } else {
      return null
    }
  }
}
