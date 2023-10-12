import { Server, ServerWebSocket } from 'bun'
import { Edge } from 'edge.js'
import { join } from 'path'
import { hrtime } from 'process'
import Action from './actions/action'
import ActionGroup from './actions/group'
import ActionRegistry, { ActionWithParams } from './actions/registry'
import WebSocketAction from './actions/websocketAction'
import { BambooConfig } from './config'
import Endpoint from './endpoint/Endpoint'
import { parseActionURL } from './helpers/action'
import Pipe from './pipe'
import RealtimeEngine from './realtime'
import Service from './service'
import WebSocketEndpoint, {
  WebSocketEndpointData,
} from './endpoint/WebSocketEndpoint'
import WebSocketPipe from './websocketPipe'

export type EngineWebSocketConfig = {
  pipes: Array<WebSocketPipe>
  actions: Array<WebSocketAction>
  open?: (ws: ServerWebSocket<WebSocketEndpointData>) => Promise<void> | void
}

export type EngineConfig = {
  pipes?: Array<Pipe>
  actions?: Array<Action | ActionGroup>
  services?: Array<Service<any>>
  websocket?: EngineWebSocketConfig
}

export type ApplicationConfig = {
  pathMap?: Map<string, string>
  paths: {
    root: string
    public: string
    storage: string
    views: string
  }
}

export type EngineLimiter = {
  amount: number
  perIntervalMs: number
}

// export type Room = {
//   handlers: WebSocketHandler[];
// };

export class Engine {
  server?: Server
  pipes: Array<Pipe> = []
  config: ApplicationConfig
  actions: Array<Action | ActionGroup> = []
  registry: ActionRegistry = new ActionRegistry()
  services: Map<string, Service<any>> = new Map()
  workers: Map<string, Worker> = new Map()
  // rooms: RoomService = new RoomService();

  // rooms: Map<string, Room> = new Map();

  // Rate Limiting
  rateLimiters: Map<string, EngineLimiter>
  // This needs to support an external service like redis.
  // TODO: It also needs to be separate from this, ie, not in the main Engine.
  rateCache?: Map<string, number>

  websocket?: EngineWebSocketConfig
  realtime: RealtimeEngine = new RealtimeEngine()

  edge: Edge

  constructor(appConfig: ApplicationConfig, config: EngineConfig) {
    this.rateLimiters = new Map()
    this.config = appConfig
    this.config.pathMap = new Map()
    this.edge = new Edge({ cache: true })
  }

  mapPath(from: string, to: string) {
    if (this.config.pathMap) {
      this.config.pathMap.set(from, to)
    }

    return this
  }

  /**
   * Configures the engine based on the EngineConfig passed in.
   */
  configure(config: EngineConfig) {
    if (!this.config.pathMap) {
      this.config.pathMap = new Map<string, string>()
    }

    // console.log(this.config.paths);
    this.edge.mount(this.config.paths.views)

    // Copy pipes from the config into the Engine.
    if (config.pipes) {
      if (config.pipes.length > 0) {
        for (let p = 0; p < config.pipes.length; p++) {
          const pipe = config.pipes[p]
          this.pipes.push(pipe)
        }
      }
    }

    // Copy services from the config into the Engine.
    if (config.services) {
      if (config.services.length > 0) {
        for (let i = 0; i < config.services.length; i++) {
          const service = config.services[i]
          this.services.set(service.name, service.instance)
        }
      }
    }

    // Copy actions from the config into the Engine.
    if (config.actions) {
      if (config.actions.length > 0) {
        for (let a = 0; a < config.actions.length; a++) {
          const action = config.actions[a]
          this.actions.push(action)
        }
      }
    }

    // Copy from the configuration into the engine.
    if (config.websocket) {
      this.websocket = config.websocket
      if (this.websocket.actions.length > 0) {
        for (let i = 0; i < this.websocket.actions.length; i++) {
          this.realtime.actions.action(this.websocket.actions[i])
        }
      }
    }

    // Add actions to the action registry.
    for (let a = 0; a < this.actions.length; a++) {
      const actionOrGroup = this.actions[a]

      // Adds a new ActionGroup to the action registry.
      if (actionOrGroup instanceof ActionGroup) {
        this.registry.group(actionOrGroup)
      }

      // Adds a single Action into the action registry.
      if (actionOrGroup instanceof Action) {
        this.registry.action(actionOrGroup)
      }
    }

    // TODO: Create a debug method in registry to display ALL available paths.
    console.log(this.registry)

    return this
  }

