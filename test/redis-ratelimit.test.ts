// import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
// import { createClient } from 'redis'
// import RateLimitCache, { RedisRateLimitAdapter } from '../src/extensions/ratelimit'

// describe('Redis Rate Limiting', () => {
//     let cache: RateLimitCache
//     let redis: any

//     beforeEach(async () => {
//         // Create Redis client
//         redis = createClient({
//             url: process.env.REDIS_URL || 'redis://localhost:6379'
//         })

//         await redis.connect()

//         // Create cache with Redis adapter
//         cache = new RateLimitCache(new RedisRateLimitAdapter(redis, 'test:rate_limit:'))
//     })

//     afterEach(async () => {
//         // Clean up test keys
//         const keys = await redis.keys('test:rate_limit:*')
//         if (keys.length > 0) {
//             await redis.del(keys)
//         }

//         await redis.quit()
//     })

//     test('should track requests within interval using Redis', async () => {
//         const context = 'test:api'
//         const interval = 1000 // 1 second

//         // First request
//         const record1 = await cache.track(context, interval)
//         expect(record1.current).toBe(1)

//         // Second request within interval
//         const record2 = await cache.track(context, interval)
//         expect(record2.current).toBe(2)

//         // Third request within interval
//         const record3 = await cache.track(context, interval)
//         expect(record3.current).toBe(3)
//     })

//     test('should reset counter after interval expires with Redis', async () => {
//         const context = 'test:api:reset'
//         const interval = 100 // 100ms

//         // First request
//         await cache.track(context, interval)

//         // Wait for interval to expire
//         await Bun.sleep(150)

//         // Next request should reset counter
//         const record = await cache.track(context, interval)
//         expect(record.current).toBe(1)
//     })

//     test('should calculate remaining requests correctly with Redis', async () => {
//         const context = 'test:api:remaining'
//         const interval = 1000
//         const limit = 5

//         // Make 3 requests
//         await cache.track(context, interval)
//         await cache.track(context, interval)
//         await cache.track(context, interval)

//         const remaining = await cache.getRemaining(context, limit)
//         expect(remaining).toBe(2)
//     })

//     test('should persist data across cache instances', async () => {
//         const context = 'test:persist'
//         const interval = 1000

//         // Create first cache instance
//         const cache1 = new RateLimitCache(new RedisRateLimitAdapter(redis, 'test:rate_limit:'))
//         await cache1.track(context, interval)
//         await cache1.track(context, interval)

//         // Create second cache instance (should see same data)
//         const cache2 = new RateLimitCache(new RedisRateLimitAdapter(redis, 'test:rate_limit:'))
//         const record = await cache2.track(context, interval)
//         expect(record.current).toBe(3)
//     })

//     test('should handle Redis connection errors gracefully', async () => {
//         // Create cache with invalid Redis connection
//         const invalidRedis = createClient({ url: 'redis://invalid-host:6379' })
//         const cacheWithInvalidRedis = new RateLimitCache(new RedisRateLimitAdapter(invalidRedis, 'test:rate_limit:'))

//         // Should not throw error, should return default values
//         const remaining = await cacheWithInvalidRedis.getRemaining('test:error', 10)
//         expect(remaining).toBe(10) // Should return limit when Redis is unavailable

//         await invalidRedis.quit()
//     })

//     test('should use custom prefix for Redis keys', async () => {
//         const customPrefix = 'custom:prefix:'
//         const context = 'test:custom'
//         const interval = 1000

//         const cacheWithCustomPrefix = new RateLimitCache(new RedisRateLimitAdapter(redis, customPrefix))
//         await cacheWithCustomPrefix.track(context, interval)

//         // Check that key was created with custom prefix
//         const keys = await redis.keys(`${customPrefix}*`)
//         expect(keys.length).toBeGreaterThan(0)
//         expect(keys[0]).toContain(customPrefix)

//         // Clean up
//         await redis.del(keys)
//     })
// }) 