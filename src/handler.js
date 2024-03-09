import { normalizeOptions, parseURL, withCORS } from './utils.js'
import { resolve } from 'node:url'

/**
 * @typedef State
 * @property {number} corsMaxAge If set, an Access-Control-Max-Age header with this value (in seconds) will be added.
 * @property {number} maxRedirects Maximum number of redirects to follow
 * @property {import('node:url').URL} location URL to target
 * @property {string} proxyBaseUrl Base URL of the proxy
 * @property {import('./index.js').AllowFollowRedirectChecker|boolean} allowFollowRedirect Allow redirect following if true, or if the function returns true.
 * @property {Object<string, string>} headers Proxy request headers
 * @property {number} redirectCount_ Number of redirects followed
 */
/**
 * @typedef RequestState
 * @property {State} proxyState State
 */
/**
 * @callback RequestHandler
 * @param {import('node:http').IncomingMessage & RequestState} req
 * @param {import('node:http').ServerResponse} res
 * @returns {void}
 */

/**
 * @type {import('./index.js').Options}
 */
const defaultOptions = {
  isProxyHttps: false,
  handleInitialRequest: null,
  maxRedirects: 5,
  allowFollowRedirect: true,
  originBlacklist: [],
  originWhitelist: [],
  allowEmptyOrigin: true,
  checkRateLimit: null,
  redirectSameOrigin: false,
  requireHeaders: [],
  removeHeaders: [],
  addHeaders: {},
  corsMaxAge: 0,
}

/**
 * This method modifies the response headers of the proxied response.
 * If a redirect is detected, the response is not sent to the client,
 * and a new request is initiated.
 *
 * client (req) -> CORS Anywhere -> (proxyReq) -> other server
 * client (res) <- CORS Anywhere <- (proxyRes) <- other server
 *
 * @param {import('http-proxy')} proxy
 * @param {import('node:http').IncomingMessage} proxyReq
 * @param {import('node:http').ServerResponse} proxyRes
 * @param {import('node:http').IncomingMessage & RequestState} req
 * @param {import('node:http').ServerResponse} res
 *
 * @returns {boolean} true if http-proxy should continue to pipe proxyRes to res.
 */
function onProxyResponse(proxy, proxyReq, proxyRes, req, res) {
  const state = req.proxyState
  const location = state.location
  const allowFollowRedirect = state.allowFollowRedirect
  const proxyBaseUrl = state.proxyBaseUrl
  const maxRedirects = state.maxRedirects
  const statusCode = proxyRes.statusCode

  // Handle redirects
  if ([301, 302, 303, 307, 308].includes(statusCode)) {
    let locationHeader = proxyRes.headers.location
    let parsedLocation
    if (locationHeader) {
      locationHeader = resolve(location.href, locationHeader)
      parsedLocation = parseURL(locationHeader)
    }
    if (parsedLocation) {
      const allow = typeof allowFollowRedirect === 'boolean' ? allowFollowRedirect : allowFollowRedirect(parsedLocation)
      // Exclude 307 & 308, because they are rare, and require preserving the method + request body
      // Handle redirects within the server, because some clients (e.g. Android Stock Browser)
      // cancel redirects.
      if (allow && [301, 302, 303].includes(statusCode)) {
        state.redirectCount_ = state.redirectCount_ + 1 || 1
        if (state.redirectCount_ <= maxRedirects) {
          req.method = 'GET'
          req.headers['content-length'] = '0'
          delete req.headers['content-type']
          state.location = parsedLocation

          // Remove all listeners (=reset events to initial state)
          req.removeAllListeners()

          // Remove the error listener so that the ECONNRESET "error" that
          // may occur after aborting a request does not propagate to res.
          // https://github.com/nodejitsu/node-http-proxy/blob/v1.11.1/lib/http-proxy/passes/web-incoming.js#L134
          proxyReq.removeAllListeners('error')
          proxyReq.once('error', function catchAndIgnoreError() {})
          proxyReq.abort()

          // Initiate a new proxy request.
          proxyRequest(req, res, proxy)
          return false
        }
      }
      proxyRes.headers.location = proxyBaseUrl + '/' + locationHeader
    }
  }

  withCORS(proxyRes.headers, req)
  return true
}

/**
 * Performs the actual proxy request.
 *
 * @param {import('node:http').IncomingMessage & RequestState} req Incoming request
 * @param {import('node:https').ServerResponse} res Outgoing (proxied) response
 * @param {import('http-proxy')} proxy Proxy instance
 */