  /**
   * Startup
   */
  configureWithDefaults(config: BambooConfig) {
    /// 1. Get the path of the configuration file.
    //    OR pass in the configuration file.
    /// 2. Do .configure with that information.
    /// 3.

    // const configLocation = configPath ? configPath : join(cwd())
    // const configFile = Bun.file(join(configLocation, 'config.'))
    // const config = JSON.parse()

    return this
  }

  /**
   * Returns an instance of a service.
   */
  service<T>(name: string): T {
    if (!this.services.has(name)) {
      throw new Error(`Service "${name}" is not a valid service.`)
    }

    return this.services.get(name) as T
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
    const engine = this

    if (typeof this.server === 'undefined') {
      this.server = Bun.serve({
        hostname: process.env.HOSTNAME || '0.0.0.0',
        port: Number(process.env.PORT) || 3000,
        async fetch(request: Request, server: Server) {
          const endpoint = new Endpoint(request)

          // Only attempt to upgrade the connection if the pathname includes "/ws".
          if (endpoint.url.pathname.includes('/ws')) {
            if (endpoint.url.searchParams.get('token') !== null) {
              if (
                server.upgrade(request, {
                  data: {
                    token: endpoint.url.searchParams.get('token'),
                  },
                })
              ) {
                return
              }
            }
          }

          await engine.handle(endpoint)
          return endpoint.response
        },
        websocket: {
          async open(ws: ServerWebSocket<WebSocketEndpointData>) {
            // This should add this connection to somewhere?
            const endpoint = new WebSocketEndpoint(ws)
            const token = endpoint.getToken()

            /**
             * This token should also be shuffled. If an attacker gets access to the token
             * for a user then they might be able to wiggle their way in? More research is
             * needed here for sure.
             */
            if (engine.realtime.clients.has(token)) {
              ws.terminate()
              return
            } else {
              engine.realtime.clients.set(token, {})
            }

            ws.subscribe(`client:${token}`)

            // TOOD: We should probably setup a token here that can be used alongside restamping.
            ws.send(
              JSON.stringify({
                event: 'connected',
                data: { timestamp: Date.now() },
              }),
            )

            // Open hook is run after the initial 'connected' event is sent.
            if (engine.websocket?.open) {
              if (engine.websocket.open instanceof Promise) {
                await engine.websocket.open(ws)
              } else {
                engine.websocket.open(ws)
              }
            }
          },
          async close(ws, code, reason) {
            // This function should remove all references to this connection from wherever else they are.
            const endpoint = new WebSocketEndpoint(ws)
            const token = (endpoint.ws.data as any).token

            if (engine.realtime.clients.has(token)) {
              if (engine.realtime.clients.delete(token)) {
                // Ensure the connection is terminated.
                // Do I need to terminate any existing connections using this token? Probably...
                // ws.publish(token, { event: "terminate" });
                ws.terminate()
              }
            } else {
              ws.terminate()
            }
          },
          async message(
            ws: ServerWebSocket<any>,
            message: string | Buffer,
          ): Promise<void> {
            if (message.length === 0) return
            let endpoint = new WebSocketEndpoint(ws, message)
            // TODO: Don't run anything if the response is locked. This requires an explicit call to lock()
            // if (!endpoint.locked) {
            // Pipes run before the actions and can modify the endpoint or terminate it.
            endpoint = await engine.handleWebSocketPipes(endpoint)
            // Actions do not directly modify the endpoint, so it only needs to take action on the endpoint.
            await engine.handleWebSocketAction(endpoint)
            // }
          },
        },
      })
    }

    return this
  }

