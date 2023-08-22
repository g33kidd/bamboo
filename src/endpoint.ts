import { hrtime } from "process";
import Engine from "./engine";
import { Server } from "bun";

export default class Endpoint {
  engine: Engine;
  // server: Server;
  request: Request;
  response?: Response;
  parts: string[];
  stashMap: Map<string, any>;
  params: Map<string, any> = new Map();
  url: URL;

  locked: boolean = false;

  timeStart: bigint;
  timeEnd?: bigint;

  constructor(_request: Request, _engine: Engine) {
    if (!_request || typeof _request === "undefined") {
      throw new Error("Cannot create an Endpoint with an empty response.");
    }

    this.timeStart = hrtime.bigint();
    this.url = new URL(_request.url);
    this.engine = _engine;
    this.stashMap = new Map();
    this.request = _request;
    this.parts = this.parseURL();
    // this.server = _server;
  }

  // Returns the time taken to handle the request in microseconds.
  time(): number {
    if (this.timeEnd) {
      return Number(this.timeEnd - this.timeStart) / 1000;
    } else {
      return 0;
    }
  }

  // Helper for accessing a service from the engine.
  service<T>(name: string): T {
    return this.engine.service<T>(name);
  }

  // Returns debug information about this Endpoint.
  debug() {
    const time = this.time();
    const timeDisplay =
      time < 800 ? `${Math.round(time)}µs` : `${Math.round(time / 1000)}ms`;

    console.log(
      `[${this.request.method}] ${this.url.pathname} -> ${this.response?.status} in ${timeDisplay}`
    );
  }

  // Gets a header from the request.
  header(name: string, defaultValue?: any): string {
    if (this.request.headers.get(name) !== null) {
      return this.request.headers.get(name) as string;
    }

    return defaultValue || null;
  }

  // Stores a value in the Endpoint stash for later usage.
  stash(key: string, value?: any) {
    if (!this.stashMap.has(key)) {
      this.stashMap.set(key, value);
    } else {
      // If there is no value, assume that we're trying to fetch the value.
      if (!value) {
        return this.stashMap.get(key);
      }
    }
  }

  /**
   * Returns either a parameter from a JSON body or a search param.
   * Or returns the default value if specified, or returns null.
   */
  param(key: string, defaultValue?: any) {
    const param = this.params.get(key);
    const searchParam = this.url.searchParams.get(key);

    if (!param) {
      if (searchParam) {
        return searchParam;
      } else {
        return defaultValue || null;
      }
    } else {
      return param;
    }
  }

  // Gets a value from the Endpoint stash.
  fromStash(key: string, defaultValue?: any) {
    if (this.stashMap.has(key)) {
      return this.stashMap.get(key);
    }

    return defaultValue || null;
  }

  // Creates an HTML response based on an edge.js template defined in the views folder.
  async view(path: string, params?: object) {
    if (!this.locked) {
      const html = await this.engine.edge.render(path, this.viewData(params));
      this.response = new Response(html, {
        headers: {
          "Content-Type": "text/html",
          "Content-Length": html.length.toString(),
        },
      });
      this.locked = true;
    }

    return this;
  }

  // Creates an object of properties to be used in view templates.
  viewData(params?: object): object {
    return {
      isDev: process.env.NODE_ENV === "development",
      ...params,
    };
  }

  /**
   * Sends a file as a response and compresses it using GZIP if specified.
   */
  async file(path: string) {
    if (!this.locked) {
      const file = Bun.file(path);
      const exists = await file.exists();

      // Don't lock the file. We might want to perform other actions on this Endpoint.
      if (!exists) {
        return this.status(404);
      }

      this.response = new Response(file);
      this.locked = true;
    }

    return this;
  }

  // Returns a response as JSON.
  json(data: any, status: number = 200, statusText: string = "OK") {
    if (!this.locked) {
      const json = JSON.stringify(data);

      this.locked = true;
      this.response = new Response(json, {
        status: status,
        statusText: statusText,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": json.length.toString(),
        },
      });
    }

    return this;
  }

  // Returns a status code with an optional statusText parameter.
  status(code: number, text?: string) {
    if (!this.locked) {
      this.locked = true;
      this.response = new Response(null, {
        status: code,
        statusText: text,
      });
    }

    return this;
  }

  /**
   * Returns a response that specifies that this endpoint response has not been implemented yet.
   * Useful for development.
   */
  notImplemented() {
    if (!this.locked) {
      this.locked = true;
      this.response = new Response("Not Implemented");
    }

    return this;
  }

  // Splits the request URL
  parseURL() {
    const parts = this.url.pathname.split("/");
    parts.shift();
    return parts;
  }
}
