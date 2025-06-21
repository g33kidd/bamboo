import { join } from 'path'
import * as ncrypto from 'node:crypto'
import { Encryption } from './core/encryption'

export default class Bamboo {
  /**
   *
   */
  static sign(ctx: string, data: string, lifetime?: number) {
    const hmac = ncrypto.createHmac('sha512', 'secret')
  }

  static verify(ctx: string, data: string, lifetime?: number) { }

  /**
   * Generates a random value with base64 encoding.
   * TODO: Remove this
   */
  static createSecureToken(encoding: BufferEncoding = 'base64') {
    console.warn(
      'This function will be deprecated. Please use randomValue() instead.',
    )
    return this.randomValue(encoding)
  }

  /**
   * Generates a random value and encodes it (default is base64)
   */
  static randomValue(encoding: BufferEncoding = 'base64') {
    const buffer = Buffer.from(ncrypto.randomBytes(64).buffer)
    buffer.write(Date.now().toString(), 8)
    return buffer.toString(encoding)
  }

  // Encryption module
  static encryption = Encryption
}

// Export encryption functions for convenience
export { Encryption } from './core/encryption'
export { sign, verify, random, token, hash, hmac, uuid } from './core/encryption'
