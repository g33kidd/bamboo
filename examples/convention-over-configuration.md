# Convention Over Configuration

Bamboo follows the principle of "convention over configuration" - if you don't provide explicit configuration, it will automatically discover and load your code based on common directory structures.

## How It Works

When you call `engine.configure()` without any parameters, Bamboo will:

1. **Auto-discover** your project structure
2. **Load actions, pipes, services, and workers** automatically
3. **Mount views** and **configure WebSockets** based on conventions
4. **Log everything** it finds and loads

## Supported Directory Structures

Bamboo looks for these directories in order of preference:

### Actions (Routes)
```
actions/           # ✅ Preferred
src/actions/       # ✅ Alternative
app/actions/       # ✅ Alternative
routes/           # ✅ Alternative
```

### Pipes (Middleware)
```
pipes/            # ✅ Preferred
src/pipes/        # ✅ Alternative
app/pipes/        # ✅ Alternative
middleware/       # ✅ Alternative
```

### Services
```
services/         # ✅ Preferred
src/services/     # ✅ Alternative
app/services/     # ✅ Alternative
```

### Views (Templates)
```
views/            # ✅ Preferred
src/views/        # ✅ Alternative
app/views/        # ✅ Alternative
templates/        # ✅ Alternative
```

### Workers
```
workers/          # ✅ Preferred
src/workers/      # ✅ Alternative
app/workers/      # ✅ Alternative
```

### WebSocket
```
websocket/        # ✅ Preferred
src/websocket/    # ✅ Alternative
app/websocket/    # ✅ Alternative
ws/              # ✅ Alternative
```

## Example Project Structure

```
my-bamboo-app/
├── actions/
│   ├── posts.ts
│   ├── users.ts
│   └── auth.ts
├── pipes/
│   ├── auth.ts
│   ├── cors.ts
│   └── logging.ts
├── services/
│   ├── database.ts
│   ├── email.ts
│   └── storage.ts
├── workers/
│   ├── image-processor.ts
│   └── email-sender.ts
├── views/
│   ├── layout.edge
│   └── pages/
├── websocket/
│   ├── chat.ts
│   └── notifications.ts
└── index.ts
```

## File Export Patterns

Bamboo supports multiple export patterns for flexibility:

### Actions
```typescript
// actions/posts.ts
import { action } from 'bamboo'

// Pattern 1: Default export (single action)
export default action('GET /posts', async (endpoint) => {
  // handler
})

// Pattern 2: Default export (array of actions)
export default [
  action('GET /posts', async (endpoint) => {
    // handler
  }),
  action('POST /posts', async (endpoint) => {
    // handler
  })
]

// Pattern 3: Named export
export const actions = [
  action('GET /posts', async (endpoint) => {
    // handler
  })
]
```

### Pipes
```typescript
// pipes/auth.ts
import { pipe } from 'bamboo'

// Pattern 1: Default export (single pipe)
export default pipe('auth', async (endpoint) => {
  // middleware logic
  return endpoint
})

// Pattern 2: Default export (array of pipes)
export default [
  pipe('auth', async (endpoint) => {
    // middleware logic
  }),
  pipe('logging', async (endpoint) => {
    // logging logic
  })
]
```

### Services
```typescript
// services/database.ts
export default class DatabaseService {
  async connect() {
    // connection logic
  }
  
  async query(sql: string) {
    // query logic
  }
}
```

### Workers
```typescript
// workers/image-processor.ts
// Workers are automatically loaded and registered
// No special export pattern needed

self.onmessage = async (event) => {
  // worker logic
}
```

## Quick Start Example

```typescript
// index.ts
import { engine } from 'bamboo'

// Just configure without any parameters!
// Bamboo will auto-discover everything
await engine.configure()

// Start the server
engine.serve()
```

## Logging Output

When you run with convention over configuration, you'll see logs like:

```
[INFO] No EngineConfig provided, using convention over configuration
[INFO] Auto-discovering configuration from: /path/to/your/app
[INFO] Found actions directory: actions
[INFO] Loaded 3 actions from actions
[INFO] Found pipes directory: pipes
[INFO] Loaded 2 pipes from pipes
[INFO] Found services directory: services
[INFO] Loaded 2 services from services
[INFO] Found workers directory: workers
[INFO] Loaded 2 workers from workers
[INFO] Found views directory: views
[INFO] Mounted views from views
[INFO] Found WebSocket directory: websocket
[INFO] Loaded WebSocket configuration from websocket
```

## Benefits

### 🚀 **Zero Configuration**
- Start building immediately
- No boilerplate setup required
- Perfect for prototypes and MVPs

### 📁 **Flexible Structure**
- Multiple directory patterns supported
- Works with existing project structures
- Easy migration from other frameworks

### 🔧 **Still Configurable**
- Can still provide explicit configuration
- Override conventions when needed
- Best of both worlds

### 🎯 **Developer Friendly**
- Clear logging of what's loaded
- Helpful error messages
- Easy to debug and understand

## Migration from Other Frameworks

### From Express.js
```
express-app/
├── routes/     → actions/
├── middleware/ → pipes/
└── services/   → services/
```

### From Rails
```
rails-app/
├── app/controllers/ → actions/
├── app/models/      → services/
└── app/views/       → views/
```

### From Laravel
```
laravel-app/
├── app/Http/Controllers/ → actions/
├── app/Http/Middleware/  → pipes/
└── resources/views/      → views/
```

## Customization

If you need to customize the conventions, you can still provide explicit configuration:

```typescript
await engine.configure({
  actions: [/* your actions */],
  pipes: [/* your pipes */],
  services: [/* your services */],
  websocket: {
    actions: [/* your ws actions */],
    pipes: [/* your ws pipes */]
  }
})
```

This gives you the flexibility to use conventions for most things while customizing specific parts when needed! 