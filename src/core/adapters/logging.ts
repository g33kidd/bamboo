import { createLogAdapter, LogAdapter } from '../logging'

const ConsoleLogAdapter = createLogAdapter('console', (data) =>
  console.log(data),
)

export { ConsoleLogAdapter }
