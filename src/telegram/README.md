# Telegram

Not to be confused with the messaging client. Names come and go, honestly.

# Purpose

Telegram is a distributed messaging component of Bamboo that allows several
machines to send messages to one another. It was originally built for an
application hosted on fly.io running on multiple machines to handle messages on
each machine's instance of a websocket server. More to come.

# Future

There are some things I would like to cleanup in the future. Currently, if there
are multiple messages coming into the server or client at one time, they are
separated by a string '&b'. It was an arbitrary choice. In the future this
should probably be replaced with a null byte.

# Usage

Ideally you probably want only one instance of TelegramServer, but I suppose you
could use multiple and then hook multiple TelegramServer's to a TelegramServer.
If you really want redundancy. Teleception!

Here's a pretty basic example of how this works:

```typescript
import { randomBytes } from 'crypto'
import TelegramClient from './telegram/client'
import TelegramServer from './telegram/server'

// Message Broker Server
// const clients: Set<Socket<Machine>> = new Set()
new TelegramServer({ hostname: '0.0.0.0', port: 3000 })
await Bun.sleep(300)

const clients = []

for (let i = 0; i < 120; i++) {
  const client = new TelegramClient({
    hostname: '0.0.0.0',
    port: 3000,
    handler(payload) {
      console.log(payload)
    },
  })

  setInterval(() => {
    const bytes = randomBytes(32).toString('base64')
    client.broadcast({
      topic: 'something:1234',
      message: bytes,
      datetime: new Date(Date.now()).toTimeString(),
    })
  }, 10 * i)
  clients.push(client)
}
```

If there are any issues, let me know I'll be glad to take a look.
