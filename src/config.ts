import { join } from "path";

export type BambooConfig = {
  paths: {
    [key: string]: string;
  };
};

// const file = Bun.file(join(process.cwd(), 'config.ts'))
// const config = JSON.parse();
