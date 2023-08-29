import { hrtime } from "process";
import Endpoint from "./endpoint";
import Pipe from "./pipe";
import Action, { action } from "./actions/action";
import ActionGroup from "./actions/group";
import ActionRegistry, { ActionWithParams } from "./actions/registry";
import { parseActionURL } from "./helpers/action";
import { ServerWebSocket, Serve, Server } from "bun";
import Service from "./service";
import WebSocketEndpoint from "./websocketEndpoint";
import WebSocketPipe from "./websocketPipe";
import WebSocketAction from "./actions/websocketAction";
import { Edge } from "edge.js";
import WebSocketActionRegistry from "./actions/websocketRegistry";
import { join } from "path";

export type EngineWebSocketConfig = {
  pipes: Array<WebSocketPipe>;
  actions: Array<WebSocketAction>;
};

export type EngineConfig = {
  pipes?: Array<Pipe>;
  actions?: Array<Action | ActionGroup>;
  services?: Array<Service<any>>;
  websocket?: EngineWebSocketConfig;
};

export type ApplicationConfig = {
  pathMap?: Map<string, string>;
  paths: {
    root: string;
    public: string;
    storage: string;
    views: string;
  };
};

export type EngineLimiter = {
  amount: number;
  perIntervalMs: number;
};

export class Engine {
  server?: Server;
  pipes: Array<Pipe> = [];
  config: ApplicationConfig;
  actions: Array<Action | ActionGroup> = [];
  registry: ActionRegistry = new ActionRegistry();
  services: Map<string, Service<any>> = new Map();
  workers: Map<string, Worker> = new Map();

  // Rate Limiting
  rateLimiters: Map<string, EngineLimiter>;
  // This needs to support an external service like redis.
  rateCache?: Map<string, number>;

  websocketRegistry?: WebSocketActionRegistry;
  websocketClients: Map<string, any> = new Map<string, any>();
  websocket?: EngineWebSocketConfig;

  edge: Edge;

  // websocketRegistry: WebSocketActionRegistry = new WebSocketActionRegistry();

  configure(config: EngineConfig) {
    if (!this.config.pathMap) {
      this.config.pathMap = new Map<string, string>();
    }

    console.log(this.config.paths);
    this.edge.mount(this.config.paths.views);

    // Copy pipes from the config into the Engine.
    if (config.pipes) {
      if (config.pipes.length > 0) {
        for (let p = 0; p < config.pipes.length; p++) {
          const pipe = config.pipes[p];
          this.pipes.push(pipe);
        }
      }
    }

    // Copy services from the config into the Engine.
    if (config.services) {
      if (config.services.length > 0) {
        for (let i = 0; i < config.services.length; i++) {
          const service = config.services[i];
          this.services.set(service.name, service.instance);
        }
      }
    }

    // Copy actions from the config into the Engine.
    if (config.actions) {
      if (config.actions.length > 0) {
        for (let a = 0; a < config.actions.length; a++) {
          const action = config.actions[a];
          this.actions.push(action);
        }
      }
    }

    // Copy from the configuration into the engine.
    if (config.websocket) {
      this.websocket = config.websocket;
      // Add websocket actions to the wsActions registry.
      if (this.websocket.actions.length > 0) {
        if (!this.websocketRegistry) {
          this.websocketRegistry = new WebSocketActionRegistry();
        }

        for (let i = 0; i < this.websocket.actions.length; i++) {
          this.websocketRegistry.action(this.websocket.actions[i]);
        }
      }
    }

    // Add actions to the action registry.
    for (let a = 0; a < this.actions.length; a++) {
      const actionOrGroup = this.actions[a];

      // Adds a new ActionGroup to the action registry.
      if (actionOrGroup instanceof ActionGroup) {
        this.registry.group(actionOrGroup);
      }

      // Adds a single Action into the action registry.
      if (actionOrGroup instanceof Action) {
        this.registry.action(actionOrGroup);
      }
    }
  }

  constructor(appConfig: ApplicationConfig, config: EngineConfig) {
    this.rateLimiters = new Map();
    this.config = appConfig;

    // Setup EventEmitter for sending publish requests to the server.

    this.edge = new Edge({ cache: true });

    // TODO: Finish worker setup
    // const worker = new Worker(
    //   new URL("./workers/taskWorker.ts", import.meta.url).href
    // );

    // worker.addEventListener("open", () => {
    //   console.log("worker is ready");
    // });

    // this.workers.set("tasks", worker);
  }

  mapPath(from: string, to: string) {
    if (this.config.pathMap) {
      this.config.pathMap.set(from, to);
    }
  }

  service<T>(name: string): T {
    if (!this.services.has(name)) {
      throw new Error(`Service "${name}" is not a valid service.`);
    }

    return this.services.get(name) as T;
  }

  // ratelimit(config: { [key: string]: EngineLimiter }) {
  //   this.rateLimiters = config;
  //   return this;
  // }

  // Creates an offloaded task that can be completed in the background.
  offload(name: string, task: any): void {
    // const worker = this.workers.get(name);
    // if (worker) {
    //   worker.postMessage({
    //     message: "offload_task",
    //     task,
    //   });
    // }
    // create a new worker if one doesn't exist.
    // determine the status of an existing worker if one does.
    // send a message that describes a function to it.
  }

