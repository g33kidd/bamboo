/**
 * Enhanced Presence System
 *
 * Presence needs to handle the following:
 * - Connect/disconnect of a client
 * - Handle sending/receiving pings from clients
 * - Track entity states and activity
 * - Manage presence across multiple instances
 * - Provide real-time updates to all connected clients
 */

import { EventEmitter } from 'stream'

export interface PresenceEntity<EntityType> {
  key: string
  state: EntityType
  lastSeen?: number
  metadata?: Record<string, any>
}

export interface PresenceConfig<StateType, EntityType> {
  open(state: StateType, entity: PresenceEntity<EntityType>): void
  close(state: StateType, entity: PresenceEntity<EntityType>): void
  onUpdate?(previousState: StateType, newState: StateType): void
  onEntityJoin?(entity: PresenceEntity<EntityType>): void
  onEntityLeave?(entity: PresenceEntity<EntityType>): void
  onEntityUpdate?(entity: PresenceEntity<EntityType>): void
}

export interface PresenceState<StateType, EntityType> {
  entities: Map<string, PresenceEntity<EntityType>>
  globalState: StateType
  lastUpdated: number
  metadata?: Record<string, any>
}

// export interface Presence {
//   constructor<StateType, EntityType>(
//     key: string,
//     state: StateType,
//     config: PresenceConfig<StateType, EntityType>,
//   ): Presence
// }

export default class Presence<StateType, EntityType> {
  /**
   * Key used to identify this presence instance
   */
  key: string

  /**
   * Presence state storage
   */
  state: PresenceState<StateType, EntityType>

  /**
   * Buffer for storing individual updates to the state
   */
  setStateBuffer: StateType[]

  /**
   * Configuration for this Presence instance
   */
  config: PresenceConfig<StateType, EntityType>

  /**
   * Internal event emitter for Presence
   */
  emitter: EventEmitter = new EventEmitter()

  /**
   * Activity timeout for entities (in milliseconds)
   */
  activityTimeout: number = 30000 // 30 seconds

  /**
   * Activity check interval
   */
  private activityInterval?: ReturnType<typeof setInterval>

  /**
   * Construct a new instance of Presence
   */
  constructor(
    key: string,
    initialState: StateType,
    config: PresenceConfig<StateType, EntityType>,
    options?: {
      activityTimeout?: number
    }
  ) {
    this.key = key
    this.state = {
      entities: new Map(),
      globalState: initialState,
      lastUpdated: Date.now(),
      metadata: {}
    }
    this.config = config
    this.setStateBuffer = []
    
    if (options?.activityTimeout) {
      this.activityTimeout = options.activityTimeout
    }

    this.emitter.emit('init')

    // Buffer Events
    this.emitter.on('buffer:add', () => this.syncState())

    // State Events
    this.emitter.on('state:update', (prev: StateType, state: StateType) => {
      if (this.config.onUpdate) {
        this.config.onUpdate(prev, state)
      }
    })

    // Start activity monitoring
    this.startActivityMonitoring()
  }

  /**
   * Start monitoring entity activity
   */
  private startActivityMonitoring() {
    this.activityInterval = setInterval(() => {
      this.checkEntityActivity()
    }, this.activityTimeout / 2)
  }

  /**
   * Stop activity monitoring
   */
  private stopActivityMonitoring() {
    if (this.activityInterval) {
      clearInterval(this.activityInterval)
      this.activityInterval = undefined
    }
  }

  /**
   * Check for inactive entities and remove them
   */
  private checkEntityActivity() {
    const now = Date.now()
    const inactiveEntities: string[] = []

    for (const [key, entity] of this.state.entities) {
      if (entity.lastSeen && (now - entity.lastSeen) > this.activityTimeout) {
        inactiveEntities.push(key)
      }
    }

    // Remove inactive entities
    for (const key of inactiveEntities) {
      const entity = this.state.entities.get(key)
      if (entity) {
        this.removeEntity(key)
      }
    }
  }

