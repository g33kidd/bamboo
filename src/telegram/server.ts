import { Socket, TCPSocketListener } from 'bun'
import { Machine, Message } from './types'

export default class TelegramServer {
  clients: Set<Socket<Machine>> = new Set()
  socket?: TCPSocketListener<Machine>
  silent: boolean = false

  constructor(
    { hostname, port }: { hostname: string; port: number },
    silent: boolean = false,
  ) {
    // TODO: Create an optional logging component to be added to this.
    // console.log(`🗞️ started telegram listener on ${hostname}:${port}...`)
    this.silent = silent
    this.listen(hostname, port)
  }

  async listen(hostname: string, port: number) {
    const server = this
    this.socket = Bun.listen<Machine>({
      hostname,
      port,
      socket: {
        open(socket) {
          if (!server.silent)
            console.log('Client 🗞️ connected from', socket.remoteAddress)
        },
        close(socket) {
          server.clients.delete(socket)
        },
        error(socket, error) {
          if (!server.silent) console.error('Telegram error: ', error)
          if (server.clients.has(socket)) {
            server.clients.delete(socket)
          }
        },
        data(socket, data) {
          if (data) {
            const buffer = Buffer.from(data.buffer).toString()

            try {
              const payloadMessages = buffer.split('&b').filter((b) => b !== '')
              for (let j = 0; j < payloadMessages.length; j++) {
                const payload = JSON.parse(payloadMessages[j])
                if (payload.connect && payload.machineId) {
                  socket.data = { id: payload.machineId }
                  server.clients.add(socket)
                  // TODO: Add optional logging client for this.
                  // console.log(`clients now: ${server.clients.size} `)
                } else {
                  const message: Message = payload
                  if (message) {
                    server.clients.forEach((c) => {
                      if (c.data.id !== message.machine) {
                        // TODO: Use something other than &b because that could be contained within the payload.
                        const buf = Buffer.from(JSON.stringify(message) + '&b')
                        // &b separates the messages.
                        c.write(buf.buffer, buf.byteOffset, buf.byteLength)
                        c.flush()
                      }
                    })
                  }
                }
              }
            } catch (e) {
              console.error(e, buffer.toString())
            }
          }
        },
      },
    })
  }
}
