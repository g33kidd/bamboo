# 🎍 Bamboo API Documentation

Welcome to the Bamboo API documentation!  
Bamboo is a modern, AI-friendly web framework for [Bun.sh](https://bun.sh), designed for rapid development of HTTP and WebSocket applications.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [Engine](#engine)
- [Endpoints](#endpoints)
  - [HTTP Endpoint](#http-endpoint)
  - [WebSocket Endpoint](#websocket-endpoint)
- [Actions](#actions)
- [Helpers & Utilities](#helpers--utilities)
- [Extensions](#extensions)
- [Examples](#examples)
- [Developer Notes](#developer-notes)

---

## Getting Started

Install Bamboo via your preferred method (see main README for details).

```ts
import { engine } from 'bamboo'
```

---

## Core Concepts

- **Engine:** The main application server and orchestrator.
- **Endpoint:** Represents a single HTTP or WebSocket request/connection.
- **Action:** A handler for a specific route or event.
- **Pipes:** Middleware for processing requests.
- **Extensions:** Plugins to extend Bamboo's capabilities.

---

## Engine

The `Engine` class is the heart of Bamboo.

### Creating/Configuring the Engine

```ts
import { Engine } from 'bamboo'

const appConfig = {
  paths: {
    root: process.cwd(),
    public: './public',
    storage: './storage',
    views: './views'
  }
}

const config = {
  actions: [/* ... */],
  pipes: [/* ... */],
  websocket: { /* ... */ }
}

const engine = new Engine(appConfig, config)
await engine.configure(config)
engine.serve()
```

#### Key Engine Methods

- `mapPath(from, to)`: Map static asset paths.
- `addActions(actions)`: Register HTTP/WebSocket actions.
- `service(name)`: Access a registered service.
- `ratelimit(context, limit, interval)`: Apply rate limiting.
- `extend(extension)`: Register an extension.

---

## Endpoints

### HTTP Endpoint

The `Endpoint` class represents an HTTP request/response.

#### Common Methods

- `header(name, defaultValue?)`: Get a request header.
- `param(key, defaultValue?)`: Get a parameter from JSON body or search params.
- `search(key, defaultValue?)`: Get a query parameter.
- `all()`: Get all parameters.
- `view(path, params?)`: Render an Edge.js template.
- `file(path)`: Send a file as response.
- `json(data, status?, statusText?)`: Send a JSON response.
- `status(code, text?)`: Set response status.
- `debug()`: Log debug info.

#### Example (TypeScript, actionGroup style)

```ts
import { actionGroup, get, post, Endpoint } from 'bamboo'

const getGroups = get('/get', async (endpoint: Endpoint) => {
  // ...logic
  return endpoint.json({ groups: [] })
})

const createGroup = post('/create', async (endpoint: Endpoint) => {
  // ...logic
  return endpoint.json({ created: true })
})

export default actionGroup('/api/groups', [getGroups, createGroup])
```

---

### WebSocket Endpoint

The `WebSocketEndpoint` class represents a WebSocket connection and message.

#### Connection State

- `push(key, value)`: Store persistent data for the connection.
- `pushMany(data)`: Store multiple values.
- `get(key, defaultValue?)`: Retrieve connection data.
- `remove(key)`: Remove connection data.

#### Action State

- `stash(key, value)`: Store data for the current action.
- `fromStash(key, defaultValue?)`: Retrieve action data.

#### Messaging

- `json(data, lock?)`: Send a JSON response.
- `pub(topic, event, data)`: Publish to a topic.
- `send(data?)`: Send a raw message.
- `sendEvent(event, data)`: Send an event to the client.
- `err(message?, code?)`: Send an error response.

#### Utility

- `subscribe(topic)`, `unsubscribe(topic)`: Manage topic subscriptions.
- `forceClose(message)`: Terminate the connection.
- `ratelimit(context, limit, forIP)`: Apply rate limiting.
- `param(key, defaultValue?)`: Get a parameter from the message payload.

#### Example (TypeScript, real usage)

```ts
import { WebSocketEndpoint } from 'bamboo'

export async function joinGroupChat(endpoint: WebSocketEndpoint) {
  const personaId = endpoint.get('persona/id', null)
  const roomName = endpoint.param<string>('room', null)
  if (!roomName || !personaId) return endpoint.err()

  const topic = `groups:${roomName}:chat`
  endpoint.ws.subscribe(topic)
  if (endpoint.ws.isSubscribed(topic)) {
    endpoint.pub(topic, 'joined', { message: 'A new user has joined the room.' })
    return endpoint.json({ joined: true })
  } else {
    return endpoint.json({ joined: false })
  }
}
```

---

### Middleware/Pipes Example (TypeScript, stash usage)

```ts
import { WebSocketEndpoint } from 'bamboo'

export default function requiresAuth(endpoint: WebSocketEndpoint) {
  const token = endpoint.header('Authorization')
  endpoint.stash('bearer-token', token)
  // ...auth logic
}
```

---

## Actions

Define HTTP or WebSocket actions using helpers:

```ts
import { get, post, action, actionGroup, Endpoint } from 'bamboo'

const hello = get('/hello', async (endpoint: Endpoint) => endpoint.json({ hello: true }))
const submit = post('/submit', async (endpoint: Endpoint) => { /* ... */ })

const group = actionGroup('/api', [hello, submit])
```

- `get(path, handler)`
- `post(path, handler)`
- `action(definition, handler)`
- `actionGroup(definition, [actions])`

---

## Helpers & Utilities

- `createSecureToken(encoding)`: Generate a secure token (deprecated, use `randomValue`).
- `randomValue(encoding)`: Generate a random value.
- `service(name)`: Access a registered service from an endpoint.

---

## Extensions

Extend Bamboo with custom extensions or use built-in ones like Devhub.

```ts
devhub(engine, {
  prismastudio: ['bunx', 'prisma', 'studio'],
  frontend: { cmd: ['bunx', '--bun', 'vite'], cwd: join(cwd(), 'frontend') },
  telegram: ['bunx', 'bamboo', 'telegram', '--serve'],
})
```

---

## Examples

See the `/examples` and `/test` folders for more usage patterns.

---

## Developer Notes

- The API is evolving; expect breaking changes.
- Helpers like `json()` may require explicit `endpoint` passing until async context is available in Bun.
- See main README for philosophy and roadmap.

---

**For questions, issues, or contributions, visit the [Bamboo GitHub repo](https://github.com/g33kidd/bamboo).**
