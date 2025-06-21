import { describe, test, expect, beforeEach } from 'bun:test'
import { join } from 'path'
import RateLimitCache from '../src/extensions/ratelimit'
import defaultEngine from '../src/engine'

describe('Rate Limiting', () => {
    let cache: RateLimitCache
    let engine: typeof defaultEngine

    beforeEach(() => {
        cache = new RateLimitCache()
        engine = defaultEngine
    })

    describe('RateLimitCache', () => {
        test('should track requests within interval', () => {
            const context = 'test:api'
            const interval = 1000 // 1 second

            // First request
            const record1 = cache.track(context, interval)
            expect(record1.current).toBe(1)

            // Second request within interval
            const record2 = cache.track(context, interval)
            expect(record2.current).toBe(2)

            // Third request within interval
            const record3 = cache.track(context, interval)
            expect(record3.current).toBe(3)
        })

        test('should reset counter after interval expires', async () => {
            const context = 'test:api'
            const interval = 100 // 100ms

            // First request
            cache.track(context, interval)

            // Wait for interval to expire
            await Bun.sleep(150)

            // Next request should reset counter
            const record = cache.track(context, interval)
            expect(record.current).toBe(1)
        })

        test('should calculate remaining requests correctly', () => {
            const context = 'test:api'
            const interval = 1000
            const limit = 5

            // Make 3 requests
            cache.track(context, interval)
            cache.track(context, interval)
            cache.track(context, interval)

            const remaining = cache.getRemaining(context, limit)
            expect(remaining).toBe(2)
        })

        test('should calculate reset time correctly', () => {
            const context = 'test:api'
            const interval = 1000

            cache.track(context, interval)

            const resetTime = cache.getResetTime(context)
            expect(resetTime).toBeGreaterThan(0)
            expect(resetTime).toBeLessThanOrEqual(interval)
        })

        test('should cleanup expired entries', async () => {
            const context1 = 'test:api1'
            const context2 = 'test:api2'
            const interval = 100 // 100ms

            // Create entries
            cache.track(context1, interval)
            cache.track(context2, interval)

            expect(cache.storage.size).toBe(2)

            // Wait for interval to expire
            await Bun.sleep(150)

            // Cleanup should remove expired entries
            cache.cleanup()
            expect(cache.storage.size).toBe(0)
        })
    })

    describe('Engine Rate Limiting', () => {
        test('should enforce rate limits correctly', () => {
            const context = 'test:engine'
            const limit = 3
            const interval = 1000

            // First 3 requests should pass
            expect(engine.ratelimit(context, limit, interval)).toBe(false)
            expect(engine.ratelimit(context, limit, interval)).toBe(false)
            expect(engine.ratelimit(context, limit, interval)).toBe(false)

            // 4th request should be rate limited
            expect(engine.ratelimit(context, limit, interval)).toBe(true)
        })

        test('should reset after interval expires', async () => {
            const context = 'test:engine:reset'
            const limit = 2
            const interval = 100 // 100ms

            // Make 2 requests
            expect(engine.ratelimit(context, limit, interval)).toBe(false)
            expect(engine.ratelimit(context, limit, interval)).toBe(false)

            // 3rd should be rate limited
            expect(engine.ratelimit(context, limit, interval)).toBe(true)

            // Wait for interval to expire
            await Bun.sleep(150)

            // Should be able to make requests again
            expect(engine.ratelimit(context, limit, interval)).toBe(false)
        })

        test('should provide rate limit information', () => {
            const context = 'test:engine:info'
            const limit = 5
            const interval = 1000

            // Make some requests
            engine.ratelimit(context, limit, interval)
            engine.ratelimit(context, limit, interval)

            const info = engine.getRateLimitInfo(context)
            expect(info).toBeDefined()
            expect(info?.context).toBe(context)
            expect(info?.limit).toBe(limit)
            expect(info?.remaining).toBe(3)
            expect(info?.resetTimeSeconds).toBeGreaterThan(0)
        })
    })
}) 