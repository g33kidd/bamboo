/**
 *
 *
 * Presence needs to handle the following:
 *
 * - Connect/disconnect of a client.
 * - Handle sending/receiving pings from clients.
 */

import { EventEmitter } from 'stream'

export interface PresenceEntity<EntityType> {
  key: string
  state: EntityType
}

export interface PresenceConfig<StateType, EntityType> {
  open(state: StateType, entity: PresenceEntity<EntityType>): void
  close(state: StateType, entity: PresenceEntity<EntityType>): void
  onUpdate?(previousState: StateType, newState: StateType): void
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
   * Presence global state storage
   */
  state: StateType

  /**
   * Buffer for storing individual updates to the state
   */
  setStateBuffer: StateType[]

  /**
   * Configuration for this Presence instance
   */
  config: PresenceConfig<StateType, EntityType>

  /**
   * Entities that are members of this presence instance
   */
  entities: EntityType[]

  /**
   * Internal event emitter for Presence
   */
  emitter: EventEmitter = new EventEmitter()

  /**
   * Construct a new instance of Presence
   */
  constructor(
    key: string,
    initialState: StateType,
    config: PresenceConfig<StateType, EntityType>,
  ) {
    this.key = key
    this.state = initialState
    this.config = config
    this.entities = []
    this.setStateBuffer = []

    this.emitter.emit('init')

    // Buffer Events
    this.emitter.on('buffer:add', () => this.syncState())

    // State Events
    this.emitter.on('state:update', (prev: StateType, state: StateType) => {
      if (this.config.onUpdate) {
        this.config.onUpdate(prev, state)
      }
    })
  }

  /**
   * Iterates through the buffer and makes an update to the state for each one
   */
  syncState() {
    if (this.setStateBuffer.length > 0) {
      const previousState = this.state

      for (const bufferItem of this.setStateBuffer) {
        // Only update the state if the bufferItem actually changes the state
        if (bufferItem !== this.state) {
          this.state = bufferItem
        }
      }

      // State should be dispatched ONLY after all events in the buffer have finished updating the state.
      // and ONLY if the state differs from the previous state.
      if (previousState !== this.state) {
        this.emitter.emit('state:update', previousState, this.state)
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
   * Handles a new entity being added to the presence.
   */
  open(entity: PresenceEntity<EntityType>) {
    this.config.open(this.state, entity)
  }

  /**
   * Handles an entity being removed from presence.
   */
  close(entity: PresenceEntity<EntityType>) {
    this.config.close(this.state, entity)
  }

  /**
   * Sets the global state of this presence
   */
  setState(newState: StateType) {
    this.setStateBuffer.push(newState)
    this.emitter.emit('buffer:add')
  }
}
