import Pipe from '../core/pipe'

export default new Pipe(
  'bamboo:ratelimit',
  async (endpoint) => {
    return endpoint
  },
  [],
)
