/**
 * RateLimitCache is responsible for connecting to a redis/database instance
 * and storing the appropriate consumption/points for each IP address and associated
 * metadata.
 *
 *
 * NOTE: Start with in-memory cache first, add adapters later.
 *
 * TODO: Move this to core/limiter
 */

import { join } from 'path'

type CacheFile = {
  [key: string]: {}
}

// NOTE: TODO: Instead of what's going on down there, create a cache adapter that supports different storage mechanisms.

/**
 * Interface for rate limit cache adapters
 */
export interface RateLimitAdapter {
  get(key: string): Promise<RateLimitLog | null>
  set(key: string, record: RateLimitLog): Promise<void>
  delete(key: string): Promise<void>
  cleanup(): Promise<void>
}

/**
 * In-memory rate limit adapter
 */
export class InMemoryRateLimitAdapter implements RateLimitAdapter {
  private storage = new Map<string, RateLimitLog>()

  async get(key: string): Promise<RateLimitLog | null> {
    return this.storage.get(key) || null
  }

  async set(key: string, record: RateLimitLog): Promise<void> {
    this.storage.set(key, record)
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key)
  }

  async cleanup(): Promise<void> {
    const now = Date.now()
    for (const [key, record] of this.storage.entries()) {
      if (now - record.timestamp > record.interval) {
        this.storage.delete(key)
      }
    }
  }

  get size(): number {
    return this.storage.size
  }
}

/**
 * Redis rate limit adapter
 */
export class RedisRateLimitAdapter implements RateLimitAdapter {
  private redis: any
  private prefix: string

  constructor(redis: any, prefix: string = 'rate_limit:') {
    this.redis = redis
    this.prefix = prefix
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  async get(key: string): Promise<RateLimitLog | null> {
    try {
      const data = await this.redis.get(this.getKey(key))
      if (!data) return null

      const record = JSON.parse(data)
      return {
        current: record.current,
        timestamp: record.timestamp,
        interval: record.interval,
        attemptsOver: record.attemptsOver,
      }
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  }

  async set(key: string, record: RateLimitLog): Promise<void> {
    try {
      const data = JSON.stringify(record)
      // Set with expiration based on interval (add some buffer)
      const ttl = Math.ceil(record.interval / 1000) + 60 // Add 60 seconds buffer
      await this.redis.setEx(this.getKey(key), ttl, data)
    } catch (error) {
      console.error('Redis set error:', error)
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(key))
    } catch (error) {
      console.error('Redis delete error:', error)
    }
  }

  async cleanup(): Promise<void> {
    // Redis handles expiration automatically, so cleanup is not needed
    // But we can implement pattern-based cleanup if needed
    try {
      const keys = await this.redis.keys(`${this.prefix}*`)
      if (keys.length > 0) {
        const now = Date.now()
        for (const key of keys) {
          const data = await this.redis.get(key)
          if (data) {
            const record = JSON.parse(data)
            if (now - record.timestamp > record.interval) {
              await this.redis.del(key)
            }
          }
        }
      }
    } catch (error) {
      console.error('Redis cleanup error:', error)
    }
  }
}

// class JSONRateLimitCache extends RateLimitCacheAdapter {}

type RateLimitLog = {
  current: number
  attemptsOver?: number
  timestamp: number
  interval: number
  // TODO: Implement metadata
  // metadata?: Map<any, any>
}

// TODO: Create a base class based on this implementation of the cache, then create other adapters.
export default class RateLimitCache {
  private adapter: RateLimitAdapter

  constructor(adapter?: RateLimitAdapter) {
    this.adapter = adapter || new InMemoryRateLimitAdapter()
  }

  /**
   * Creates a Redis-based rate limit cache
   */
  static createRedisCache(redis: any, prefix?: string): RateLimitCache {
    return new RateLimitCache(new RedisRateLimitAdapter(redis, prefix))
  }

  isEmpty(): boolean {
    return this.adapter instanceof InMemoryRateLimitAdapter
      ? (this.adapter as InMemoryRateLimitAdapter).size === 0
      : false
  }

  /**
   * Keeps track of a ratelimit for a specific context with proper time-based intervals.
   */
  async track(context: string, interval: number = 60000): Promise<RateLimitLog> {
    const now = Date.now()

    const existing = await this.adapter.get(context)

    if (!existing) {
      // First request for this context
      const tracking = { current: 1, timestamp: now, interval }
      await this.adapter.set(context, tracking)
      return tracking
    }

    const timeSinceFirst = now - existing.timestamp

    // Check if we're still within the interval
    if (timeSinceFirst < interval) {
      // Within interval, increment counter
      existing.current++
      existing.timestamp = now // Update timestamp to most recent request
      await this.adapter.set(context, existing)
      return existing
    } else {
      // Interval has passed, reset the counter
      const tracking = { current: 1, timestamp: now, interval }
      await this.adapter.set(context, tracking)
      return tracking
    }
  }

  /**
   * Resets the ratelimit for a context (ip/user/etc...)
   */
  async reset(context: string) {
    await this.adapter.set(context, {
      current: 0,
      timestamp: 0,
      interval: 60000,
    })
  }

  /**
   * Cleans up expired rate limit entries to prevent memory leaks
   */
  async cleanup() {
    await this.adapter.cleanup()
  }

  /**
   * Gets the remaining requests allowed for a context
   */
  async getRemaining(context: string, limit: number): Promise<number> {
    const record = await this.adapter.get(context)
    if (!record) return limit

    const now = Date.now()
    if (now - record.timestamp > record.interval) {
      return limit
    }

    return Math.max(0, limit - record.current)
  }

  /**
   * Gets the time until the rate limit resets for a context
   */
  async getResetTime(context: string): Promise<number> {
    const record = await this.adapter.get(context)
    if (!record) return 0

    const now = Date.now()
    const timeSinceFirst = now - record.timestamp
    return Math.max(0, record.interval - timeSinceFirst)
  }

  /**
   * If the server crashes, the cache is stored in a file within the .bamboo directory.
   * This file is updated frequently.
   *
   * NOTE: This should be run on start-up of the engine.
   */
  async loadFromCacheFile() {
    // TODO: Add this path resolution somewhere else.
    const cachePath = join(process.cwd(), '.bamboo')
    const cacheFile = Bun.file(join(cachePath, 'ratelimit.cache'))
    const exists = await cacheFile.exists()

    if (exists) {
      const contents = await cacheFile.json()
      // Merge the two Maps, to ensure no dataloss occurs.
      this.adapter = new InMemoryRateLimitAdapter()
    } else {
      // do nothing
    }
  }

  /**
   * Sync the in-memory storage with the filesystem
   *
   * NOTE: This should be run periodically or when the server shuts down.
   * There should also be a mechanism that allows for development mode to clear the cache
   * every x minutes or everytime the server shuts down.
   */
  async saveCacheFile() {
    // TODO: Add this path resolution somewhere else.
    const cachePath = join(process.cwd(), '.bamboo')
    const cacheFile = Bun.file(join(cachePath, 'ratelimit.cache'))
    const exists = await cacheFile.exists()

    const contents = JSON.stringify(this.adapter)
    const contentsBuf = Buffer.from(contents).buffer

    if (!exists) {
      await Bun.write(cacheFile, contentsBuf)
    } else {
      const currentContents = await cacheFile.json()
      const currentContentsBuf = Buffer.from(currentContents).buffer
      if (currentContentsBuf.byteLength !== contentsBuf.byteLength) {
        await Bun.write(cacheFile, currentContentsBuf)
      }
    }
  }
}
