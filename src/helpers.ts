import { Endpoint, WebSocketEndpoint } from '..'

// type ModifyProps = {};

// export async function modify(endpoint: Endpoint, props: ModifyProps) {

// }

/**
 * Setup an endpoint with a JSON Response.
 */
export async function json(endpoint: Endpoint, data: any) {
  if (endpoint.locked) {
    return endpoint
  }

  let json = ''
  try {
    json = JSON.stringify(data, null, 0)
  } catch (e) {
    throw new Error('Error serving JSON response', {
      cause: e,
    })
  }

  endpoint.locked = true
  endpoint.response = new Response(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': json.length.toString(),
    },
  })

  return endpoint
}

export async function status(
  endpoint: Endpoint,
  status: number,
  statusText: string = 'OK',
) {
  if (endpoint.locked) {
    return endpoint
  }

  // At this point we shouldn't modify the request.
}

export async function text(endpoint: Endpoint, text: string) {
  if (endpoint.locked) {
    return endpoint
  }

  endpoint.locked = true
  endpoint.response = new Response(text, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Length': text.length.toString(),
    },
  })
  return endpoint
}
