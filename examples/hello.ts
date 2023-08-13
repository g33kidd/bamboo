import { Engine, action, pipe } from "bamboo";

// Pipes can modify the endpoint, serve a response, or store data for use inside of another pipe or action.
const helloPipe = pipe("hello", async (endpoint) => {
  endpoint.stash("uuid", crypto.randomUUID());
  return endpoint;
});

// Define an action with a Definition, Handler, and (optionally) pipes.
const helloWorld = action(
  "GET /",
  async (endpoint) => {
    const uuid = endpoint.stash("uuid");
    return endpoint.json({ hello: "world", uuid });
  },
  [helloPipe]
);

// Create the engine and start the server.
export default new Engine({
  actions: [helloWorld],
}).server();
