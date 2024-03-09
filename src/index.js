import http from 'node:http'
import createProxy from './proxy.js'
import getRequestHandler from './handler.js'

/**
 * @callback InitialRequestHandler
 * @param {http.IncomingMessage & import('./handler.js').RequestState} req
 * @param {http.ServerResponse} res
 * @param {import('node:url').URL} location
 * @returns {boolean}
 */
/**
 * @callback ResponseHandler
 * @param {http.IncomingMessage & import('./handler.js').RequestState} req
 * @param {http.ServerResponse} res
 * @param {http.IncomingMessage} proxyReq
 * @param {http.ServerResponse} proxyRes
 * @param {import('node:url').URL} location
 * @returns {boolean}
 */
/**
 * @callback AllowFollowRedirectChecker
 * @param {import('node:url').URL} location
 * @returns {boolean}
 */
/**
 * @callback AllowEmptyOriginChecker
 * @param {import('node:url').URL} location
 * @returns {boolean}
 */
/**
 * @callback RateLimitChecker
 * @param {string} origin
 * @returns {string}
 */
/**
 * @typedef Options
 * @property {boolean} [isProxyHttps] Is server using HTTPS (default: false)
 * @property {InitialRequestHandler|null} [handleInitialRequest] Function that may handle the request instead, by returning a truthy value. (default: null)
 * @property {ResponseHandler|null} [handleResponse] Function that will be called on each response. (default: null)
 * @property {number} [maxRedirects] Maximum number of redirects to follow (default: 5)
 * @property {AllowFollowRedirectChecker|boolean} [allowFollowRedirect] Allow redirect following if true, or if the function returns true.(default: true)
 * @property {string[]|string} [originBlacklist] Requests from these origins will be blocked. (default: [])
 * @property {string[]|string} [originWhitelist] Requests from these origins will be allowed. (default: [])
 * @property {AllowEmptyOriginChecker|boolean} [allowEmptyOrigin] Allow requests with no origin if true, or if the function returns true. (default: true)
 * @property {RateLimitChecker|null} [checkRateLimit] Function that may enforce a rate-limit by returning a non-empty string. (default: null)
 * @property {boolean} [redirectSameOrigin] Redirect the client to the requested URL for same-origin requests. (default: false)
 * @property {string[]|string} [requireHeaders] Require these headers to be set in the request. (default: [])
 * @property {string[]|string} [removeHeaders] Strip these request headers. (default: [])
 * @property {Object<string, string>} [addHeaders] Set these request headers. (default: {})
 * @property {number} [corsMaxAge] If set, an Access-Control-Max-Age header with this value (in seconds) will be added. (default: 0)
 * @property {import('http-proxy').ServerOptions} [httpProxyOptions] http-proxy options (default: { xfwd: false })
 */

/**
 * Create an HTTP Proxy server with default and given values
 *
 * @param {Options} [options] Options
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
