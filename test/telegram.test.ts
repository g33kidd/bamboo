import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { TelegramClient, TelegramServer } from '..'
import { TelegramClientOpts } from '../src/telegram/client'
import { exit } from 'process'

const connection = { hostname: 'localhost', port: 4560 }
const server = new TelegramServer({ ...connection }, true)

const clientDefaults: TelegramClientOpts = {
  ...connection,
  handler: (payload) => {},
}

describe('Telegram', () => {
  test('server handles client disconnect.', async () => {
    const client = new TelegramClient(clientDefaults)
    await Bun.sleep(5)
    client.socket?.end()
    await Bun.sleep(5)
    expect(server.clients.size).toBe(0)
  })

  test('server handles connect & client does connect.', async () => {
    const client = new TelegramClient(clientDefaults)
    await Bun.sleep(5)
    expect(server.clients.size).toBe(1)
    client.socket?.end()
  })

  test('client receives messages from another client.', async () => {
    let messages: object[] = []

    const client = new TelegramClient({
      ...connection,
      handler(payload) {
        messages.push(payload)
      },
    })

    const otherClient = new TelegramClient(clientDefaults)
    await Bun.sleep(5)

    otherClient.broadcast({ hello: 'world' })
    await Bun.sleep(5)

    expect(messages).toBeArrayOfSize(1)

    client.socket?.end()
    otherClient.socket?.end()
  })

  test('client receives several messages from another client.', async () => {
    let messages: object[] = []

    const client = new TelegramClient({
      ...connection,
      handler(payload) {
        messages.push(payload)
      },
    })

    const otherClient = new TelegramClient(clientDefaults)
    await Bun.sleep(5)

    for (let i = 0; i < 25; i++) {
      otherClient.broadcast({ hello: 'world' })
    }

    await Bun.sleep(5)

    expect(messages).toBeArrayOfSize(25)
    expect(messages[0]).toEqual({ hello: 'world' })
    expect(messages[24]).toEqual({ hello: 'world' })
    client.socket?.end()
    otherClient.socket?.end()
  })
})
