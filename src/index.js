import http from 'node:http'
import createProxy from './proxy.js'
import getRequestHandler from './handler.js'

/**
 * Create an HTTP Proxy server instance with default and given values
 *
 * @param {import('./types.js').CreateServerOptions} [options] Options
 * @returns {http.Server} Server instance
 * @example
 * const server = createServer({ ... })
 *
 * server.listen(4001, () => {
 *  console.log('Server is running at http://localhost:4001')
 * })
 */
function createServer(options = {}) {
  const proxy = createProxy(options.httpProxyOptions)
  const handler = getRequestHandler(proxy, options)
  const server = http.createServer(handler)
  return server
}

export default createServer
