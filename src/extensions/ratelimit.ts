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

// class RateLimitCacheAdapter {
//   constructor() {}

// }

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
  storage: Map<string, RateLimitLog>

  constructor() {
    this.storage = new Map()
  }

  isEmpty(): boolean {
    return this.storage.size > 0
  }

  /**
   * Keeps track of a ratelimit for a specific context with proper time-based intervals.
   */
  track(context: string, interval: number = 60000): RateLimitLog {
    const now = Date.now()

    if (!this.storage.has(context)) {
      // First request for this context
      const tracking = { current: 1, timestamp: now, interval }
      this.storage.set(context, tracking)
      return tracking
    }

    const current = this.storage.get(context)!
    const timeSinceFirst = now - current.timestamp

    // Check if we're still within the interval
    if (timeSinceFirst < interval) {
      // Within interval, increment counter
      current.current++
      current.timestamp = now // Update timestamp to most recent request
      this.storage.set(context, current)
      return current
    } else {
      // Interval has passed, reset the counter
      const tracking = { current: 1, timestamp: now, interval }
      this.storage.set(context, tracking)
      return tracking
    }
  }

  /**
   * Resets the ratelimit for a context (ip/user/etc...)
   */
  reset(context: string) {
    if (this.storage.has(context)) {
      this.storage.set(context, {
        current: 0,
        timestamp: 0,
        interval: 60000,
      })
    }
  }

  /**
   * Cleans up expired rate limit entries to prevent memory leaks
   */
  cleanup() {
    const now = Date.now()
    for (const [key, record] of this.storage.entries()) {
      if (now - record.timestamp > record.interval) {
        this.storage.delete(key)
      }
    }
  }

  /**
   * Gets the remaining requests allowed for a context
   */
  getRemaining(context: string, limit: number): number {
    const record = this.storage.get(context)
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
  getResetTime(context: string): number {
    const record = this.storage.get(context)
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
      this.storage = new Map()
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

    const contents = JSON.stringify(this.storage)
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
