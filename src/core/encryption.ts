import * as ncrypto from 'node:crypto'
import { engine } from '../..'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

// Default secret - should be configurable via environment or config
const DEFAULT_SECRET = '++Eb+g/US0g2HIKMFSJxHe+jt0lMJCX89L/DntH+3T8='
const IV_PAD = encoder.encode('8AeikZx3') // 8 bytes

/**
 * Bamboo Encryption Module
 * 
 * Provides cryptographic operations for signing, verifying, and generating
 * secure random values throughout the bamboo framework.
 */
export class Encryption {
    private static secret: string = DEFAULT_SECRET

    /**
     * Initialize the encryption module with a custom secret
     * @param secret - Base64 encoded secret key
     */
    static initialize(secret?: string) {
        if (secret) {
            this.secret = secret
        }
        engine.logging.info('Encryption module initialized')
    }

    /**
     * Generates a cryptographically secure random value
     * @param encoding - Output encoding (default: 'base64')
     * @param length - Number of random bytes (default: 64)
     * @returns Random value in specified encoding
     */
    static random(encoding: BufferEncoding = 'base64', length: number = 64): string {
        const buffer = Buffer.from(ncrypto.randomBytes(length).buffer)
        buffer.write(Date.now().toString(), 8) // Embed timestamp
        return buffer.toString(encoding)
    }

    /**
     * Generates a random token suitable for authentication
     * @param encoding - Output encoding (default: 'base64')
     * @returns Secure authentication token
     */
    static token(encoding: BufferEncoding = 'base64'): string {
        return this.random(encoding, 32)
    }

    /**
     * Signs data with a context and optional lifetime
     * @param context - Context identifier for the signature
     * @param data - Data to sign
     * @param lifetime - Optional lifetime in milliseconds
     * @param extraSecret - Additional secret for extra security
     * @returns Signed token
     */
    static async sign(
        context: string,
        data: string,
        lifetime?: number,
        extraSecret: string = ''
    ): Promise<string> {
        try {
            const iv = new Uint8Array(12)
            iv.set(ncrypto.randomBytes(6))
            iv.set(IV_PAD.slice(0, 6), 6)

            const key = await this.getKey(extraSecret)
            const timestamp = Date.now()
            const expiry = lifetime ? timestamp + lifetime : timestamp
            const payload = `${context}#${data}#${timestamp}#${expiry}`
            const encoded = encoder.encode(payload)

            const encrypted = await globalThis.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                encoded
            )

            const token = Buffer.from([
                Buffer.from(iv).toString('hex'),
                Buffer.from(encrypted).toString('base64')
            ].join(':')).toString('base64')

            return token
        } catch (error) {
            engine.logging.error('Failed to sign data', { context, error })
            throw new Error('Signing failed')
        }
    }

    /**
     * Verifies a signed token
     * @param expectedContext - Expected context for verification
     * @param token - Token to verify
     * @param extraSecret - Additional secret used during signing
     * @param lifetime - Optional lifetime override
     * @returns Verification result with data and metadata
     */
    static async verify(
        expectedContext: string,
        token: string,
        extraSecret: string = '',
        lifetime?: number
    ): Promise<{ data: string | null; timestamp: number; expired: boolean; valid: boolean } | null> {
        try {
            const [ivHex, encryptedB64] = Buffer.from(token, 'base64')
                .toString()
                .split(':')

            const iv = Uint8Array.from(Buffer.from(ivHex, 'hex'))
            const encrypted = Uint8Array.from(Buffer.from(encryptedB64, 'base64'))

            const key = await this.getKey(extraSecret)

            const decrypted = await globalThis.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                encrypted
            )

            const decoded = decoder.decode(decrypted)
            const [ctx, payload, tsStr, expiryStr] = decoded.split('#')
            const timestamp = parseInt(tsStr, 10)
            const expiry = parseInt(expiryStr, 10)
            const now = Date.now()

            // Check context
            if (ctx !== expectedContext) {
                return { data: null, timestamp, expired: true, valid: false }
            }

            // Check expiration
            const isExpired = now > expiry || (lifetime ? now > timestamp + lifetime : false)

            return {
                data: isExpired ? null : payload,
                timestamp,
                expired: isExpired,
                valid: !isExpired
            }
        } catch (error) {
            engine.logging.error('Failed to verify token', { expectedContext, error })
            return null
        }
    }

    /**
     * Creates a hash of data
     * @param data - Data to hash
     * @param algorithm - Hash algorithm (default: 'sha256')
     * @param encoding - Output encoding (default: 'hex')
     * @returns Hash of the data
     */
    static hash(data: string, algorithm: string = 'sha256', encoding: 'hex' | 'base64' = 'hex'): string {
        return ncrypto.createHash(algorithm).update(data).digest(encoding)
    }

    /**
     * Creates an HMAC signature
     * @param data - Data to sign
     * @param key - HMAC key
     * @param algorithm - HMAC algorithm (default: 'sha256')
     * @param encoding - Output encoding (default: 'hex')
     * @returns HMAC signature
     */
    static hmac(
        data: string,
        key: string,
        algorithm: string = 'sha256',
        encoding: 'hex' | 'base64' = 'hex'
    ): string {
        return ncrypto.createHmac(algorithm, key).update(data).digest(encoding)
    }

    /**
     * Generates a secure random UUID v4
     * @returns UUID string
     */
    static uuid(): string {
        return ncrypto.randomUUID()
    }

    /**
     * Internal method to get crypto key
     */
    private static async getKey(extraSecret: string = ''): Promise<CryptoKey> {
        const base = Uint8Array.from(Buffer.from(this.secret, 'base64'))
        const extra = encoder.encode(extraSecret)
        const combined = new Uint8Array(base.length + extra.length)
        combined.set(base)
        combined.set(extra, base.length)

        return globalThis.crypto.subtle.importKey('raw', combined, 'AES-GCM', false, [
            'encrypt',
            'decrypt'
        ])
    }
}

// Export convenience functions
export const sign = Encryption.sign.bind(Encryption)
export const verify = Encryption.verify.bind(Encryption)
export const random = Encryption.random.bind(Encryption)
export const token = Encryption.token.bind(Encryption)
export const hash = Encryption.hash.bind(Encryption)
export const hmac = Encryption.hmac.bind(Encryption)
export const uuid = Encryption.uuid.bind(Encryption) 