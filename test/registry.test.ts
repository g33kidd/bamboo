import { describe, expect, test } from 'bun:test'
import { action, engine, group } from '..'

describe('Engine Action Registry', () => {
  test('Should build a nested map', () => {
    engine.configure({
      actions: [group('/api', [action('GET /', async (e) => e)])],
    })

    // TODO: Write a better test for this.
    expect(engine.registry.store.size).toBe(1)
  })

  test('Test should add multiple request types', () => {
    engine.configure({
      actions: [
        action('GET /', async (e) => e),
        action('POST /', async (e) => e),
        action('PUT /', async (e) => e),
      ],
    })

    expect(engine.registry.store.size).toBe(3)
  })
})