  // Handles a websocket pipe for an incoming request.
  async handleWebSocketPipes(endpoint: WebSocketEndpoint) {
    if (this.websocket?.pipes) {
      for (let i = 0; i < this.websocket?.pipes.length; i++) {
        const pipe = this.websocket.pipes[i]
        if (process.env.NODE_ENV === 'development') {
          console.log(`[wsPipe:${pipe.name}]`)
        }
        endpoint = await pipe.handle(endpoint)
      }
    }

    return endpoint
  }

  /**
   * Handles a websocket action for an incoming message on an active websocket connection.
   */
  async handleWebSocketAction(endpoint: WebSocketEndpoint) {
    // const roomParam = endpoint.param('room', null)

    // TODO: Finish rooms implementation.
    // if (roomParam && this.realtime.rooms.has(roomParam)) {
    //   const room = this.realtime.rooms.get(roomParam)
    //   const event = endpoint.param('event', null)
    // } else {
    if (this.realtime.actions.store && endpoint.parsedMessage) {
      const action = this.realtime.actions.parse(endpoint.parsedMessage)
      if (action !== null) {
        endpoint = await action.handle(endpoint)
      }
    }
    // }

    endpoint.timeEnd = hrtime.bigint()
    endpoint.debug()

    return endpoint
  }

  // Handles an incoming request.
  async handle(endpoint: Endpoint) {
    endpoint = await this.handlePipes(endpoint)
    endpoint = await this.handleAction(endpoint)

    if (!endpoint.response) {
      endpoint.status(500)
    }

    endpoint.timeEnd = hrtime.bigint()
    endpoint.debug()
    return endpoint
  }

  // Handles an action for an incoming request.
  async handleAction(endpoint: Endpoint) {
    const parsedPath = parseActionURL(endpoint)
    console.log(parsedPath)
    const { action, params }: ActionWithParams = this.registry.parse(
      endpoint.request.method,
      parsedPath,
    )

    if (!action) {
      return endpoint.status(404)
    } else {
      endpoint.params = params
      endpoint = await action.handle(endpoint)
    }

    return endpoint
  }

  /**
   * Checks if a context's ratelimit has been exceeded.
   *
   * TODO: Finish this, include the timestamp of the first request & most recent request to determine
   * if the limit should be reset, keep counting, or deny requests.
   *
   * TODO: Move this.
   */
  ratelimit(
    context: string,
    limit: number = 60,
    interval: number = 1000 * 60,
  ): boolean {
    const limiterContext = context.split('/')[0] // removes the IP hash from the context.
    const limiter = this.rateLimiters.get(limiterContext)

    // Create a limiter if there is none specified at Engine start.
    if (!limiter) {
      this.rateLimiters.set(limiterContext, {
        amount: limit,
        perIntervalMs: interval,
      })
    }

    // let now = Date.now()
    let currentAmount = 0

    if (!this.rateCache) {
      this.rateCache = new Map()
    }

    if (!this.rateCache.has(context)) {
      this.rateCache.set(context, 0)
    } else {
      const current = this.rateCache.get(context)
      if (current) {
        currentAmount = current + 1
        this.rateCache.set(context, currentAmount)
      }
    }

    if (currentAmount <= limit) {
      return false
    } else {
      return true
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
    })
  }

  // Handles global applic ation pipes.
  async handlePipes(endpoint: Endpoint) {
    for (let index = 0; index < this.pipes.length; index++) {
      const pipe = this.pipes[index]
      endpoint = await pipe.handle(endpoint)
    }

    return endpoint
  }
}

// TODO: Load this information from a configuration file.
const defaultEngine = new Engine(
  {
    paths: {
      root: process.cwd(),
      public: join(process.cwd(), 'static'),
      storage: join(process.cwd(), 'storage'),
      views: join(process.cwd(), 'src', 'views'),
    },
  },
  {},
)

export default defaultEngine