  /**
   * Iterates through the buffer and makes an update to the state for each one
   */
  syncState() {
    if (this.setStateBuffer.length > 0) {
      const previousState = this.state.globalState

      for (const bufferItem of this.setStateBuffer) {
        // Only update the state if the bufferItem actually changes the state
        if (bufferItem !== this.state.globalState) {
          this.state.globalState = bufferItem
        }
      }

      // Clear the buffer
      this.setStateBuffer = []

      // State should be dispatched ONLY after all events in the buffer have finished updating the state.
      // and ONLY if the state differs from the previous state.
      if (previousState !== this.state.globalState) {
        this.state.lastUpdated = Date.now()
        this.emitter.emit('state:update', previousState, this.state.globalState)
      }
    }
  }

  /**
   * Registers a new event listener
   */
  on(event: string, handler: (...args: any[]) => void) {
    this.emitter.on(event, handler)
  }

  /**
   * Removes an event listener
   */
  off(event: string, handler: (...args: any[]) => void) {
    this.emitter.off(event, handler)
  }

  /**
   * Add an entity to presence
   */
  addEntity(entity: PresenceEntity<EntityType>) {
    const now = Date.now()
    const entityWithTimestamp: PresenceEntity<EntityType> = {
      ...entity,
      lastSeen: now
    }

    this.state.entities.set(entity.key, entityWithTimestamp)
    this.state.lastUpdated = now

    // Call config handlers
    this.config.open(this.state.globalState, entityWithTimestamp)
    if (this.config.onEntityJoin) {
      this.config.onEntityJoin(entityWithTimestamp)
    }

    this.emitter.emit('entity:join', entityWithTimestamp)
    this.emitter.emit('presence:update', this.getPresenceData())
  }

  /**
   * Remove an entity from presence
   */
  removeEntity(key: string) {
    const entity = this.state.entities.get(key)
    if (entity) {
      this.state.entities.delete(key)
      this.state.lastUpdated = Date.now()

      // Call config handlers
      this.config.close(this.state.globalState, entity)
      if (this.config.onEntityLeave) {
        this.config.onEntityLeave(entity)
      }

      this.emitter.emit('entity:leave', entity)
      this.emitter.emit('presence:update', this.getPresenceData())
    }
  }

  /**
   * Update an entity's state
   */
  updateEntity(key: string, updates: Partial<EntityType>) {
    const entity = this.state.entities.get(key)
    if (entity) {
      const updatedEntity: PresenceEntity<EntityType> = {
        ...entity,
        state: { ...entity.state, ...updates },
        lastSeen: Date.now()
      }

      this.state.entities.set(key, updatedEntity)
      this.state.lastUpdated = Date.now()

      if (this.config.onEntityUpdate) {
        this.config.onEntityUpdate(updatedEntity)
      }

      this.emitter.emit('entity:update', updatedEntity)
      this.emitter.emit('presence:update', this.getPresenceData())
    }
  }

  /**
   * Update entity activity timestamp
   */
  updateActivity(key: string) {
    const entity = this.state.entities.get(key)
    if (entity) {
      entity.lastSeen = Date.now()
      this.state.entities.set(key, entity)
    }
  }

  /**
   * Get entity by key
   */
  getEntity(key: string): PresenceEntity<EntityType> | undefined {
    return this.state.entities.get(key)
  }

  /**
   * Get all entities
   */
  getEntities(): PresenceEntity<EntityType>[] {
    return Array.from(this.state.entities.values())
  }

  /**
   * Get presence data for broadcasting
   */
  getPresenceData() {
    return {
      key: this.key,
      entities: this.getEntities(),
      globalState: this.state.globalState,
      lastUpdated: this.state.lastUpdated,
      metadata: this.state.metadata,
      entityCount: this.state.entities.size
    }
  }

  /**
   * Check if entity exists
   */
  hasEntity(key: string): boolean {
    return this.state.entities.has(key)
  }

  /**
   * Get entity count
   */
  getEntityCount(): number {
    return this.state.entities.size
  }

  /**
   * Sets the global state of this presence
   */
  setState(newState: StateType) {
    this.setStateBuffer.push(newState)
    this.emitter.emit('buffer:add')
  }

  /**
   * Update metadata
   */
  setMetadata(metadata: Record<string, any>) {
    this.state.metadata = { ...this.state.metadata, ...metadata }
    this.state.lastUpdated = Date.now()
    this.emitter.emit('metadata:update', this.state.metadata)
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopActivityMonitoring()
    this.emitter.removeAllListeners()
  }
}
