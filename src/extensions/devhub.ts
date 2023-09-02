import { Subprocess } from "bun";
import { Engine } from "../engine";

/**
 * DevHub allows the developer of the application to visualize more than
 * just their application output. It allows a developer to interact with their
 * application on a deeper level by creating extensions that hook into the default
 * engine. This is more than just adding routes to an application.
 *
 * During development, something that is often useful is running multiple
 * commands. While this may not be best practice in production, it gives developers
 * the chance to create at light-speed without having to worry about spinning up
 * multiple terminal windows and remembering to start specific services.
 *
 * A few issues that have come up with testing:
 *    It does not reload properly if using --hot or --watch.
 */

type DevHubExtension = DevHubExtensionConfig | string | string[];
type DevHubConfig = { [name: string]: DevHubExtension };
type DevHubExtensionConfig = {
  cmd: string[];
  cwd?: string;
  env?: Record<string, string | undefined> | undefined;
};

// Where we're storing extensions.
const extensions = new Map<
  string,
  [ext: DevHubExtension, proc: Subprocess | null]
>();

// This is used to store streams that are created by extension Subprocesses.
const streams = new Map<string, ReadableStream>();

// Adds each configured extension to the engine and setup endpoints to view the devhub.
export default async function devhub(engine: Engine, options: DevHubConfig) {
  console.log("devhub enabled...");

  if (Object.keys(options).length <= 0) {
    console.info("no devhub extensions found");
    return;
  }

  Object.keys(options).forEach((key) => {
    if (options[key] instanceof Array) {
      // This is expected to be a command such as: ["bunx", "--bun", "vite"]
      const proc = Bun.spawn({
        cmd: options[key] as string[],
        env: { ...process.env },
        onExit(subprocess, exitCode, signalCode, error) {
          Bun.write("./log.txt", error?.stack?.toString() || "exited");
        },
      });
      // proc.unref();
      extensions.set(key, [options[key], proc]);
      streams.set(key, proc.stdout);
    } else if (options[key] instanceof String) {
      // This is expected to be a single command string or path to a file.
      // 1. Check if a file exists with this string.
      //    If so, run 'bun run {cmd}`
    } else {
      // It's a DevHubExtension with explicit configuration options.
      const extension = options[key] as DevHubExtensionConfig;

      if (extension.cmd instanceof Array) {
        const proc = Bun.spawn({
          cmd: extension.cmd,
          cwd: extension.cwd,
          env: { ...process.env, ...extension.env },
        });
        // proc.unref();
        extensions.set(key, [options[key], proc]);
        streams.set(key, proc.stdout);
      }
    }
  });

  // process.on("beforeExit", () => {
  //   extensions.forEach((e) => e[1]?.unref());
  //   streams.forEach((s) => s.cancel());
  // });

  await Promise.all(
    Array.from(streams).map(async ([name, stream], index) => {
      for await (const chunk of stream) {
        await Bun.write(Bun.stdout, `[${name}]\n${Buffer.from(chunk)}\n`);
        // TODO: Send this to a ws server for the dashboard.
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
}
