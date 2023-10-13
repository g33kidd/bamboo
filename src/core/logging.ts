// TODO: Support more adapters.
export interface LogAdapter {
  name: string
  log: LogHandler
}

export type LogHandler = (...data: any[]) => void

export default class Logger {
  adapters: LogAdapter[] = []

  constructor() {}

  register(adapter: LogAdapter) {
    this.adapters.push(adapter)
  }

  log(...data: any[]) {
    for (const adapter of this.adapters) {
      adapter.log(...data)
    }
  }
}

export function createLogAdapter(
  name: string,
  log: (...data: any[]) => void,
): LogAdapter {
  return {
    name,
    log,
  }
}
