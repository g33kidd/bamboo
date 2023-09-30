import { Socket } from 'bun'
import { randomBytes } from 'crypto'
import { Machine, Message } from './types'

export type TelegramClientOpts = {
  hostname: string
  port: number
  handler: PayloadHandler
}

export type PayloadHandler = (payload: any, machine?: Machine) => void

/**
 * TelegramClient is responsible for receiving messages from a TelegramServer. Essentially, this
 * enables a distributed messaging service. It was built for a chat application that utilizes fly.io
 * for hosting.
 */
export default class TelegramClient {
  machine: Machine
  socket?: Socket<Machine>
  handler: PayloadHandler

  constructor({ hostname, port, handler }: TelegramClientOpts) {
    // Specify this current machine.
    this.machine = { id: randomBytes(8).toString('base64') }
    this.handler = handler
    this.connect(hostname, port)
  }

  /**
   * This method broadcasts a message to all other Machines that are connected to the
   * TelegramServer.
   */
  broadcast(payload: any) {
    const message: Message = {
      machine: `machine:${this.machine.id}`,
      payload: JSON.stringify(payload),
      time: Date.now(),
    }
    const buf = Buffer.from(JSON.stringify(message) + '&b')
    if (this.socket?.write(buf)) {
      // console.log('sent message')
    } else {
      console.error('message not sent', buf.toString())
    }
  }

  async connect(hostname: string, port: number) {
    const client = this
    Bun.connect<Machine>({
      hostname,
      port,
      data: {
        id: `machine:${this.machine.id}`,
      },
      socket: {
        open(socket) {
          console.log(
            '🗞️ connected to telegram server at:',
            `${hostname}:${port}...`,
          )
          client.socket = socket
          socket.write(
            JSON.stringify({
              connect: true,
              machineId: `machine:${client.machine.id}`,
            }) + '&b',
          )
        },
        close(socket) {
          // TODO: Attempt to reconnect.
          // setTimeout(() => {
          //   console.log('attempting to reconnect to telegram server...')
          //   client.connect(hostname, port)
          // }, 1000)
        },
        error(socket, error) {
          console.error(error)
        },
        data(socket, data) {
          // TODO: This needs to be a readable stream.
          const messageString = Buffer.from(data).toString()
          if (messageString) {
            const messages = messageString.split('&b').filter((m) => m !== '')
            for (let i = 0; i < messages.length; i++) {
              try {
                const message: Message = JSON.parse(messages[i])
                const payload = JSON.parse(message.payload)
                client.handler(payload, { id: message.machine })
                // TODO: Handle the message.
              } catch (error) {
                console.error(error)
              }
            }
            socket.flush()
          }
        },
      },
    })
  }
}
