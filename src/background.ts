/**
 * Creates a worker that is run either through a separate process or
 * on a different server entirely. This allows connections to be made between
 * the primary application server and a background service.
 *
 * Currently it's called Background, but that will probably change.
 */
export type BackgroundConfig = {
  name: string;
  version: string;
  events: string[];
  // TODO: Make it so that T is the expected properties of the event being sent.
  // events: Map<string, T>;
};

export default class Background {
  name: string;
  version: string;
  events: string[];

  constructor(config: BackgroundConfig) {
    this.name = config.name;
    this.version = config.version;
    this.events = config.events;
  }

  serve() {
    const background = this;
    // Add this to a .bamboo file as to which Background processes are available.
    Bun.listen({
      hostname: "0.0.0.0",
      port: 7432,
      data: {
        service: `${this.name}@${this.version}`,
      },
      socket: {
        open(socket) {
          background.events.forEach((e) => {});
          // emitter.addListener("stamps:deleted", ({ count }) => {
          //   socket.write(
          //     JSON.stringify({ event: "stamps:deleted", data: { count } })
          //   );
          // });
        },
        data(socket, data) {},
      },
    });
  }

  client() {}
}
