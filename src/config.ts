import { join } from 'path'

export interface BambooConfig {
  hostname: string
  port: number
  paths: {
    root: string
    [key: string]: string
  }
}

// const file = Bun.file(join(process.cwd(), 'config.ts'))
// const config = JSON.parse();
