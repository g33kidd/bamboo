import { exists, mkdir } from 'fs/promises'
import { join } from 'path'
import { cwd } from 'process'

/**
 * Storage is the 'storage' directory at the root of the application.
 * This ensures that subdirs have been created or do exist.
 */
export async function ensureStorageDirs(dirs: string[]) {
  // Make sure the storage directory is available first.
  const storagePath = join(cwd(), 'storage')
  const storageExists = await exists(storagePath)
  if (!storageExists) {
    console.info("Storage did not exist at", storagePath, ". Creating folder.")
    await mkdir(storagePath)
  }

  for await (let dir of dirs) {
    const path = join(storagePath, dir)
    const dirExists = await exists(path)
    if (!dirExists) {
      console.info(
        'Storage directory',
        dir,
        'did not exist. Creating new folder at:',
        path,
      )

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
  // NOTE: Might want to do this?
  // await ensureStorageDirs([dir])

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

    const bytesWritten = await Bun.write(path, buffer)

    if (bytesWritten !== buffer.byteLength) {
      console.error(
        'File at:',
        path,
        'could not be saved. bufByteLength:',
        buffer.byteLength,
        'bytesWritten:',
        bytesWritten,
      )
      throw new Error('Could not save entire file. Check logs.')
    } else {
      return bytesWritten
    }
  } else {
    throw new Error('Cannot save a file with 0 bytes.')
  }
}
