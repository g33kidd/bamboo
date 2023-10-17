import Presence, { PresenceConfig } from '../core/realtime/presence'

export default class PresenceEngine {
  store: Map<string, Presence<any, any>> = new Map()

  constructor() {}

  /**
   * Tracks a new type of presence
   */
  track<StateType, EntityType>(
    name: string,
    initialState: StateType,
    config: PresenceConfig<StateType, EntityType>,
  ) {
    this.store.set(name, new Presence(name, initialState, config))
  }

  /**
   * Removes tracking for presence.
   */
  untrack(name: string) {
    this.store.delete(name)
  }
}
