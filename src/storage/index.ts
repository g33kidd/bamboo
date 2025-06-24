import { exists, mkdir } from 'fs/promises'
import { join } from 'path'
import { cwd } from 'process'
import { engine } from '../..'

// TODO: Create methods for deleting entire files or even chunks of files.
// TODO: Create a method for creating directories.

// NOTE: This should be the same as the implementation in nyra.
export async function createStorageObject() {}

/**
 * Storage is the 'storage' directory at the root of the application.
 * This ensures that subdirs have been created or do exist.
 */
export async function ensureStorageDirs(dirs: string[]) {
  // Make sure the storage directory is available first.
  const storagePath = join(cwd(), 'storage')
  const storageExists = await exists(storagePath)
  if (!storageExists) {
    engine.logging.info(`Storage did not exist at ${storagePath}, creating folder.`)
    await mkdir(storagePath)
  }

  for await (let dir of dirs) {
    const path = join(storagePath, dir)
    const dirExists = await exists(path)
    if (!dirExists) {
      engine.logging.info(`Storage directory ${dir}, did not exist. Creating new folder at: ${path}`)
      await mkdir(path)
    }
  }
}

/**
 * Saves a file to storage in the specified directory. If the directory does not exist, it creates the directory.
 * This should absolutely utilize different storage adapters if they are available and configured.
 *
 * TODO: This should probably support subdirectories and such in the future.
 * TODO: Saving chunks.
 */
export async function saveFile(dir: string, name: string, buffer: Buffer) {
  if (buffer.length > 0) {
    const path = join(process.cwd(), 'storage', dir, name)
    const existingFile = Bun.file(path)
    const exists = await existingFile.exists()

    if (exists) {
      const arrayBuffer = await existingFile.arrayBuffer()
      if (Buffer.from(arrayBuffer) === buffer) {
        // Do nothing because the file is the same. Don't waste I/O resources.
        return
      }
    }

    const bytesWritten = await Bun.write(path, buffer.buffer)

    if (bytesWritten !== buffer.byteLength) {
      engine.logging.info(
        `File at: ${path} could not be saved. bufByteLength: ${buffer.byteLength}, bytesWritten: ${bytesWritten}`,
      )
      throw new Error('Could not save entire file. Check logs.')
    } else {
      return bytesWritten
    }
  } else {
    throw new Error('Cannot save a file with 0 bytes.')
  }
}
