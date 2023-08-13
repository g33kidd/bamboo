import Pipe from "../pipe";

export default new Pipe(
  "ratelimit",
  (endpoint) => {
    return endpoint;
  },
  []
);
