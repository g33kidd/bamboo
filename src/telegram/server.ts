import { Socket, TCPSocketListener } from 'bun'
import { Machine, Message } from './types'

export default class TelegramServer {
  clients: Set<Socket<Machine>> = new Set()
  socket?: TCPSocketListener<Machine>

  constructor({ hostname, port }: { hostname: string; port: number }) {
    console.log(`🗞️ started telegram listener on ${hostname}:${port}...`)
    this.listen(hostname, port)
  }

  async listen(hostname: string, port: number) {
    const server = this
    this.socket = Bun.listen<Machine>({
      hostname,
      port,
      socket: {
        open(socket) {
          console.log(
            'client connected from',
            socket.remoteAddress,
            `(${server.clients.size} clients now)`,
          )
        },
        close(socket) {
          server.clients.delete(socket)
        },
        error(socket, error) {
          console.error('Telegram error: ', error)
          if (server.clients.has(socket)) {
            server.clients.delete(socket)
          }
        },
        data(socket, data) {
          if (data) {
            const buffer = Buffer.from(data).toString()

            try {
              const payloadMessages = buffer.split('&b').filter((b) => b !== '')
              for (let j = 0; j < payloadMessages.length; j++) {
                const payload = JSON.parse(payloadMessages[j])
                if (payload.connect && payload.machineId) {
                  socket.data = { id: payload.machineId }
                  server.clients.add(socket)
                } else {
                  const message: Message = payload
                  if (message) {
                    server.clients.forEach((c) => {
                      if (c.data.id !== message.machine) {
                        const buf = Buffer.from(JSON.stringify(message) + '&b')
                        // &b separates the messages.
                        c.write(buf, buf.byteOffset, buf.byteLength)
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
