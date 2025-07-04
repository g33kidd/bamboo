import Presence, { PresenceConfig, PresenceEntity } from '../core/realtime/presence'

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
    options?: {
      activityTimeout?: number
    }
  ) {
    const presence = new Presence(name, initialState, config, options)
    this.store.set(name, presence)
    return presence
  }

  /**
   * Removes tracking for presence.
   */
  untrack(name: string) {
    const presence = this.store.get(name)
    if (presence) {
      presence.destroy()
      this.store.delete(name)
    }
  }

  /**
   * Get a presence instance by name
   */
  get(name: string): Presence<any, any> | undefined {
    return this.store.get(name)
  }

  /**
   * Check if presence is being tracked
   */
  has(name: string): boolean {
    return this.store.has(name)
  }

  /**
   * Get all presence names
   */
  getNames(): string[] {
    return Array.from(this.store.keys())
  }

  /**
   * Get all presence instances
   */
  getAll(): Presence<any, any>[] {
    return Array.from(this.store.values())
  }

  /**
   * Add entity to a presence
   */
  addEntity<EntityType>(name: string, entity: PresenceEntity<EntityType>) {
    const presence = this.store.get(name)
    if (presence) {
      presence.addEntity(entity)
      return true
    }
    return false
  }

  /**
   * Remove entity from a presence
   */
  removeEntity(name: string, key: string) {
    const presence = this.store.get(name)
    if (presence) {
      presence.removeEntity(key)
      return true
    }
    return false
  }

  /**
   * Update entity in a presence
   */
  updateEntity<EntityType>(name: string, key: string, updates: Partial<EntityType>) {
    const presence = this.store.get(name)
    if (presence) {
      presence.updateEntity(key, updates)
      return true
    }
    return false
  }

  /**
   * Get presence data for broadcasting
   */
  getPresenceData(name: string) {
    const presence = this.store.get(name)
    return presence ? presence.getPresenceData() : null
  }

  /**
   * Get all presence data
   */
  getAllPresenceData() {
    const data: Record<string, any> = {}
    for (const [name, presence] of this.store) {
      data[name] = presence.getPresenceData()
    }
    return data
  }

  /**
   * Cleanup all presence instances
   */
  destroy() {
    for (const presence of this.store.values()) {
      presence.destroy()
    }
    this.store.clear()
  }
}
