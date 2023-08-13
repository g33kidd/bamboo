import Endpoint from "../endpoint";
import Pipe from "../pipe";

export default class Action {
  definition: string;
  path: Array<string>;
  method: string;
  handler: (endpoint: Endpoint) => Promise<Endpoint>;
  pipes?: Pipe[];

  constructor(
    _definition: string,
    _handler: (endpoint: Endpoint) => Promise<Endpoint>,
    _pipes?: Pipe[]
  ) {
    this.definition = _definition;

    const definition = _definition.split(" ");
    this.method = definition[0];

    const pathParts = definition[1].split("/");

    if (pathParts.length !== 1) {
      if (pathParts[pathParts.length - 1] === "") {
        pathParts.pop();
      }
    }

    if (pathParts.length === 0) {
      throw new Error("Cannot define an action without a path.");
    } else if (pathParts.length === 1 && pathParts[0] === "") {
      this.path = ["__root"];
    } else {
      this.path = pathParts;
    }

    this.handler = _handler;
    this.pipes = _pipes;
  }

  // TODO: Handle the PIPES!
  async handle(endpoint: Endpoint) {
    endpoint = await this.handlePipes(endpoint);
    endpoint = await this.handler(endpoint);
    return endpoint;
  }

  async handlePipes(endpoint: Endpoint) {
    if (this.pipes) {
      for (let index = 0; index < this.pipes.length; index++) {
        const pipe = this.pipes[index];
        endpoint = await pipe.handle(endpoint);
      }
    }

    return endpoint;
  }
}

export function action(
  definition: string,
  handler: (endpoint: Endpoint) => Promise<Endpoint>,
  pipes?: Pipe[]
) {
  return new Action(definition, handler, pipes);
}