  // Starts the application server.
  serve() {
    const engine = this;
    const hostname = process.env.HOST_NAME || "localhost";
    const port = process.env.PORT || 3000;

    if (typeof this.server === "undefined") {
      this.server = Bun.serve({
        hostname,
        port,
        async fetch(request: Request, server: Server) {
          const endpoint = new Endpoint(request);

          // Only attempt to upgrade the connection if the pathname includes "/ws".
          if (endpoint.url.pathname.includes("/ws")) {
            if (endpoint.url.searchParams.get("token") !== null) {
              if (
                server.upgrade(request, {
                  data: {
                    token: endpoint.url.searchParams.get("token"),
                  },
                })
              ) {
                return;
              }
            }
          }

          await engine.handle(endpoint);
          return endpoint.response;
        },
        websocket: {
          async open(ws: ServerWebSocket<undefined>) {
            // This should add this connection to somewhere?
            const endpoint = new WebSocketEndpoint(ws);
            const token = (endpoint.ws.data as any).token;

            // A page refresh might be needed on the client to get a new token.
            if (engine.websocketClients.has(token)) {
              ws.terminate();
              return;
            } else {
              engine.websocketClients.set(token, {});
            }

            ws.subscribe(`client:${token}`);
            ws.send(
              JSON.stringify({
                event: "connected",
                data: { timestamp: Date.now() },
              })
            );
          },
          async close(ws, code, reason) {
            // This function should remove all references to this connection from wherever else they are.
            const endpoint = new WebSocketEndpoint(ws);
            const token = (endpoint.ws.data as any).token;

            if (engine.websocketClients.has(token)) {
              if (engine.websocketClients.delete(token)) {
                // Ensure the connection is terminated.
                // Do I need to terminate any existing connections using this token? Probably...
                // ws.publish(token, { event: "terminate" });
                ws.terminate();
              }
            } else {
              ws.terminate();
            }
          },
          async message(
            ws: ServerWebSocket<undefined>,
            message: string | Buffer
          ): Promise<void> {
            if (message.length === 0) return;
            let endpoint = new WebSocketEndpoint(ws, message);
            // Pipes run before the actions and can modify the endpoint.
            endpoint = await engine.handleWebSocketPipes(endpoint);
            // Actions do not directly modify the endpoint, so it only needs to take action on the endpoint.
            await engine.handleWebSocketAction(endpoint);
          },
        },
      });
    }

    return this;
  }

  // Handles a websocket pipe for an incoming request.
  async handleWebSocketPipes(endpoint: WebSocketEndpoint) {
    if (this.websocket?.pipes) {
      for (let i = 0; i < this.websocket?.pipes.length; i++) {
        const pipe = this.websocket.pipes[i];
        endpoint = await pipe.handle(endpoint);
      }
    }

    return endpoint;
  }

  // Handles a websocket action for an incoming request.
  async handleWebSocketAction(endpoint: WebSocketEndpoint) {
    if (this.websocketRegistry && endpoint.parsedMessage) {
      const action = this.websocketRegistry.parse(endpoint.parsedMessage);
      if (action !== null) {
        endpoint = await action.handle(endpoint);
      }
    }

    endpoint.timeEnd = hrtime.bigint();
    endpoint.debug();

    return endpoint;
  }

  // Handles an incoming request.
  async handle(endpoint: Endpoint) {
    endpoint = await this.handlePipes(endpoint);
    endpoint = await this.handleAction(endpoint);

    if (!endpoint.response) {
      endpoint.status(500);
    }

    endpoint.timeEnd = hrtime.bigint();
    endpoint.debug();
    return endpoint;
  }

  // Handles an action for an incoming request.
  async handleAction(endpoint: Endpoint) {
    const parsedPath = parseActionURL(endpoint);
    const { action, params }: ActionWithParams = this.registry.parse(
      endpoint.request.method,
      parsedPath
    );

    if (!action) {
      return endpoint.status(404);
    } else {
      endpoint.params = params;
      endpoint = await action.handle(endpoint);
    }

    return endpoint;
  }

  /**
   * Checks if a context's ratelimit has been exceeded.
   *
   * TODO: Finish this, include the timestamp of the first request & most recent request to determine
   * if the limit should be reset, keep counting, or deny requests.
   */
  ratelimit(
    context: string,
    limit: number = 60,
    interval: number = 1000 * 60
  ): boolean {
    const limiterContext = context.split("/")[0]; // removes the IP hash from the context.
    const limiter = this.rateLimiters.get(limiterContext);

    // Create a limiter if there is none specified at Engine start.
    if (!limiter) {
      this.rateLimiters.set(limiterContext, {
        amount: limit,
        perIntervalMs: interval,
      });
    }

    let now = Date.now();
    let currentAmount = 0;

    if (!this.rateCache) {
      this.rateCache = new Map();
    }

    if (!this.rateCache.has(context)) {
      this.rateCache.set(context, 0);
    } else {
      const current = this.rateCache.get(context);
      if (current) {
        currentAmount = current + 1;
        this.rateCache.set(context, currentAmount);
      }
    }

    if (currentAmount <= limit) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Creates a limiter.
   *
   * @param context The ratelimit context.
   * @param limit Number of requests allowed.
   * @param interval Interval in which the limit is allowed.
   */
  limiter(context: string, limit: number = 60, interval: number = 1000 * 60) {
    this.rateLimiters?.set(context, {
      amount: limit,
      perIntervalMs: interval,
    });
  }

  // Handles global application pipes.
  async handlePipes(endpoint: Endpoint) {
    for (let index = 0; index < this.pipes.length; index++) {
      const pipe = this.pipes[index];
      endpoint = await pipe.handle(endpoint);
    }

    return endpoint;
  }
}

// NOTE: Does this work with clustering?
// TODO: Load this information from a configuration file.
const defaultEngine = new Engine(
  {
    paths: {
      root: process.cwd(),
      public: join(process.cwd(), "static"),
      storage: join(process.cwd(), "storage"),
      views: join(process.cwd(), "src", "views"),
    },
  },
  {}
);

export default defaultEngine;
