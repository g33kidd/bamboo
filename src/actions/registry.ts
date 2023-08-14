import Endpoint from "../endpoint";
import Action from "./action";
import ActionGroup from "./group";

export type ActionWithParams = {
  action: Action | null;
  params: Map<string, any>;
};

export default class ActionRegistry {
  store: Map<string, any> = new Map();
  // actionCache: Map<string, Action> = new Map();

  // Adds a new action to this registry.
  action(action: Action, pathOverride?: string[]) {
    const method = action.method;
    const current = this.store.get(method) || new Map();
    let currentRegistryDefinition = current;

    const path = pathOverride ?? action.path;
    for (let i = 0; i < path.length; i++) {
      const pathPart = path[i];
      const isLastPart = i === path.length - 1;

      if (!currentRegistryDefinition.has(pathPart)) {
        const item = isLastPart ? action : new Map();
        currentRegistryDefinition.set(pathPart, item);
      }

      currentRegistryDefinition = currentRegistryDefinition.get(pathPart);
    }

    this.store.set(method, current); // Update the store with the new action
  }

  // Adds a new group to this registry.
  group(group: ActionGroup) {
    const useScopeRoot = group.scope.startsWith("/");
    for (let index = 0; index < group.actions.length; index++) {
      const action = group.actions[index];
      const actionPath = useScopeRoot
        ? [group.scope.slice(1), ...action.path]
        : action.path;
      this.action(action, actionPath);
    }
  }

  // Parses an incoming action.
  parse(method: string, path: string[]): ActionWithParams {
    // TODO: Cached actions
    // const cacheKey = `${method}:${path.join("/")}`;
    // const cachedAction = this.actionCache.get(cacheKey);

    // if (cachedAction) {
    //   return {

    //   }
    // }

    const current = this.store.get(method);

    if (current) {
      let currentRegistryDefinition: Map<string, any> | Action = current;

      const params = new Map();
      let lastAction = null; // Keep track of the last action found

      for (let i = 0; i < path.length; i++) {
        const pathPart = path[i];

        if (currentRegistryDefinition instanceof Map) {
          if (currentRegistryDefinition.has(pathPart)) {
            currentRegistryDefinition = currentRegistryDefinition.get(pathPart);

            // Check if the current part is an action
            if (currentRegistryDefinition instanceof Action) {
              lastAction = currentRegistryDefinition;
            }
          } else {
            const wildcardMatch = Array.from(
              currentRegistryDefinition.keys()
            ).find(
              (key) => typeof key === "string" && key.startsWith("*")
            ) as string;

            if (wildcardMatch) {
              lastAction = currentRegistryDefinition.get(wildcardMatch);
              break;
            }

            // Check if there's a child of currentRegistryDefinition that matches a parameter match expression
            const parameterMatch = Array.from(
              currentRegistryDefinition.keys()
            ).find(
              (key) =>
                typeof key === "string" &&
                (key.startsWith(":") ||
                  (key.startsWith("{") && key.endsWith("}")))
            ) as string;

            if (parameterMatch) {
              // Handle parameter
              let parameterName = parameterMatch.startsWith(":")
                ? parameterMatch.slice(1)
                : parameterMatch.slice(1, parameterMatch.length - 2);
              params.set(parameterName, pathPart);
              lastAction = currentRegistryDefinition.get(parameterMatch);
              break; // Break the loop, as the path is not found in the registry
            }
          }
        } else {
          lastAction = null;
        }
      }

      return {
        action: lastAction,
        params,
      };
    }

    return {
      action: null,
      params: new Map(),
    };
  }
}
