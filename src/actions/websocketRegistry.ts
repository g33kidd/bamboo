import WebSocketAction from "./websocketAction";

export type WebSocketActionWithParams = {
  action: WebSocketAction;
  params: Map<string, any>;
};

export default class WebSocketActionRegistry {
  store: Map<string, any> = new Map();

  action(action: WebSocketAction) {}
}
