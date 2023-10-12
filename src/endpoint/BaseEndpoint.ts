import { hrtime } from 'node:process'
import { engine } from '../..'

type EndpointParams = { [key: string]: any }

export default class BaseEndpoint {
  stashMap: Map<string, any> = new Map()
  params: EndpointParams = {}

  timeStart: bigint
  timeEnd?: bigint

  constructor() {
    this.timeStart = hrtime.bigint()
  }

  useParams(parameters: EndpointParams) {
    this.params = parameters
  }

  /**
   * Stores a value in the Endpoint stash for use later on in the request lifecycle.
   */
  stash(key: string, value?: any) {
    if (!this.stashMap.has(key)) {
      this.stashMap.set(key, value)
    } else {
      // If there is no value, assume that we're trying to fetch the value.
      if (!value) {
        return this.stashMap.get(key)
      }
    }
  }

  /**
   * Retrieves a value from the stash.
   *
   * @param key
   * @param defaultValue
   * @returns stash[key] value or defaultValue or null.
   */
  fromStash(key: string, defaultValue?: any) {
    if (this.stashMap.has(key)) {
      return this.stashMap.get(key)
    }

    return defaultValue || null
  }

  /**
   * Returns a service that has been registered by the engine.
   */
  service<T>(name: string): T {
    return engine.service<T>(name)
  }

  time(): number {
    if (this.timeEnd) {
      return Number(this.timeEnd - this.timeStart) / 1000
    } else {
      return 0
    }
  }

  debug(...data: any[]) {
    const time = this.time()
    const timeDisplay =
      time < 800 ? `${Math.round(time)}µs` : `${Math.round(time / 1000)}ms`

    console.log(...data, `in ${timeDisplay}`)
  }
}
