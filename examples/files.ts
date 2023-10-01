import { engine, action, pipe, staticPipe } from 'bamboo'
import { Endpoint } from '..'

// Define an action with a Definition, Handler, and (optionally) pipes.
const helloWorld = action('GET /', (endpoint: Endpoint) => {
  return endpoint.file('./static/index.html')
})

// Configure the engine with our action.
engine.configure({
  actions: [helloWorld],
})

// Start the engine.
engine.serve()
