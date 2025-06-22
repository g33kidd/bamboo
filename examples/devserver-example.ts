#!/usr/bin/env bun

/**
 * Example of using the Bamboo DevServer
 * 
 * This example shows how to run multiple development processes
 * and monitor them through a web dashboard.
 */

import { devserver } from '../src/devserver'

// Define your development processes
const processes: [name: string, script: string][] = [
    ['api', 'src/api.ts'],
    ['frontend', 'bun run --hot src/frontend.ts'],
    ['database', 'bunx prisma studio'],
    ['watcher', 'bun run --watch src/watcher.ts'],
]

// Start the devserver with your processes
devserver(processes)

// Import and run the devserver
import '../src/devserver'

console.log('🎯 DevServer example started!')
console.log('📊 Dashboard available at: http://localhost:1337')
console.log('🛑 Press Ctrl+C to stop all processes') 