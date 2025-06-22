import { engine } from '../..'
import Extension from './extension'

/**
 * ExtensionContainer is responsible for handling all interactions
 * with the extensions within Bamboo.
 */

const extensionName = (extension: Extension | string) => {
  let extensionName: string
  if (typeof extension === 'string') {
    extensionName = extension
  } else {
    extensionName = extension.name
  }
  return extensionName
}

class ExtensionContainer {
  extensions: Map<string, Extension> = new Map()

  size() {
    return this.extensions.size
  }

  async add(extension: Extension) {
    if (this.extensions.has(extension.name)) {
      engine.logging.log('cannot override an existing extension')
    } else {
      extension.initialize()
      this.extensions.set(extension.name, extension)
      await extension.start()
    }
  }

  get(extension: string) {
    if (this.extensions.has(extension)) {
      return this.extensions.get(extension)
    } else {
      return null
    }
  }

  /**
   * Removes an extension and calls any necessary hooks
   */
  remove(extension: Extension | string) {
    const name = extensionName(extension)
    const ext = this.get(name)
    if (ext) {
      ext.stop()
      ext.remove()
      this.extensions.delete(name)
    }
  }
}

export default ExtensionContainer
