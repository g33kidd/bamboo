import Endpoint from '../endpoint/Endpoint'
import Action from './action'
import ActionGroup from './group'

// TODO: This should be moved into core/ as well.

export type ActionWithParams = {
  action: Action | null
  params: Map<string, any>
}

export default class ActionRegistry {
  store: Map<string, any> = new Map()
  actionCache: Map<string, Action> = new Map()

  // Adds a new action to this registry.
  action(action: Action, pathOverride?: string[]) {
    const method = action.method
    const current = this.store.get(method) || new Map()
    let currentRegistryDefinition = current

    const path = pathOverride ?? action.path
    for (let i = 0; i < path.length; i++) {
      const pathPart = path[i]
      const isLastPart = i === path.length - 1

      if (!isLastPart) {
        // Look ahead and see if there's an existing entry, because the existing entry should be set to
        // __root if it's the only entry and it matches the current pathPart.
      }

      if (currentRegistryDefinition instanceof Action) {
        // console.log(pathPart);
        // We can assume that this is the new root since an action exists here.
        // const newRegistryDefinition = new Map<string, any>();
        // newRegistryDefinition.set("__root", currentRegistryDefinition);
        // currentRegistryDefinition = newRegistryDefinition;
        // if (!currentRegistryDefinition.has(pathPart)) {
        //   const item = isLastPart ? action : new Map();
        //   currentRegistryDefinition.set(pathPart, item);
        // }
        // currentRegistryDefinition = currentRegistryDefinition.get(pathPart);
      } else {
        if (!currentRegistryDefinition.has(pathPart)) {
          const item = isLastPart ? action : new Map()
          currentRegistryDefinition.set(pathPart, item)
        }
        currentRegistryDefinition = currentRegistryDefinition.get(pathPart)
      }
    }

    this.store.set(method, current) // Update the store with the new action
  }

  // Adds a new group to this registry.
  group(group: ActionGroup) {
    const useScopeRoot = group.scope.startsWith('/')
    for (let index = 0; index < group.actions.length; index++) {
      const action = group.actions[index]
      const actionPath = useScopeRoot
        ? [group.scope.slice(1), ...action.path]
        : action.path
      this.action(action, actionPath)
    }
  }

  // Parses an incoming action.
  parse(method: string, path: string[]): ActionWithParams {
    const current = this.store.get(method)

    if (current) {
      let currentRegistryDefinition: Map<string, any> | Action = current

      const params = new Map()
      let lastAction = null // Keep track of the last action found

      for (let i = 0; i < path.length; i++) {
        const pathPart = path[i]

        if (currentRegistryDefinition instanceof Map) {
          if (currentRegistryDefinition.has(pathPart)) {
            currentRegistryDefinition = currentRegistryDefinition.get(pathPart)

            // Check if the current part is an action
            if (currentRegistryDefinition instanceof Action) {
              lastAction = currentRegistryDefinition
            }
          } else {
            const catchAllWildcardMatch = Array.from(
              currentRegistryDefinition.keys(),
            ).find(
              (key) =>
                typeof key === 'string' &&
                key.startsWith('**') &&
                key.includes('.') &&
                key.includes(
                  pathPart.split('.')[pathPart.split('.').length - 1],
                ),
            ) as string

            if (catchAllWildcardMatch) {
              lastAction = currentRegistryDefinition.get(catchAllWildcardMatch)
              break
            }

            const wildcardMatch = Array.from(
              currentRegistryDefinition.keys(),
            ).find(
              (key) =>
                typeof key === 'string' &&
                key.startsWith('*') &&
                !key.startsWith('**'),
            ) as string

            if (wildcardMatch) {
              lastAction = currentRegistryDefinition.get(wildcardMatch)
              break
            }

            // Check if there's a child of currentRegistryDefinition that matches a parameter match expression
            const parameterMatch = Array.from(
              currentRegistryDefinition.keys(),
            ).find(
              (key) =>
                typeof key === 'string' &&
                (key.startsWith(':') ||
                  (key.startsWith('{') && key.endsWith('}'))),
            ) as string

            if (parameterMatch) {
              // Handle parameter
              let parameterName = parameterMatch.startsWith(':')
                ? parameterMatch.slice(1)
                : parameterMatch.slice(1, parameterMatch.length - 2)
              params.set(parameterName, pathPart)
              lastAction = currentRegistryDefinition.get(parameterMatch)
              break // Break the loop, as the path is not found in the registry
            }
          }
        } else {
          lastAction = null
        }
      }

      return {
        action: lastAction,
        params,
      }
    }

    return {
      action: null,
      params: new Map(),
    }
  }
}
