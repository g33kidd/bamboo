import { describe, expect, test } from 'bun:test'
import Presence from '../src/core/realtime/presence'

type PresenceState = { count: number }
type ComplexPresenceState = {
  users: string[]
  items: string[]
  count: number
}

function presenceSetup() {
  return new Presence<PresenceState, any>(
    'test',
    { count: 0 },
    {
      open(state, entity) {},
      close(state, entity) {},
    },
  )
}

function presenceSetupWithActions() {
  const presence = new Presence<PresenceState, any>(
    'test',
    { count: 0 },
    {
      open(state, entity) {
        presence.setState({ ...state, count: presence.state.count + 3 })
      },
      close(state, entity) {
        presence.setState({ ...state, count: 0 })
      },
    },
  )

  return presence
}

describe('Presence', () => {
  test('creates an initial state', () => {
    const presence = presenceSetup()
    expect(presence.state.count).toBe(0)
  })

  test('updates state', () => {
    const presence = presenceSetup()
    presence.setState({ ...presence.state, count: 3 })
    expect(presence.state.count).toBe(3)
  })

  test('updates complex state', () => {
    const initialState: ComplexPresenceState = {
      users: [],
      items: [],
      count: 0,
    }

    const presence = new Presence<ComplexPresenceState, any>(
      'test',
      initialState,
      {
        open(state, entity) {
          presence.setState({
            ...presence.state,
            users: [...presence.state.users, 'hi'],
            items: [...presence.state.items, 'test'],
            count: presence.state.count + 3,
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

    presence.open({ key: '123', state: {} })
    presence.open({ key: '123', state: {} })
    presence.open({ key: '123', state: {} })
    expect(presence.state.users.length).toBe(3)
    expect(presence.state.count).toBe(9)

    presence.close({ key: '123', state: {} })
    expect(presence.state.count).toBe(0)
    expect(presence.state.users.length).toBe(0)
  })

  test('updates state on open()', () => {
    const presence = presenceSetupWithActions()

    presence.open({ key: '123', state: {} })
    expect(presence.state.count).toBe(3)
    presence.close({ key: '123', state: {} })
    expect(presence.state.count).toBe(0)
  })

  test('updates state on close()', () => {
    const presence = presenceSetupWithActions()

    presence.open({ key: '123', state: {} })
    presence.open({ key: '123', state: {} })
    presence.open({ key: '123', state: {} })
    expect(presence.state.count).toBe(9)
    presence.close({ key: '123', state: {} })
    expect(presence.state.count).toBe(0)
  })
})
