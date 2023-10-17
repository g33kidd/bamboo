import * as ncrypto from 'node:crypto'
import { engine } from '../..'
import BaseEndpoint from './BaseEndpoint'

export default class Endpoint extends BaseEndpoint {
  head: boolean = false
  request: Request
  response?: Response
  parts: string[]
  url: URL

  locked: boolean = false

  constructor(_request: Request) {
    super()

    if (!_request || typeof _request === 'undefined') {
      throw new Error('Cannot create an Endpoint with an empty request.')
    }

    this.url = new URL(_request.url)
    this.request = _request

    const parts = this.url.pathname.split('/')
    this.parts = parts.filter((p) => p !== '')

    if (
      this.request.method === 'POST' ||
      this.request.method === 'PUT' ||
      this.request.method === 'PATCH'
    ) {
      this.request.json().then((json) => {
        this.params = json
      })
    }

    if (this.request.method === 'HEAD') {
      this.head = true
    }
  }

  /**
   * Creates a secure random token that includes a UTC timestamp. Used for CSRF, etc..
   *
   * TODO: Sign the token with a server-side secret so we can ensure that it's valid later on.
   * This will have to be implemented after Bun 1.0 is released. I assume that the crypto library will be more
   * fully developed by then.
   *
   * NOTE: This can be replaced by Bamboo.createSecureToken
   */
  createSecureToken(encoding: BufferEncoding = 'base64') {
    // const secret = "123412341234";
    const buffer = Buffer.from(ncrypto.randomBytes(64))
    buffer.write(Date.now().toString(), 8)
    // crypto.subtle.sign("sha256", buffer, secret);
    // const signed = crypto.sign("sha256", buffer, secret);
    // const verify = crypto.verify("sha256", )
    return buffer.toString(encoding)
  }

  /**
   * Logs general debug information to the console.
   * Currently only used to display the method, path, status and amount of time it took to process the request.
   */
  override debug() {
    super.debug(
      `[${this.request.method}] ${this.url.pathname} -> ${this.response?.status}`,
    )
  }

  /**
   * Fetches a value from the HTTP Request Headers. Returns a default value
   * if specified and null otherwise.
   *
   * @param name The name of the header. For example: Authorization
   * @param defaultValue The default value to use.
   * @returns header value, default value or null.
   */
  header(name: string, defaultValue?: any): string {
    if (this.request.headers.get(name) !== null) {
      return this.request.headers.get(name) as string
    }

    return defaultValue || null
  }

  /**
   * Returns either a parameter from a JSON body or a search param.
   * Or returns the default value if specified, or returns null.
   */
  param<T>(key: string, defaultValue?: any): T | any | null {
    const param = this.params[key]
    const searchParam = this.url.searchParams.get(key)

    if (!param) {
      if (searchParam) {
        return searchParam
      } else {
        return defaultValue || null
      }
    } else {
      return param
    }
  }

  /**
   * Returns all parameters that are attached to this endpoint.
   */
  all<T>(defaultValue?: T | any): T | any {
    return this.params as T
  }

  /**
   * Creates an HTML response based on an edge.js template defined in the views folder.
   *
   * @param path view path.
   * @param params an object containing values to be used in the template.
   * @returns rendered html
   */
  async view(path: string, params?: object) {
    if (!this.locked) {
      const html = await engine.edge.render(path, {
        isDev: process.env.NODE_ENV === 'development',
        ...params,
      })

      this.response = new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Length': html.length.toString(),
        },
      })
      this.locked = true
    }

    return this
  }

  /**
   * Sends a file as a response.
   *
   * TODO: Compression.
   */
  async file(path: string) {
    if (!this.locked) {
      const file = Bun.file(path)
      const exists = await file.exists()

      // Don't lock the file. We might want to perform other actions on this Endpoint.
      if (!exists) {
        return this.status(404)
      }

      this.response = new Response(file)
      this.locked = true
    }

    return this
  }

  /**
   * Creates a JSON response.
   *
   * @param data
   * @param status
   * @param statusText
   * @returns Endpoint
   */
  json(data: any, status: number = 200, statusText: string = 'OK') {
    if (!this.locked) {
      const json = JSON.stringify(data)

      this.locked = true
      this.response = new Response(json, {
        status: status,
        statusText: statusText,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': json.length.toString(),
        },
      })
    }

    return this
  }

  // Returns a status code with an optional statusText parameter.
  status(code: number, text?: string) {
    if (!this.locked) {
      this.locked = true
      this.response = new Response(null, {
        status: code,
        statusText: text,
      })
    }

    return this
  }

  /**
   * Returns a response that specifies that this endpoint response has not been implemented yet.
   * Useful for development.
   */
  notImplemented() {
    if (!this.locked) {
      this.locked = true
      this.response = new Response('Not Implemented')
    }

    return this
  }
}
