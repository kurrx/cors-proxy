/**
 * @typedef {import('node:http').IncomingMessage} IncomingMessage
 * @typedef {import('node:http').ServerResponse} ServerResponse
 * @typedef {import('node:url').URL} URL
 * @typedef {import('http-proxy').ServerOptions} HttpProxyOptions
 * @typedef {Object<string, string | string[]>} Headers
 */

/**
 * @typedef {Object} ProxyState
 * @property {string} proxyBaseUrl Base URL of the proxy
 * @property {URL} location Requested URL
 * @property {string} origin Request origin
 * @property {Headers} headers Request headers
 * @property {number} redirectCount_ Number of redirects followed
 * @property {Options['maxRedirects']} maxRedirects
 * @property {Options['corsMaxAge']} corsMaxAge
 * @property {Options['handleResponse']} handleResponse
 * @property {Options['isAllowedToFollowRedirect']} isAllowedToFollowRedirect
 *
 * @typedef {IncomingMessage & { proxyState: ProxyState }} Request Request with proxy state object
 */

/**
 * @callback RequestCallback
 * @param {Request} req
 * @param {ServerResponse} res
 * @param {URL} location
 * @returns {boolean}
 *
 * @callback ResponseCallback
 * @param {Request} req
 * @param {ServerResponse} res
 * @param {IncomingMessage} proxyReq
 * @param {ServerResponse} proxyRes
 * @param {URL} location
 * @returns {boolean}
 *
 * @callback CheckRateLimitCallback
 * @param {Request} req
 * @param {ServerResponse} res
 * @param {URL} location
 * @param {string} origin
 * @returns {string}
 *
 * @typedef {Object} Options
 * @property {boolean} proxyHttps Is server using HTTPS (you should set `true` if you using NGINX with HTTPS) (default: `false`)
 * @property {number} maxRedirects Maximum number of redirects to follow (default: `5`)
 * @property {string[]} originWhitelist Requests from these origins will be allowed (default: `[]`)
 * @property {string[]} originBlacklist Requests from these origins will be blocked (default: `[]`)
 * @property {boolean} redirectSameOrigin Redirect the client to the requested URL for same-origin requests (default: `false`)
 * @property {string[]} requireHeaders Require these headers to be set in the request (default: `[]`)
 * @property {string[]} removeHeaders Strip these request headers (default: `[]`)
 * @property {Headers} addHeaders Set these headers to request (default: `{}`)
 * @property {number} corsMaxAge If set, an Access-Control-Max-Age header with this value (in seconds) will be added (default: `0`)
 * @property {RequestCallback|null} handleInitialRequest Function that may handle the request instead, by returning a truthy value (default: `null`)
 * @property {RequestCallback|boolean} isEmptyOriginAllowed Allow requests with no origin if true, or if the function returns true (default: `true`)
 * @property {ResponseCallback|null} handleResponse Function that may handle the response instead, by returning a truthy value (default: `null`)
 * @property {ResponseCallback|boolean} isAllowedToFollowRedirect Allow redirect following if true, or if the function returns true (default: `true`)
 * @property {CheckRateLimitCallback|null} checkRateLimit Function that may enforce a rate-limit by returning a non-empty string (default: `null`)
 *
 * @typedef {Partial<Options> & Partial<{
 *   originWhitelist: string | Options['originWhitelist'],
 *   originBlacklist: string | Options['originBlacklist'],
 *   requireHeaders: string | Options['requireHeaders'],
 *   removeHeaders: string | Options['removeHeaders'],
 *   httpProxyOptions: HttpProxyOptions,
 * }>} CreateServerOptions Options for creating a server
 */

/**
 * @callback RequestHandler
 * @param {Request} req
 * @param {ServerResponse} res
 * @returns {void}
 */

export default {}
