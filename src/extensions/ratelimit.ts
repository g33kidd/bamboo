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
   * Keeps track of a ratelimit for a specific context.
   */
  track(context: string): RateLimitLog {
    const timestamp = Date.now()
    let tracking = { current: 0, timestamp }
    let currentAmount = 0
    if (!this.storage.has(context)) {
      tracking = { current: 0, timestamp }
      this.storage.set(context, tracking)
    } else {
      const current = this.storage.get(context)
      if (current) {
        currentAmount = current.current + 1
        tracking = { current: currentAmount, timestamp }
        this.storage.set(context, tracking)
      }
    }

    return tracking
  }

  /**
   * Resets the ratelimit for a context (ip/user/etc...)
   */
  reset(context: string) {
    if (this.storage.has(context)) {
      this.storage.set(context, {
        current: 0,
        timestamp: 0,
      })
    }
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