function proxyRequest(req, res, proxy) {
  const state = req.proxyState
  const location = state.location
  const headers = state.headers
  req.url = location.href

  try {
    proxy.web(req, res, {
      changeOrigin: false,
      prependPath: false,
      target: location,
      headers,
      // HACK: Get hold of the proxyReq object, because we need it later.
      // https://github.com/nodejitsu/node-http-proxy/blob/v1.11.1/lib/http-proxy/passes/web-incoming.js#L144
      buffer: {
        pipe: function (proxyReq) {
          const proxyReqOn = proxyReq.on
          // Intercepts the handler that connects proxyRes to res.
          // https://github.com/nodejitsu/node-http-proxy/blob/v1.11.1/lib/http-proxy/passes/web-incoming.js#L146-L158
          proxyReq.on = function (eventName, listener) {
            if (eventName !== 'response') {
              return proxyReqOn.call(this, eventName, listener)
            }
            return proxyReqOn.call(this, 'response', function (proxyRes) {
              if (onProxyResponse(proxy, proxyReq, proxyRes, req, res)) {
                try {
                  listener(proxyRes)
                } catch (err) {
                  // Wrap in try-catch because an error could occur:
                  // "RangeError: Invalid status code: 0"
                  // https://github.com/Rob--W/cors-anywhere/issues/95
                  // https://github.com/nodejitsu/node-http-proxy/issues/1080

                  // Forward error (will ultimately emit the 'error' event on our proxy object):
                  // https://github.com/nodejitsu/node-http-proxy/blob/v1.11.1/lib/http-proxy/passes/web-incoming.js#L134
                  proxyReq.emit('error', err)
                }
              }
            })
          }
          return req.pipe(proxyReq)
        },
      },
    })
  } catch (err) {
    proxy.emit('error', err, req, res)
  }
}

/**
 * Create a request handler for the proxy server
 *
 * @param {import('http-proxy')} proxy Proxy instance
 * @param {import('./index.js').Options} options Options
 * @returns {RequestHandler} Request handler
 */
function getRequestHandler(proxy, options) {
  const {
    isProxyHttps,
    handleInitialRequest,
    maxRedirects,
    allowFollowRedirect,
    originBlacklist,
    originWhitelist,
    allowEmptyOrigin,
    checkRateLimit,
    redirectSameOrigin,
    requireHeaders,
    removeHeaders,
    addHeaders,
    corsMaxAge,
  } = normalizeOptions(defaultOptions, { ...defaultOptions, ...options })

  return (req, res) => {
    /**
     * @type {State}
     */
    const state = {}
    state.corsMaxAge = corsMaxAge
    state.maxRedirects = maxRedirects
    state.location = parseURL(req.url.slice(1))
    state.proxyBaseUrl = (isProxyHttps ? 'https' : 'http') + '://' + req.headers.host
    state.allowFollowRedirect = allowFollowRedirect
    req.proxyState = state

    const location = state.location
    const origin = req.headers.origin || ''
    const corsHeaders = withCORS({}, req)

    // Pre-flight request. Reply successfully:
    if (req.method === 'OPTIONS') {
      res.writeHead(200, corsHeaders)
      res.end()
      return
    }

    // Handle initial request
    if (handleInitialRequest && handleInitialRequest(req, res, location)) {
      return
    }

    // Check if the URL is valid
    if (!location) {
      res.writeHead(400, withCORS({ 'Content-Type': 'text/plain' }, req))
      res.end('Provide a valid url.')
      return
    }

    // Check if the request has the all required headers
    if (!requireHeaders.every(header => req.headers[header] !== undefined)) {
      res.writeHead(400, 'Header required', corsHeaders)
      res.end('Missing required request header. Must specify one of: ' + requireHeaders)
      return
    }

    // Origin validation
    if (!origin) {
      const allowed = typeof allowEmptyOrigin === 'boolean' ? allowEmptyOrigin : allowEmptyOrigin(location)
      if (!allowed) {
        res.writeHead(403, 'Forbidden', corsHeaders)
        res.end('Missing or invalid origin.')
        return
      }
    } else {
      if (originBlacklist.includes(origin)) {
        res.writeHead(403, 'Forbidden', corsHeaders)
        res.end('The origin "' + origin + '" was blacklisted by the operator of this proxy.')
        return
      }
      if (!originWhitelist.includes(origin)) {
        res.writeHead(403, 'Forbidden', corsHeaders)
        res.end('The origin "' + origin + '" was not whitelisted by the operator of this proxy.')
        return
      }
    }

    // Rate limit check
    if (checkRateLimit && checkRateLimit(origin)) {
      res.writeHead(429, 'Too Many Requests', corsHeaders)
      res.end('The origin "' + origin + '" has sent too many requests.\n' + rateLimitMessage)
      return
    }

    // Send a permanent redirect to offload the server. Badly coded clients should not waste our resources.
    if (redirectSameOrigin && origin && location.href.startsWith(origin)) {
      corsHeaders.vary = 'origin'
      corsHeaders['cache-control'] = 'private'
      corsHeaders.location = location.href
      res.writeHead(301, 'Please use a direct request', corsHeaders)
      res.end()
      return
    }

    // Remove headers
    removeHeaders.forEach(header => {
      delete req.headers[header]
    })

    // Add headers
    Object.entries(addHeaders).forEach(([header, value]) => {
      req.headers[header] = value
    })

    // Set the headers for the proxy request
    state.headers = {}
    Object.keys(req.headers).forEach(header => {
      header = header.toLowerCase()
      if (header.startsWith('x-proxy-')) {
        const cleanHeader = header.replace('x-proxy-', '')
        const value = req.headers[header]
        state.headers[cleanHeader] = value
        req.headers[cleanHeader] = value
        delete req.headers[header]
      }
    })
    state.headers.host = location.host

    proxyRequest(req, res, proxy)
  }
}

export default getRequestHandler
