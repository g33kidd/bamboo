# 🎍 Bamboo

[![Bamboo Test Suite](https://github.com/g33kidd/bamboo/actions/workflows/tests.yml/badge.svg)](https://github.com/g33kidd/bamboo/actions/workflows/tests.yml)

**Bamboo** is a modern web framework for the [Bun.sh JavaScript Runtime](https://bun.sh), designed for rapid development and a future where both humans and AI can build together. 🚀

> ⚠️ **Note:** Bamboo is under active development and its API is not yet stable. Use in production at your own risk!

---

## 🌟 Why Bamboo?

Bamboo aims to be a "feature-rich" environment for both humans and artificial intelligence. The vision: make it easy for developers—and even LLMs—to generate new features quickly, using convention over configuration. This means less boilerplate, more productivity, and a framework that adapts to the future of software development.

---

## ✨ Features

- **HTTP & WebSocket Routing**
- **Built-in Static Asset Handling** (with directory remapping)
- **WebSockets with Per-Connection State**
- **DevServer Utilities** *(WIP)*
- **Background Services** *(WIP)*
- **Distributed Messaging** *(WIP)*
- **Extensions System** *(WIP)*
  - Devhub: Built-in dashboard for multi-process dev, debugging, and more
- **Storage System** *(WIP/Planned)*
  - External providers, web interface, and object authorization
- **Rooms (Channels) API** *(WIP)*
  - Pub/Sub support

---

## 🤖 AI-First Philosophy

Bamboo is designed so that even an LLM can generate new features with minimal context. The goal is to make feature creation as simple and automated as possible, for both humans and AI.

---

## 📡 Distributed Messaging

With `TelegramClient` and `TelegramServer`, you can broadcast messages across systems—a lightweight alternative to SQS, perfect for container-based deployments (like [Fly.io](https://fly.io)).

---

## 🧩 Extensions & Devhub

Extensions let you customize the Bamboo engine. The `devhub` extension (WIP) provides a dashboard for running multiple processes, debugging, and viewing request lifecycles.

```js
devhub(engine, {
  prismastudio: ['bunx', 'prisma', 'studio'],
  frontend: {
    cmd: ['bunx', '--bun', 'vite'],
    cwd: join(cwd(), 'frontend'),
  },
  telegram: ['bunx', 'bamboo', 'telegram', '--serve'],
})
```

---

## 🔄 WebSocket State: Connection vs. Action

Bamboo makes it easy to manage both persistent (connection) and ephemeral (action) state for each WebSocket client.

> 💡 **Tip:** Use connection state for info that lasts (like user ID), and action state for info that's just for one request (like the room being joined).

### Example: Simple Chat App

**1. On user join:**
```js
// When the user connects and logs in
endpoint.push('user.id', user.id); // Stays for the session
```

**2. On join room action:**
```js
function joinRoomAction(endpoint, data) {
  endpoint.stash('room.id', data.roomId); // Only for this action
  const userId = endpoint.get('user.id');
  const roomId = endpoint.fromStash('room.id');
  addUserToRoom(userId, roomId);
  return endpoint.json({ success: true, roomId });
}
```

**3. On send message action:**
```js
function sendMessageAction(endpoint, data) {
  const userId = endpoint.get('user.id'); // Persistent
  const roomId = data.roomId; // Sent with each message
  sendMessageToRoom(roomId, { userId, text: data.text });
  return endpoint.json({ success: true });
}
```

> 🚀 **Why?**
> The user ID is needed for every action (so it's stored for the session), but the room ID is only needed for specific actions (like joining a room or sending a message), so you can pass it as needed or stash it for a single action.

---

## 🧪 Examples & Tests

Check out the `/examples` and `/test` folders for more sample code and usage patterns.

---

## 🤝 Contributing

Contributions, ideas, and feedback are welcome! Please open an issue or pull request on GitHub.

---

## 🛠️ Developer Notes

### Engine

Currently, there is a single instance of `Engine` that is created when you call `import {engine} from 'bamboo'` and this serves as the entire application's engine to work with. In the future, this needs to be changed to `createEngine()` so that additional instances can be created if needed.

### Endpoint Responses

Unsure if this is possible, but with responses it's kind of messy looking when I have to call `endpoint.json()` or anything else where I need to use an endpoint. I've been thinking about scopes and creating helper functions where the value of `endpoint` is known to exist, so it just uses it without having to pass it in. This would make for simpler and cleaner code, I think.

Currently my investigation reveals that this is possible, but with TypeScript it may be tricky to implement without requiring `// @ts-ignore` everywhere.

This is the concept:

```typescript
class Engine {
  val: string = '1'
  constructor(handler: (val: string) => string) {
    console.log('value:', this.val)
    this.val = handler(this.val)
    console.log('value:', this.val)
  }
}

function json(data: any): string {
  // We can use 'val' here from the parent scope.
  return JSON.stringify(data)
}

new Engine((val) => {
  return json({
    val: val + '-yes-hello',
  })
})
```

So that in the future our helper functions would look like below. I'll use the websocket stash as an example:

```typescript
stash('profile.id', 1)

// Under the hood I imagine this looking something like:

function stash<T>(name: string, value?: T): T | null {
  if (endpoint && endpoint instanceof Endpoint) {
    if (value) {
      endpoint.stash(name, value)
    } else {
      return endpoint.fromStash(name)
    }
  }
  return null
}

// Other examples:
json({})
text('Hi')
status(404, 'Not Found')
putIf(isAdmin, 'admin', true)
put('profile.id', 1)
```
