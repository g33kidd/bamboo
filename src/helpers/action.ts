import fs, { exists } from 'fs/promises'
import { join } from 'path'
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

export async function loadActionDirectory(path: string): Promise<string[]> {
  const pathMap = []
  path = join(path, 'actions')
  const pathExists = await exists(path)
  if (pathExists) {
    const contents = await fs.readdir(path)
    for (const file of contents) {
      pathMap.push(file)
    }
  }
  return pathMap
}

// TODO: Extract parameter parsing to here.
export function parseParameters() {}
