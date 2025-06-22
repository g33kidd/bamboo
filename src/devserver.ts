import { Server, ServerWebSocket, Subprocess } from 'bun'
import { join } from 'path'
import { Engine } from '..'

/**
 * Helper function to start the devserver with custom applications
 */
export function devserver(applications: [name: string, string | {
  bun?: { run?: string[] },
  cmd?: string[],
  watch?: string[] | string,
  restartOnChange?: boolean
}][]) {
  // Override the default applications
  ; (globalThis as any).__devserver_applications = applications

  // Start the server and processes
  startDevServer()
}

/**
 * Starts the devserver with the configured applications
 */
async function startDevServer() {
  const applications: [name: string, string | {
    bun?: { run?: string[] },
    cmd?: string[],
    watch?: string[] | string,
    restartOnChange?: boolean
  }][] = (globalThis as any).__devserver_applications || [
    ['app', 'src/index.ts'],
    ['watcher', 'src/watcher.ts'],
  ]

  // Generate the dashboard HTML with the applications
  const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bamboo DevServer Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f23;
            color: #fff;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
        }
        
        .header h1 {
            color: #00ff88;
            margin-bottom: 10px;
        }
        
        .processes {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
        }
        
        .process-card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .process-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .process-name {
            font-weight: bold;
            color: #00ff88;
            font-size: 1.1em;
        }
        
        .process-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .status-running {
            background: #00ff88;
            color: #000;
        }
        
        .status-stopped {
            background: #ff4444;
            color: #fff;
        }
        
        .output {
            background: #000;
            border-radius: 5px;
            padding: 15px;
            height: 300px;
            overflow-y: auto;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 12px;
            line-height: 1.4;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .output::-webkit-scrollbar {
            width: 8px;
        }
        
        .output::-webkit-scrollbar-track {
            background: #1a1a1a;
        }
        
        .output::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 4px;
        }
        
        .controls {
            margin-top: 15px;
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s;
        }
        
        .btn-restart {
            background: #ffaa00;
            color: #000;
        }
        
        .btn-restart:hover {
            background: #ffcc00;
        }
        
        .btn-stop {
            background: #ff4444;
            color: #fff;
        }
        
        .btn-stop:hover {
            background: #ff6666;
        }
        
        .btn-clear {
            background: #666;
            color: #fff;
        }
        
        .btn-clear:hover {
            background: #888;
        }
        
        .connection-status {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 5px;
            font-weight: bold;
        }
        
        .connected {
            background: #00ff88;
            color: #000;
        }
        
        .disconnected {
            background: #ff4444;
            color: #fff;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Bamboo DevServer Dashboard</h1>
        <p>Real-time process monitoring and control</p>
    </div>
    
    <div class="connection-status" id="connectionStatus">
        Connecting...
    </div>
    
    <div class="processes" id="processes">
        <!-- Process cards will be dynamically generated here -->
    </div>

    <script>
        const processes = ${JSON.stringify(applications.map(([name]) => name))};
        const ws = new WebSocket('ws://localhost:1337/ws');
        const processOutputs = new Map();
        const processStatuses = new Map();
        
        // Initialize process outputs
        processes.forEach(name => {
            processOutputs.set(name, '');
            processStatuses.set(name, 'running');
        });
        
        function updateConnectionStatus(connected) {
            const statusEl = document.getElementById('connectionStatus');
            statusEl.textContent = connected ? 'Connected' : 'Disconnected';
            statusEl.className = 'connection-status ' + (connected ? 'connected' : 'disconnected');
        }
        
        function createProcessCard(name) {
            return \`
                <div class="process-card" id="process-\${name}">
                    <div class="process-header">
                        <div class="process-name">\${name}</div>
                        <div class="process-status status-\${processStatuses.get(name)}" id="status-\${name}">
                            \${processStatuses.get(name)}
                        </div>
                    </div>
                    <div class="output" id="output-\${name}">\${processOutputs.get(name)}</div>
                    <div class="controls">
                        <button class="btn btn-restart" onclick="restartProcess('\${name}')">Restart</button>
                        <button class="btn btn-stop" onclick="stopProcess('\${name}')">Stop</button>
                        <button class="btn btn-clear" onclick="clearOutput('\${name}')">Clear</button>
                    </div>
                </div>
            \`;
        }
        
        function updateProcessesDisplay() {
            const container = document.getElementById('processes');
            container.innerHTML = processes.map(name => createProcessCard(name)).join('');
        }
        
        function updateProcessOutput(name, chunk) {
            const output = processOutputs.get(name) + chunk;
            processOutputs.set(name, output);
            
            const outputEl = document.getElementById(\`output-\${name}\`);
            if (outputEl) {
                outputEl.textContent = output;
                outputEl.scrollTop = outputEl.scrollHeight;
            }
        }
        
        function restartProcess(name) {
            ws.send(JSON.stringify({ action: 'restart', process: name }));
        }
        
        function stopProcess(name) {
            ws.send(JSON.stringify({ action: 'stop', process: name }));
        }
        
        function clearOutput(name) {
            processOutputs.set(name, '');
            const outputEl = document.getElementById(\`output-\${name}\`);
            if (outputEl) {
                outputEl.textContent = '';
            }
        }
        
        // WebSocket event handlers
        ws.onopen = () => {
            updateConnectionStatus(true);
            updateProcessesDisplay();
        };
        
        ws.onclose = () => {
            updateConnectionStatus(false);
        };
        
        ws.onerror = () => {
            updateConnectionStatus(false);
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'output') {
                    updateProcessOutput(data.process, data.chunk);
                } else if (data.type === 'status') {
                    processStatuses.set(data.process, data.status);
                    const statusEl = document.getElementById(\`status-\${data.process}\`);
                    if (statusEl) {
                        statusEl.textContent = data.status;
                        statusEl.className = \`process-status status-\${data.status}\`;
                    }
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        // Initial display
        updateProcessesDisplay();
    </script>
</body>
</html>
`

  let server: Server | null = null
  if (!server)
    server = Bun.serve({
      port: 1337,
      fetch: function (
        this: Server,
        request: Request,
        server: Server,
      ): Response | Promise<Response> {
        const url = new URL(request.url)

        if (url.pathname === '/') {
          return new Response(dashboardHTML, {
            headers: {
              'Content-Type': 'text/html',
            },
          })
        }

        // Handle WebSocket upgrade
        if (url.pathname === '/ws') {
          if (server.upgrade(request)) {
            return new Response()
          }
          return new Response('WebSocket upgrade failed', { status: 500 })
        }

        return new Response('Not Found', { status: 404 })
      },
      websocket: {
        open(ws) {
          ws.subscribe('_main')
          console.log('WebSocket client connected')
        },
        message(
          ws: ServerWebSocket<unknown>,
          message: string | Buffer,
        ): void | Promise<void> {
          try {
            const data = JSON.parse(message.toString())

            if (data.action === 'restart') {
              const process = store.get(data.process)
              if (process) {
                process.kill()
                startProcess(data.process)
              }
            } else if (data.action === 'stop') {
              const process = store.get(data.process)
              if (process) {
                process.kill()
                processStatuses.set(data.process, 'stopped')
                server?.publish('_main', JSON.stringify({
                  type: 'status',
                  process: data.process,
                  status: 'stopped'
                }))
              }
            }
          } catch (error) {
            console.error('Error handling WebSocket message:', error)
          }
        },
      },
    })

  const processStatuses = new Map<string, string>()

  function startProcess(name: string) {
    const config = applications.find(([n]) => n === name)?.[1]
    if (!config) return

    let proc: Subprocess

    if (typeof config === 'string') {
      // Auto-detect if it's a bun script or shell command
      if (config.endsWith('.ts') || config.endsWith('.js') || config.startsWith('bun ')) {
        // It's a bun script or bun command - use Bun's built-in hot reloading
        proc = Bun.spawn(['bun', '--hot', 'run', config])
      } else {
        // It's a shell command
        proc = Bun.spawn(['sh', '-c', config])
      }
    } else if (typeof config === 'object') {
      // Structured configuration
      if (config.bun?.run) {
        // Bun run configuration with hot reloading
        proc = Bun.spawn(['bun', '--hot', 'run', ...config.bun.run])
      } else if (config.cmd) {
        // Direct command array
        proc = Bun.spawn(config.cmd)
      } else {
        console.error(`Invalid configuration for process ${name}`)
        return
      }
    } else {
      console.error(`Invalid configuration for process ${name}`)
      return
    }

    const stdout = proc.stdout instanceof ReadableStream ? proc.stdout : new ReadableStream()
    streams.set(name, stdout)
    store.set(name, proc)
    processStatuses.set(name, 'running')

    // Publish status update
    server?.publish('_main', JSON.stringify({
      type: 'status',
      process: name,
      status: 'running'
    }))

    // Handle process output
    if (proc.stdout instanceof ReadableStream) {
      ; (async () => {
        const stdout = proc.stdout as ReadableStream
        for await (const chunk of stdout) {
          const chunkStr = chunk instanceof Buffer ? chunk.toString('utf-8') : Buffer.from(chunk).toString('utf-8')
          console.log(`[${name}] ${chunkStr}`)

          // Publish to WebSocket clients
          server?.publish('_main', JSON.stringify({
            type: 'output',
            process: name,
            chunk: chunkStr
          }))
        }
      })()
    }

    // Handle process exit
    proc.exited.then(() => {
      processStatuses.set(name, 'stopped')
      server?.publish('_main', JSON.stringify({
        type: 'status',
        process: name,
        status: 'stopped'
      }))
    })
  }

  // Start all processes
  for (const [name, config] of applications) {
    startProcess(name)
  }

  console.log('🚀 Bamboo DevServer running at http://localhost:1337')

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down DevServer...')

    // Stop all processes
    for (const [name, proc] of store) {
      console.log(`Stopping ${name}...`)
      proc.kill()
    }

    server?.stop()
    process.exit(0)
  })
}

const store = new Map<string, Subprocess>()
const streams = new Map<string, ReadableStream>()

