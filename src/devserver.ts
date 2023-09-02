import { Server, ServerWebSocket, Subprocess } from "bun";
import { join } from "path";
import { Engine } from "..";

// TODO: Finish the devserver implementation.

/**
 * Allows you to run multiple subprocesses and serves the output to each one in its
 * own UI through the webserver at localhost:1337.
 *
 * Work in progress project.
 *
 * The goal here is to allow a developer to run several commands at the same time
 * while specifying a primary entrypoint. This should be used INSIDE a developers application
 * in order to simplify the process of defining what the additional entrypoints are and which ones
 * should only run in development.
 *
 * import {engine} from 'bamboo';
 *
 * devhub(engine, {
 *   "vite":
 *   "prisma:studio": {
 *
 *  }
 * })
 * devmode([
 *  ["vite", "vite", "frontend/"]
 *  ["bunx", ["bunx", "--bun", "prisma", "studio"], ""]
 * ]);
 *
 * engine.configure();
 * engine.serve();
 */

const store = new Map<string, Subprocess>();
const streams = new Map<string, ReadableStream>();
const applications: [name: string, script: string][] = [
  ["app", "src/index.ts"],
  ["watcher", "src/watcher.ts"],
];

let server: Server | null = null;
if (!server)
  server = Bun.serve({
    port: 1337,
    fetch: function (
      this: Server,
      request: Request,
      server: Server
    ): Response | Promise<Response> {
      throw new Error("Function not implemented.");
    },
    websocket: {
      open(ws) {
        ws.subscribe("_main");
      },
      message(
        ws: ServerWebSocket<unknown>,
        message: string | Buffer
      ): void | Promise<void> {
        throw new Error("Function not implemented.");
      },
    },
  });

for (const [name, script] of applications) {
  const scriptPath = join(process.cwd(), script);
  const scriptFile = Bun.file(scriptPath);
  const hasScript = await scriptFile.exists();

  if (!hasScript) {
    console.error(`Could not find '${name}' at ${scriptPath}`);
  } else {
    const proc = Bun.spawn({
      cmd: ["bun", "run", scriptPath],
    });

    streams.set(name, proc.stdout);
    store.set(name, proc);
  }
}

// Reads each stream and publishes each chunk to the WS Server.
await Promise.all(
  Array.from(streams).map(async ([name, stream], index) => {
    for await (const chunk of stream) {
      await Bun.write(Bun.stdout, `[${name}] ${Buffer.from(chunk)}\n`);
      // TODO: Run this to a ws server for the dashboard.
      // server?.publish(
      //   "_main",
      //   JSON.stringify({
      //     process: name,
      //     chunk: Buffer.from(chunk).toString("utf-8"),
      //   })
      // );
    }
  })
);
