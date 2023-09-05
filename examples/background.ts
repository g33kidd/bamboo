// import { engine } from "..";

// /**
//  * This is a WIP brainstorm example for background services.
//  * None of this code works currently, but is a foundation for the background services
//  * architecture. I suppose you could call this distributed services with Bun.
//  */

// // services/test.ts
// const gatekeeper = engine.background({
//   hostname: "0.0.0.0",
//   port: 6543,
//   name: "gatekeeper",
//   version: "0.0.1",
//   events: ["cleanup"],

//   cleanup(count) {
//     // do something
//     return { count };
//   },
// });

// // index.ts
// engine.configure({
//   websocket: {
//     actions: [
//       ws("test", () => {
//         gatekeeper.cleanup(0);
//       }),
//     ],
//   },
// });

// gatekeeper.start();

// // workers/test.ts
// gatekeeper.cleanup(0);
