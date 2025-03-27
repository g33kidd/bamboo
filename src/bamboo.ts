import { join } from 'path'
import * as ncrypto from 'node:crypto'

export default class Bamboo {
  /**
   *
   */
  static sign(ctx: string, data: string, lifetime?: number) {
    const hmac = ncrypto.createHmac('sha512', 'secret')
  }

  static verify(ctx: string, data: string, lifetime?: number) {}

  /**
   * Generates a random value with base64 encoding.
   */
  static createSecureToken(encoding: BufferEncoding = 'base64') {
    const buffer = Buffer.from(ncrypto.randomBytes(64).buffer)
    buffer.write(Date.now().toString(), 8)
    return buffer.toString(encoding)
  }
}
