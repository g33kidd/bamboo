import { Server, ServerWebSocket } from 'bun'
import { join } from 'path'
import * as ncrypto from 'node:crypto'
import { cwd, hrtime } from 'process'
import Action, { action } from '../actions/action'
import ActionGroup from '../actions/group'
import ActionRegistry, { ActionWithParams } from '../actions/registry'
import WebSocketAction from '../actions/websocketAction'
import { BambooConfig } from '../config'
import Endpoint from '../endpoint/Endpoint'
import { loadActionDirectory, parseActionURL } from '../helpers/action'
import Pipe from '../core/pipe'
import RealtimeEngine from './realtime'
import Service from '../core/service'
import fs from 'fs/promises'
import WebSocketEndpoint, {
  WebSocketEndpointData,
} from '../endpoint/WebSocketEndpoint'
import Logger, { createLogAdapter, LogLevel } from '../core/logging'
import PresenceEngine from './presence'
import { exists } from 'fs/promises'
import RateLimitCache from '../extensions/ratelimit'
import Extension from '../core/extension'
import ExtensionContainer from '../core/extensions'
import { ConsoleLogAdapter } from '../core/adapters/logging'
import Bamboo, { engine } from '../..'

export type EngineWebSocketConfig = {
  pipes: Array<Pipe<WebSocketEndpoint>>
  actions: Array<WebSocketAction>
  open?: (ws: ServerWebSocket<WebSocketEndpointData>) => Promise<void> | void
}

