// Quick Start Example

import { engine } from '../'

// Bamboo will auto-discover everything from your directory structure
async function startApp() {
  console.log('🚀 Starting Bamboo app with convention over configuration...')
  
  // Auto-discovers and loads:
  // - actions/ (routes)
  // - pipes/ (middleware) 
  // - services/ (business logic)
  // - workers/ (background tasks)
  // - views/ (templates)
  // - websocket/ (real-time features)
  await engine.configure()
  
  // Start the server
  engine.serve()
  
  console.log('✅ App started! Check the logs above to see what was auto-discovered.')
}

startApp().catch(console.error) 