import { describe, expect, test } from 'bun:test'
import Presence, { PresenceEntity } from '../src/core/realtime/presence'

type PresenceState = { count: number }
type ComplexPresenceState = {
  users: string[]
  items: string[]
  count: number
}

type UserEntity = {
  username: string
  status: 'online' | 'away' | 'busy'
}

function presenceSetup() {
  return new Presence<PresenceState, UserEntity>(
    'test',
    { count: 0 },
    {
      open(state, entity) {},
      close(state, entity) {},
    },
  )
}

function presenceSetupWithActions() {
  const presence = new Presence<PresenceState, UserEntity>(
    'test',
    { count: 0 },
    {
      open(state, entity) {
        presence.setState({ ...presence.state.globalState, count: presence.state.globalState.count + 3 })
      },
      close(state, entity) {
        presence.setState({ ...presence.state.globalState, count: 0 })
      },
    },
  )

  return presence
}

describe('Presence', () => {
  test('creates an initial state', () => {
    const presence = presenceSetup()
    expect(presence.state.globalState.count).toBe(0)
    expect(presence.state.entities.size).toBe(0)
  })

  test('updates state', () => {
    const presence = presenceSetup()
    presence.setState({ ...presence.state.globalState, count: 3 })
    expect(presence.state.globalState.count).toBe(3)
  })

  test('updates complex state', () => {
    const initialState: ComplexPresenceState = {
      users: [],
      items: [],
      count: 0,
    }

    const presence = new Presence<ComplexPresenceState, UserEntity>(
      'test',
      initialState,
      {
        open(state, entity) {
          presence.setState({
            ...presence.state.globalState,
            users: [...presence.state.globalState.users, 'hi'],
            items: [...presence.state.globalState.items, 'test'],
            count: presence.state.globalState.count + 3,
          })
        },
        close(state, entity) {
          presence.setState(initialState)
        },
        onUpdate(previousState, newState) {
          expect(previousState).not.toEqual(newState)
        },
      },
    )

    const entity1: PresenceEntity<UserEntity> = { key: 'user1', state: { username: 'user1', status: 'online' } }
    const entity2: PresenceEntity<UserEntity> = { key: 'user2', state: { username: 'user2', status: 'online' } }
    const entity3: PresenceEntity<UserEntity> = { key: 'user3', state: { username: 'user3', status: 'online' } }

    presence.addEntity(entity1)
    presence.addEntity(entity2)
    presence.addEntity(entity3)
    expect(presence.state.globalState.users.length).toBe(3)
    expect(presence.state.globalState.count).toBe(9)

    presence.removeEntity('user1')
    expect(presence.state.globalState.count).toBe(0)
    expect(presence.state.globalState.users.length).toBe(0)
  })

  test('updates state on addEntity()', () => {
    const presence = presenceSetupWithActions()

    const entity: PresenceEntity<UserEntity> = { key: 'user1', state: { username: 'user1', status: 'online' } }
    presence.addEntity(entity)
    expect(presence.state.globalState.count).toBe(3)
  })

  test('updates state on removeEntity()', () => {
    const presence = presenceSetupWithActions()

    const entity: PresenceEntity<UserEntity> = { key: 'user1', state: { username: 'user1', status: 'online' } }
    presence.addEntity(entity)
    presence.addEntity(entity)
    presence.addEntity(entity)
    expect(presence.state.globalState.count).toBe(9)
    presence.removeEntity('user1')
    expect(presence.state.globalState.count).toBe(0)
  })

  test('manages entities correctly', () => {
    const presence = presenceSetup()
    
    const entity1: PresenceEntity<UserEntity> = { key: 'user1', state: { username: 'user1', status: 'online' } }
    const entity2: PresenceEntity<UserEntity> = { key: 'user2', state: { username: 'user2', status: 'away' } }

    // Add entities
    presence.addEntity(entity1)
    presence.addEntity(entity2)
    expect(presence.getEntityCount()).toBe(2)
    expect(presence.hasEntity('user1')).toBe(true)
    expect(presence.hasEntity('user2')).toBe(true)
    expect(presence.hasEntity('user3')).toBe(false)

    // Get entities
    const retrievedEntity = presence.getEntity('user1')
    expect(retrievedEntity?.state.username).toBe('user1')
    expect(retrievedEntity?.state.status).toBe('online')

    // Update entity
    presence.updateEntity('user1', { status: 'busy' })
    const updatedEntity = presence.getEntity('user1')
    expect(updatedEntity?.state.status).toBe('busy')

    // Remove entity
    presence.removeEntity('user1')
    expect(presence.getEntityCount()).toBe(1)
    expect(presence.hasEntity('user1')).toBe(false)
    expect(presence.hasEntity('user2')).toBe(true)
  })

  test('emits events correctly', () => {
    const presence = presenceSetup()
    const events: string[] = []
    
    presence.on('entity:join', () => events.push('join'))
    presence.on('entity:leave', () => events.push('leave'))
    presence.on('entity:update', () => events.push('update'))
    presence.on('presence:update', () => events.push('presence_update'))

    const entity: PresenceEntity<UserEntity> = { key: 'user1', state: { username: 'user1', status: 'online' } }
    
    presence.addEntity(entity)
    expect(events).toContain('join')
    expect(events).toContain('presence_update')

    presence.updateEntity('user1', { status: 'away' })
    expect(events).toContain('update')

    presence.removeEntity('user1')
    expect(events).toContain('leave')
  })

  test('provides presence data', () => {
    const presence = presenceSetup()
    const entity: PresenceEntity<UserEntity> = { key: 'user1', state: { username: 'user1', status: 'online' } }
    
    presence.addEntity(entity)
    const data = presence.getPresenceData()
    
    expect(data.key).toBe('test')
    expect(data.entities).toHaveLength(1)
    expect(data.entityCount).toBe(1)
    expect(data.entities[0].state.username).toBe('user1')
    expect(data.lastUpdated).toBeDefined()
  })

  test('cleans up resources', () => {
    const presence = presenceSetup()
    const entity: PresenceEntity<UserEntity> = { key: 'user1', state: { username: 'user1', status: 'online' } }
    
    presence.addEntity(entity)
    expect(presence.getEntityCount()).toBe(1)
    
    presence.destroy()
    // After destroy, the presence should be cleaned up
    // Note: We can't easily test the interval cleanup, but the method should not throw
  })
})
