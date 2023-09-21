import { exists, mkdir } from "fs/promises";
import { join } from "path";

/**
 * Storage is the 'storage' directory at the root of the application.
 * This ensures that subdirs have been created or do exist.
 */
async function ensureStorageDirs(dirs: string[]) {
  for await (let dir of dirs) {
    const path = join(process.cwd(), "storage", dir);
    const dirExists = await exists(path);
    if (!dirExists) {
      console.info(
        "Storage directory",
        dir,
        "did not exist. Creating new folder at:",
        path
      );

      await mkdir(path);
    }
  }
}

export { ensureStorageDirs };