export type EngineConfig = {
  pipes?: Array<Pipe<Endpoint>>
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

/**
 * An Engine is responsible for handling the application server, extensions and anything else you might need during development.
 * By default, a default engine is created and exported for you. This is an essential part of Bamboo as it allows other modules to interact with the engine.
 * However, in the future, this will not be a requirement.
 */
export class Engine {
  /**
   * Bun's HTTP Server
   */
  server?: Server

  /**
   * Application HTTP pipe storage
   */
  pipes: Array<Pipe<Endpoint>> = []

  /**
   * Application configuration
   */
  config: ApplicationConfig

  /**
   * HTTP Action Registry
   */
  registry: ActionRegistry = new ActionRegistry()

  /**
   * Extension storage
   */
  // extensions: Map<string, Extension> = new Map()
  extensions: ExtensionContainer = new ExtensionContainer()

  /**
   * Service instance storage
   */
  services: Map<string, Service<any>> = new Map()

  /**
   * Worker threads for CPU-intensive tasks
   * Used for: image processing, data analysis, background jobs, heavy computations
   */
  workers: Map<string, any> = new Map()

  // NOTE: This is not currently used, and probably never will be.
  // workers: Map<string, Worker> = new Map()

  /**
   * Engine logging service
   */
  logging: Logger = new Logger()

  // NOTE: This was supposed to be for realtime rooms, but this is a WIP.
  // rooms: RoomService = new RoomService();
  // rooms: Map<string, Room> = new Map();

  // Rate Limiting
  limiters: Map<string, EngineLimiter> = new Map()
  limiterCache?: RateLimitCache = new RateLimitCache()
  // This needs to support an external service like redis.
  // TODO: It also needs to be separate from this, ie, not in the main Engine.
  // NOTE: This is already done?

  /**
   * WebSocket configuration for the engine
   */
  websocket?: EngineWebSocketConfig

  /**
   * Realtime engine that powers realtime/websocket requests
   */
  realtime: RealtimeEngine = new RealtimeEngine()

  /**
   * Presence engine
   */
  presence: PresenceEngine = new PresenceEngine()

  /**
   * Simple view mounting system to replace edge.js
   * 
   * TODO: Add template rendering capabilities as needed
   */
  views: ViewMount = new ViewMount()

  /**
   * Unique identifier for the current engine instance.
   */
  readonly instanceId: string = Buffer.from(ncrypto.randomBytes(32).buffer).toString('base64', 8)

  constructor(appConfig: ApplicationConfig, config: EngineConfig) {
    this.config = appConfig
    this.config.pathMap = new Map()

    // TODO: rate limiter configuration should be in the configuration section
    this.limiterCache?.loadFromCacheFile()

    // Register the development console.log logger in development mode.
    if (process.env.NODE_ENV === 'development') {
      this.logging.register(ConsoleLogAdapter)
      this.logging.setLevel(LogLevel.DEBUG)
    } else {
      this.logging.register(ConsoleLogAdapter)
      this.logging.setLevel(LogLevel.INFO)
    }
  }

  /**
   * Path mapping for static assets.
   */
  mapPath(from: string, to: string) {
    if (this.config.pathMap) {
      this.config.pathMap.set(from, to)
    }

    return this
  }

  /**
   * Configures the engine based on the EngineConfig passed in.
   */
  async configure(config?: EngineConfig) {
    if (config) {
      if (!this.config.pathMap) {
        this.config.pathMap = new Map<string, string>()
      }

      // console.log(this.config.paths);
      this.views.mount(this.config.paths.views)

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
          this.addActions(config.actions)
        }
      }

      // Register actions from the application directory, if it exists in the current folder
      // TODO: This still needs some work in order to properly load the actions.
      // I suppose at this point it's quite similar to rails in the sense that we
      // have "actions" and such. Whatever, keep going on this idea I guess.
      //
      // loadActionDirectory(this.config.paths.root)

      // Copy from the configuration into the engine.
      if (config.websocket) {
        this.websocket = config.websocket
        if (this.websocket.actions.length > 0) {
          for (let i = 0; i < this.websocket.actions.length; i++) {
            this.realtime.actions.action(this.websocket.actions[i])
          }
        }
      }
    } else {
      this.logging.info('No EngineConfig provided, using convention over configuration')

      // Convention over configuration - auto-discover from common directory structures
      await this.loadConventionBasedConfiguration()
    }

    return this
  }

  /**
   * Loads configuration based on common conventions
   * Follows a Rails-like structure for easy onboarding
   */
  private async loadConventionBasedConfiguration() {
    const rootDir = cwd()

    // Common directory patterns to check
    const conventions = {
      actions: ['actions', 'src/actions', 'app/actions', 'routes'],
      pipes: ['pipes', 'src/pipes', 'app/pipes', 'middleware'],
      services: ['services', 'src/services', 'app/services'],
      views: ['views', 'src/views', 'app/views', 'templates'],
      workers: ['workers', 'src/workers', 'app/workers'],
      websocket: ['websocket', 'src/websocket', 'app/websocket', 'ws']
    }

    this.logging.info('Auto-discovering configuration from:', rootDir)

    // Load actions
    await this.loadActionsFromConvention(rootDir, conventions.actions)

    // Load pipes
    await this.loadPipesFromConvention(rootDir, conventions.pipes)

    // Load services
    await this.loadServicesFromConvention(rootDir, conventions.services)

    // Load views
    await this.loadViewsFromConvention(rootDir, conventions.views)

    // Load workers
    await this.loadWorkersFromConvention(rootDir, conventions.workers)

    // Load WebSocket configuration
    await this.loadWebSocketFromConvention(rootDir, conventions.websocket)
  }

  /**
   * Auto-discovers and loads actions from common directory patterns
   */
  private async loadActionsFromConvention(rootDir: string, patterns: string[]) {
    for (const pattern of patterns) {
      const actionsDir = join(rootDir, pattern)
      if (await exists(actionsDir)) {
        this.logging.info(`Found actions directory: ${pattern}`)

        try {
          const actions = await this.discoverActions(actionsDir)
          this.addActions(actions)
          this.logging.info(`Loaded ${actions.length} actions from ${pattern}`)
          return // Found and loaded, no need to check other patterns
        } catch (error) {
          this.logging.warn(`Failed to load actions from ${pattern}:`, error)
        }
      }
    }

    this.logging.info('No actions directory found, skipping action loading')
  }

  /**
   * Auto-discovers and loads pipes from common directory patterns
   */
  private async loadPipesFromConvention(rootDir: string, patterns: string[]) {
    for (const pattern of patterns) {
      const pipesDir = join(rootDir, pattern)
      if (await exists(pipesDir)) {
        this.logging.info(`Found pipes directory: ${pattern}`)

        try {
          const pipes = await this.discoverPipes(pipesDir)
          this.pipes.push(...pipes)
          this.logging.info(`Loaded ${pipes.length} pipes from ${pattern}`)
          return
        } catch (error) {
          this.logging.warn(`Failed to load pipes from ${pattern}:`, error)
        }
      }
    }

    this.logging.info('No pipes directory found, skipping pipe loading')
  }

  /**
   * Auto-discovers and loads services from common directory patterns
   */
  private async loadServicesFromConvention(rootDir: string, patterns: string[]) {
    for (const pattern of patterns) {
      const servicesDir = join(rootDir, pattern)
      if (await exists(servicesDir)) {
        this.logging.info(`Found services directory: ${pattern}`)

        try {
          const services = await this.discoverServices(servicesDir)
          for (const service of services) {
            this.services.set(service.name, service.instance)
          }
          this.logging.info(`Loaded ${services.length} services from ${pattern}`)
          return
        } catch (error) {
          this.logging.warn(`Failed to load services from ${pattern}:`, error)
        }
      }
    }

    this.logging.info('No services directory found, skipping service loading')
  }

  /**
   * Auto-discovers and loads views from common directory patterns
   */
  private async loadViewsFromConvention(rootDir: string, patterns: string[]) {
    for (const pattern of patterns) {
      const viewsDir = join(rootDir, pattern)
      if (await exists(viewsDir)) {
        this.logging.info(`Found views directory: ${pattern}`)

        try {
          this.views.mount(viewsDir)
          this.logging.info(`Mounted views from ${pattern}`)
          return
        } catch (error) {
          this.logging.warn(`Failed to mount views from ${pattern}:`, error)
        }
      }
    }

    this.logging.info('No views directory found, skipping view loading')
  }

  /**
   * Auto-discovers and loads workers from common directory patterns
   */
  private async loadWorkersFromConvention(rootDir: string, patterns: string[]) {
    for (const pattern of patterns) {
      const workersDir = join(rootDir, pattern)
      if (await exists(workersDir)) {
        this.logging.info(`Found workers directory: ${pattern}`)

        try {
          const workers = await this.discoverWorkers(workersDir)
          for (const [name, scriptPath] of workers) {
            this.createWorker(name, scriptPath)
          }
          this.logging.info(`Loaded ${workers.size} workers from ${pattern}`)
          return
        } catch (error) {
          this.logging.warn(`Failed to load workers from ${pattern}:`, error)
        }
      }
    }

    this.logging.info('No workers directory found, skipping worker loading')
  }

  /**
   * Auto-discovers and loads WebSocket configuration from common directory patterns
   */
  private async loadWebSocketFromConvention(rootDir: string, patterns: string[]) {
    for (const pattern of patterns) {
      const wsDir = join(rootDir, pattern)
      if (await exists(wsDir)) {
        this.logging.info(`Found WebSocket directory: ${pattern}`)

        try {
          const wsConfig = await this.discoverWebSocketConfig(wsDir)
          if (wsConfig) {
            this.websocket = wsConfig
            this.logging.info(`Loaded WebSocket configuration from ${pattern}`)
          }
          return
        } catch (error) {
          this.logging.warn(`Failed to load WebSocket config from ${pattern}:`, error)
        }
      }
    }

    this.logging.info('No WebSocket directory found, skipping WebSocket loading')
  }

  /**
   * Discovers action files and loads them
   */
  private async discoverActions(actionsDir: string): Promise<any[]> {
    const actions: any[] = []
    const files = await fs.readdir(actionsDir, { withFileTypes: true })

    for (const file of files) {
      if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.js'))) {
        try {
          const actionPath = join(actionsDir, file.name)
          const actionModule = await import(actionPath)

          // Handle different export patterns
          if (actionModule.default) {
            if (Array.isArray(actionModule.default)) {
              actions.push(...actionModule.default)
            } else {
              actions.push(actionModule.default)
            }
          } else if (actionModule.actions) {
            actions.push(...actionModule.actions)
          }
        } catch (error) {
          this.logging.warn(`Failed to load action from ${file.name}:`, error)
        }
      }
    }

    return actions
  }

  /**
   * Discovers pipe files and loads them
   */
  private async discoverPipes(pipesDir: string): Promise<any[]> {
    const pipes: any[] = []
    const files = await fs.readdir(pipesDir, { withFileTypes: true })

    for (const file of files) {
      if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.js'))) {
        try {
          const pipePath = join(pipesDir, file.name)
          const pipeModule = await import(pipePath)

          if (pipeModule.default) {
            if (Array.isArray(pipeModule.default)) {
              pipes.push(...pipeModule.default)
            } else {
              pipes.push(pipeModule.default)
            }
          }
        } catch (error) {
          this.logging.warn(`Failed to load pipe from ${file.name}:`, error)
        }
      }
    }

    return pipes
  }

  /**
   * Discovers service files and loads them
   */
  private async discoverServices(servicesDir: string): Promise<any[]> {
    const services: any[] = []
    const files = await fs.readdir(servicesDir, { withFileTypes: true })

    for (const file of files) {
      if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.js'))) {
        try {
          const servicePath = join(servicesDir, file.name)
          const serviceModule = await import(servicePath)

          if (serviceModule.default) {
            const serviceName = file.name.replace(/\.(ts|js)$/, '')
            services.push({
              name: serviceName,
              instance: serviceModule.default
            })
          }
        } catch (error) {
          this.logging.warn(`Failed to load service from ${file.name}:`, error)
        }
      }
    }

    return services
  }

  /**
   * Discovers worker files and loads them
   */
  private async discoverWorkers(workersDir: string): Promise<Map<string, string>> {
    const workers = new Map<string, string>()
    const files = await fs.readdir(workersDir, { withFileTypes: true })

    for (const file of files) {
      if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.js'))) {
        const workerName = file.name.replace(/\.(ts|js)$/, '')
        const workerPath = join(workersDir, file.name)
        workers.set(workerName, workerPath)
      }
    }

    return workers
  }

  /**
   * Discovers WebSocket configuration
   */
  private async discoverWebSocketConfig(wsDir: string): Promise<EngineWebSocketConfig | null> {
    const configFile = join(wsDir, 'config.ts')
    if (await exists(configFile)) {
      try {
        const configModule = await import(configFile)
        return configModule.default || configModule.config
      } catch (error) {
        this.logging.warn(`Failed to load WebSocket config:`, error)
      }
    }

    // Try to auto-discover WebSocket actions
    const actions = await this.discoverActions(wsDir)
    if (actions.length > 0) {
      return {
        actions,
        pipes: []
      }
    }

    return null
  }

  /**
   * Adds actions/groups to the action registry
   */
  addActions(actions: (Action | ActionGroup)[]) {
    for (let a = 0; a < actions.length; a++) {
      const actionOrGroup = actions[a]
      // Adds a new ActionGroup to the action registry.
      if (actionOrGroup instanceof ActionGroup) {
        this.registry.group(actionOrGroup)
      }

      // Adds a single Action into the action registry.
      if (actionOrGroup instanceof Action) {
        this.registry.action(actionOrGroup)
      }
    }
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

  /**
   * Starts the application server.
   */
  serve() {
    const engine = this

    if (typeof this.server === 'undefined') {
      // Start periodic cleanup of rate limit cache to prevent memory leaks
      if (this.limiterCache) {
        setInterval(async () => {
          await this.limiterCache?.cleanup()
          this.logging.debug('Rate limit cache cleanup completed')
        }, 5 * 60 * 1000) // Clean up every 5 minutes
      }

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

            // TOOD: This shouldn't be required automatically, make it an extension?
            ws.subscribe(`client:${token}`)
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

  /**
   * Handles websocket pipes for an incoming request.
   */
  async handleWebSocketPipes(endpoint: WebSocketEndpoint) {
    if (this.websocket?.pipes) {
      for (let i = 0; i < this.websocket?.pipes.length; i++) {
        endpoint = await this.websocket.pipes[i].handle(endpoint)
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

  /**
   * Handles an incoming request
   */
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

  /**
   * Handles an action for an incoming request
   */
  async handleAction(endpoint: Endpoint) {
    const parsedPath = parseActionURL(endpoint)
    const { action, params }: ActionWithParams = this.registry.parse(
      endpoint.request.method,
      parsedPath,
    )

    if (!action) {
      return endpoint.status(404)
    } else {
      endpoint.params = params
      
      // Ensure JSON body is parsed for POST/PUT/PATCH requests
      await endpoint.ensureJsonParsed()
      
      endpoint = await action.handle(endpoint)
    }

    return endpoint
  }

  /**
   * Checks if a context's ratelimit has been exceeded.
   *
   * @param context The rate limit context (e.g., 'api:requests', 'chat:messages')
   * @param limit Number of requests allowed within the interval
   * @param interval Interval in milliseconds (default: 1 minute)
   * @returns true if rate limit is exceeded, false otherwise
   */
  async ratelimit(
    context: string,
    limit: number = 60,
    interval: number = 1000 * 60,
  ): Promise<boolean> {
    const limiterContext = context.split('/')[0] // removes the IP hash from the context.
    const limiter = this.limiters.get(limiterContext)

    // Create a limiter if there is none specified at Engine start.
    if (!limiter) {
      this.limiter(limiterContext, limit, interval)
    }

    // Initialize rate limit cache if not exists
    if (!this.limiterCache) {
      this.limiterCache = new RateLimitCache()
    }

    // Track the request with proper interval handling
    const limitRecord = await this.limiterCache.track(context, interval)

    // Check if rate limit is exceeded
    const isExceeded = limitRecord.current > limit

    if (isExceeded) {
      this.logging.warn('Rate limit exceeded', {
        context,
        current: limitRecord.current,
        limit,
        interval,
        timeSinceFirst: Date.now() - limitRecord.timestamp,
      })
    }

    return isExceeded
  }

  /**
   * Creates a limiter.
   *
   * @param context The ratelimit context.
   * @param limit Number of requests allowed.
   * @param interval Interval in which the limit is allowed.
   */
  limiter(context: string, limit: number = 60, interval: number = 1000 * 60) {
    this.limiters?.set(context, {
      amount: limit,
      perIntervalMs: interval,
    })
  }

  /**
   * Gets rate limit information for a context
   * 
   * @param context The rate limit context
   * @returns Rate limit information including remaining requests and reset time
   */
  async getRateLimitInfo(context: string) {
    if (!this.limiterCache) {
      return null
    }

    const limiterContext = context.split('/')[0]
    const limiter = this.limiters.get(limiterContext)

    if (!limiter) {
      return null
    }

    const remaining = await this.limiterCache.getRemaining(context, limiter.amount)
    const resetTime = await this.limiterCache.getResetTime(context)

    return {
      context,
      limit: limiter.amount,
      interval: limiter.perIntervalMs,
      remaining,
      resetTime,
      resetTimeSeconds: Math.ceil(resetTime / 1000)
    }
  }

  /**
   * Handles global application pipes for HTTP actions
   */
  async handlePipes(endpoint: Endpoint) {
    for (let index = 0; index < this.pipes.length; index++) {
      const pipe = this.pipes[index]
      endpoint = await pipe.handle(endpoint)
    }

    return endpoint
  }

  /**
   * Registers an extension within the engine
   *
   * At the moment I can't think of anything else to add to this until I start
   * setting up an extension with the engine first. I don't know what else I need
   * besides a few hooks.
   */
  extend(extension: Extension | Function) {
    if (typeof extension === 'function') {
      extension()
    } else {
      this.extensions.add(extension)
    }
  }

  /**
   * Creates and registers a new worker
   */
  createWorker(name: string, scriptPath: string, options?: any): any {
    if (this.workers.has(name)) {
      this.logging.warn(`Worker '${name}' already exists, terminating existing worker`)
      this.terminateWorker(name)
    }

    const worker = new Worker(scriptPath, options)
    this.workers.set(name, worker)

    worker.onerror = (error) => {
      this.logging.error(`Worker '${name}' error:`, error)
    }

    worker.onmessage = (message) => {
      this.logging.debug(`Worker '${name}' message:`, message.data)
    }

    this.logging.info(`Worker '${name}' created successfully`)
    return worker
  }

  /**
   * Terminates a specific worker
   */
  terminateWorker(name: string): boolean {
    const worker = this.workers.get(name)
    if (worker) {
      worker.terminate()
      this.workers.delete(name)
      this.logging.info(`Worker '${name}' terminated`)
      return true
    }
    return false
  }

  /**
   * Terminates all workers
   */
  terminateAllWorkers(): void {
    for (const [name, worker] of this.workers) {
      worker.terminate()
      this.logging.info(`Worker '${name}' terminated`)
    }
    this.workers.clear()
  }

  /**
   * Gets a worker by name
   */
  getWorker(name: string): any {
    return this.workers.get(name)
  }

  /**
   * Sends a message to a specific worker
   */
  sendToWorker(name: string, message: any): boolean {
    const worker = this.workers.get(name)
    if (worker) {
      worker.postMessage(message)
      return true
    }
    this.logging.warn(`Worker '${name}' not found`)
    return false
  }

  /**
   * Gets debug information about all registered routes and WebSocket actions
   */
  getDebugInfo() {
    const httpRoutes: Array<{ method: string; path: string; definition: string }> = []
    const wsActions: Array<{ event: string; definition: string }> = []

    // Collect HTTP routes from the action registry
    for (const [method, methodStore] of this.registry.store) {
      this.collectRoutes(methodStore, method, [], httpRoutes)
    }

    // Collect WebSocket actions
    if (this.websocket?.actions) {
      for (const [event, action] of this.realtime.actions.store) {
        wsActions.push({
          event,
          definition: action.definition,
        })
      }
    }

    return {
      httpRoutes: httpRoutes.sort((a, b) => a.path.localeCompare(b.path)),
      wsActions: wsActions.sort((a, b) => a.event.localeCompare(b.event)),
      totalHttpRoutes: httpRoutes.length,
      totalWsActions: wsActions.length,
      services: Array.from(this.services.keys()),
      pipes: this.pipes.length,
      wsPipes: this.websocket?.pipes?.length || 0,
    }
  }

  /**
   * Recursively collects routes from the action registry
   */
  private collectRoutes(
    store: Map<string, any> | Action,
    method: string,
    currentPath: string[],
    routes: Array<{ method: string; path: string; definition: string }>,
  ) {
    if (store instanceof Action) {
      routes.push({
        method,
        path: '/' + currentPath.join('/'),
        definition: store.definition,
      })
    } else if (store instanceof Map) {
      for (const [key, value] of store) {
        if (key !== '__root') {
          this.collectRoutes(value, method, [...currentPath, key], routes)
        }
      }
    }
  }
}

/**
 * Simple view mounting system to replace edge.js
 */
class ViewMount {
  private mountedPaths: Set<string> = new Set()
  private templateCache: Map<string, string> = new Map()

  mount(path: string) {
    this.mountedPaths.add(path)
  }

  getMountedPaths(): string[] {
    return Array.from(this.mountedPaths)
  }

  isMounted(path: string): boolean {
    return this.mountedPaths.has(path)
  }

  /**
   * Render a template with variable injection and basic conditionals
   */
  async render(templatePath: string, data: Record<string, any> = {}): Promise<string> {
    // Check cache first
    if (this.templateCache.has(templatePath)) {
      return this.processTemplate(this.templateCache.get(templatePath)!, data)
    }

    // Find template in mounted paths
    for (const mountedPath of this.mountedPaths) {
      let fullPath = join(mountedPath, templatePath)

      try {
        const template = await fs.readFile(fullPath, 'utf-8')
        this.templateCache.set(templatePath, template)
        return this.processTemplate(template, data)
      } catch (error) {
        // If no extension provided, try with .edge extension
        if (!templatePath.includes('.')) {
          const edgePath = join(mountedPath, `${templatePath}.edge`)

          try {
            const template = await fs.readFile(edgePath, 'utf-8')
            this.templateCache.set(templatePath, template)
            return this.processTemplate(template, data)
          } catch (edgeError) {
            // Continue to next mounted path
          }
        }

        // Continue to next mounted path
        continue
      }
    }

    throw new Error(`Template not found: ${templatePath}`)
  }

  /**
   * Process template with variable injection and basic conditionals
   */
  private processTemplate(template: string, data: Record<string, any>): string {
    let result = template

    // Handle variable injection: {{ variable }}
    result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, variable) => {
      return data[variable] !== undefined ? String(data[variable]) : match
    })

    // Handle basic conditionals: @if(condition) ... @else ... @endif
    result = result.replace(/@if\s*\(\s*(\w+)\s*\)([\s\S]*?)(?:@else([\s\S]*?))?@endif/g, (match, condition, ifContent, elseContent) => {
      const value = data[condition]
      const isTruthy = value === true || (typeof value === 'string' && value !== 'false' && value !== '0' && value !== '') || (typeof value === 'number' && value !== 0)

      return isTruthy ? ifContent : (elseContent || '')
    })

    // Handle basic loops: @each(item in items) ... @endeach
    result = result.replace(/@each\s*\(\s*(\w+)\s+in\s+(\w+)\s*\)([\s\S]*?)@endeach/g, (match, itemVar, itemsVar, content) => {
      const items = data[itemsVar]
      if (!Array.isArray(items)) return ''

      return items.map(item => {
        const itemData = { ...data, [itemVar]: item }
        return this.processTemplate(content, itemData)
      }).join('')
    })

    return result
  }

  /**
   * Clear template cache
   */
  clearCache() {
    this.templateCache.clear()
  }
}

// TODO: Load this from a configuration file.
/**
 * The default engine that is provided
 */
const defaultEngine = new Engine(
  {
    paths: {
      root: process.cwd(),
      public: join(process.cwd(), 'static'),
      storage: join(process.cwd(), 'storage'),
      views: join(process.cwd(), 'src', 'views'),
    },
  },
  // TODO: Dynamically import everything required below:
  {},
)

export default defaultEngine
