import Pipe from '../pipe'

export default new Pipe(
  'ratelimit',
  async (endpoint) => {
    return endpoint
  },
  [],
)
