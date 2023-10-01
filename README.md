# Bamboo

[![Bamboo Test Suite](https://github.com/g33kidd/bamboo/actions/workflows/tests.yml/badge.svg)](https://github.com/g33kidd/bamboo/actions/workflows/tests.yml)

**Bamboo** is a Web Framework for the Bun.sh JavaScript runtime. It is currently
in rapid development and being used for [Nyra](https://nyra.chat). Currently not
recommended to be used in production as it still does not have a stable API
currently.

The goal is to create a "feature rich" environment for both Humans and
Artificial Intelligence to work within.

### Artificial Intelligence?

Currently, AI is great at a lot of things. It's also not great at a lot of
things. One taks I believe it works great for is creating smaller isolated
features with enough context. A goal for this project is to make it as simple as
possible for an LLM to generate new features for an application. While I think
this will take some time and there's a lot to do, I believe we can create a
"convention over configuration" framework that serves the needs of both Humans
and AI. Personally, I think this takes a different approach to what we currently
build.

# Feature Overview

Here's a current list of features both implemented and planned:

- HTTP Routing & WebSocket Routing
- Built-in static asset handling w/ directory remapping.
- WebSockets with individual connection state.
- DevServer utilities. [WIP]
- Background Services [WIP]
- Distributed Messaging [WIP]
- Extensions [WIP]
  - Devhub
- Storage [WIP]
  - External service providers. [PLAN]
  - Galaxy management w/ a web interface. [PLAN]
  - Authorization for storage objects. [PLAN]
- Rooms (Channels) API [WIP]
  - Currently there is pub/sub.

#### Distributed Messaging

Using the built-in `TelegramClient` and `TelegramServer` you can create systems
that broadcast messages. The goal is to have a lightweight alternative to
something like Amazon's SQS. This is great if you work with deployments on
[Fly.io](https://fly.io) or any other container based architecture.

It's currently in-use in production for a multi-machine WebSocket service.

#### Extensions & Devhub

Extensions offer the ability to manipulate the entire Bamboo engine for whatever
you may need. Something currently in progress is the `devhub` extension, which
allows developers to run multiple process, debug an application, view request
lifecycle details, and much more through a built-in dashboard. This feature is
currently a work in progress.

Here's an example:

```javascript
devhub(engine, {
  // Starts prisma studio.
  prismastudio: ['bunx', 'prisma', 'studio'],
  // Runs the frontend devserver.
  frontend: {
    cmd: ['bunx', '--bun', 'vite'],
    cwd: join(cwd(), 'frontend'),
  },
  // Telegram Server
  telegram: ['bunx', 'bamboo', 'telegram', '--serve'],
})
```

#### WebSocket State

Often times it's useful to maintain some kind of state for a client that is
connected via WebSocket. Bamboo has a helper that allows you to manage that
state in several ways:

```javascript
// Assigns user.id to the WS connection. This is assigned to the active connection and is only reset when the user disconnects.
endpoint.push('user.id', 1)
endpoint.pushMany({ 'user.id': 1, token: '1234' })
endpoint.pushIf(isAdmin, 'user.admin', true)
endpoint.get('user.id')
endpoint.remove('user.id')

// Assigns data to the individual WS request/action. This is not reused and is only available within the context of each individual action.
endpoint.stash('profile.id', 1)
endpoint.stash('profile.id')
endpoint.fromStash('profile.id')
```

### Example Usage

There are currently a few examples in the `/examples` and `/test` folders.
