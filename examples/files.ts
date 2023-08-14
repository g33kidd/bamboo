import { Engine, action, pipe, staticPipe } from "bamboo";

// Define an action with a Definition, Handler, and (optionally) pipes.
const helloWorld = action("GET /", (endpoint) => {
  return endpoint.file("./static/index.html");
});

// Create the engine and start the server.
export default new Engine({
  // Adds the ability to serve static assets.
  pipes: [staticPipe],
  actions: [helloWorld],
}).server();
