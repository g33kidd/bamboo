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
- Background Services [WIP]
- Distributed Messaging [WIP]
- Storage [WIP]
  - External service providers needs to be implemented.
  - Galaxy management w/ a web interface.
  - Authorization for storage objects.
- Rooms (Channels) API [WIP]
  - Currently there is pub/sub.

Here are some things that will be worked on in the near future:

- Authentication/authorization.
- Improved typings.

##### Distributed Messaging

Using the built-in `TelegramClient` and `TelegramServer` you can create systems
that broadcast messages. The goal is to have a lightweight alternative to
something like Amazon's SQS. This is great if you work with deployments on
[Fly.io](https://fly.io) or any other container based architecture.

It's currently in-use in production for a multi-machine WebSocket service.

### Example Usage

There are currently a few examples in the `/examples` and `/test` folders.
