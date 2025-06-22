import { describe, expect, it, test } from 'bun:test'
import { engine } from '..'
import Extension from '../src/core/extension'

class MockExtension extends Extension {}
const mockExtension = new MockExtension('mock')

describe('Extensions', () => {
  it('should add a new extension', () => {
    engine.extend(mockExtension)
    expect(engine.extensions.size()).toBe(1)
  })

  it('should not override an existing extension', () => {
    engine.extend(mockExtension)
    engine.extend(mockExtension)
    engine.extend(mockExtension)
    engine.extend(mockExtension)
    expect(engine.extensions.size()).toBe(1)
  })

  it('should remove an extension by name', () => {
    engine.extensions.remove(mockExtension)
    expect(engine.extensions.size()).toBe(0)
  })
})
