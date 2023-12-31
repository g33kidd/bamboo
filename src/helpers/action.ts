import Endpoint from '../endpoint/Endpoint'

export function parseActionURL(endpoint: Endpoint) {
  const parsed: string[] = []

  const url = endpoint.parts

  // Remove the last blank entry, if there is one.
  if (url[url.length - 1] === '') url.pop()

  // Adds root as an entry, otherwise add all other parts.
  if (url.length === 0 || (url.length === 1 && url[0] === '')) {
    parsed.push('__root')
  } else {
    parsed.push(...url)
  }

  return parsed
}

// TODO: Extract parameter parsing to here.
export function parseParameters() {}
