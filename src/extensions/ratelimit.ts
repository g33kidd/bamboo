/**
 * RateLimitCache is responsible for connecting to a redis/database instance
 * and storing the appropriate consumption/points for each IP address and associated
 * metadata.
 *
 *
 * NOTE: Start with in-memory cache first, add adapters later.
 */

import { join } from "path";

type CacheFile = {
  [key: string]: {};
};

export default class RateLimitCache {
  storage: Map<string, any>;

  constructor() {}

  /**
   * If the server crashes, the cache is stored in a file within the .bamboo directory.
   * This file is updated frequently.
   */
  async loadFromCacheFile() {
    // TODO: Add this path resolution somewhere else.
    const cachePath = join(process.cwd(), ".bamboo");
    const cacheFile = Bun.file(join(cachePath, "ratelimit.cache"));
    const exists = await cacheFile.exists();

    if (exists) {
      const contents = await cacheFile.json();
      // Merge the two Maps, to ensure no dataloss occurs.
      this.storage = new Map();
    } else {
      // do nothing
    }
  }
}
