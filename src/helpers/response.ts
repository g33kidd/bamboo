import BaseEndpoint from '../endpoint/BaseEndpoint'
import Endpoint from '../endpoint/Endpoint'
import WebSocketEndpoint from '../endpoint/WebSocketEndpoint'

// Experimental Helpers for sending responses. There are some limitations with this idea
// with unused variables in the parent scope where endpoint exists. This may be replaced
// in favor of something else in the future.

/**
 * Helper function for responding to either Endpoint or WebSocketEndpoint.
 */
export function json(
  data: any,
  status?: string,
  statusText?: string,
  lock?: boolean,
) {
  // @ts-ignore
  if (endpoint || _endpoint) {
    // @ts-ignore
    let currentEndpoint
    // @ts-ignore
    if (endpoint) currentEndpoint = endpoint as BaseEndpoint
    // @ts-ignore
    if (_endpoint) currentEndpoint = _endpoint as BaseEndpoint

    if (currentEndpoint) {
      try {
        const json = JSON.stringify(data, null, 0)

        // Infer the type of Endpoint based on the realtime flag
        if (currentEndpoint.realtime) {
          // @ts-ignore
          return (endpoint as WebSocketEndpoint).json(data, lock)
        } else {
          // @ts-ignore
          return (endpoint as Endpoint).json(data, status, statusText)
        }
      } catch (e) {
        throw new Error(`Could not send JSON response: ${e}`)
      }
    } else {
      throw new Error(
        'There is no endpoint in the current scope. Try using endpoint.json() instead.',
      )
    }
  } else {
    throw new Error(
      'There is no endpoint in the current scope. Try using endpoint.json() instead.',
    )
  }
}
