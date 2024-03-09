import { URL } from 'node:url'

/**
 * Check if a value is a function
 *
 * @param {any} value
 * @returns {boolean}
 */
export function isFunction(value) {
  return value instanceof Function
}

/**
 * Check if a value is a number
 *
 * @param {any} value
 * @returns {boolean}
 */
export function isNumber(value) {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Check if a value is a boolean
 *
 * @param {any} value
 * @returns {boolean}
 */
export function isBoolean(value) {
  return typeof value === 'boolean'
}

/**
 * Convert a value to an array of strings
 *
 * @param {any} value
 * @param {string[]} defaultValue
 * @returns {string[]}
 */
export function toStringArray(value, defaultValue) {
  if (typeof value === 'string') {
    return [value.toLowerCase()]
  } else if (Array.isArray(value)) {
    return value.filter(v => typeof v === 'string').map(v => v.toLowerCase())
  }
  return defaultValue
}

/**
 * Normalizes options to ensure they are valid
 *
 * @param {import('./index.js').Options} defaultOptions Options
 * @param {import('./index.js').Options} options Options
 * @returns {import('./index.js').Options} Normalized options
 */
export function normalizeOptions(defaultOptions, options) {
  Object.keys(defaultOptions).forEach(key => {
    if (options[key] === undefined) {
      options[key] = defaultOptions[key]
    }
  })

  // Normalize isProxyHttps
  if (!isBoolean(options.isProxyHttps)) {
    options.isProxyHttps = defaultOptions.isProxyHttps
  }

  // Normalize handleInitialRequest
  if (!isFunction(options.handleInitialRequest) && options.handleInitialRequest !== null) {
    options.handleInitialRequest = defaultOptions.handleInitialRequest
  }

  // Normalize maxRedirects
  if (!isNumber(options.maxRedirects) || options.maxRedirects < 0) {
    options.maxRedirects = defaultOptions.maxRedirects
  }

  // Normalize allowFollowRedirect
  if (!isFunction(options.allowFollowRedirect) && !isBoolean(options.allowFollowRedirect)) {
    options.allowFollowRedirect = defaultOptions.allowFollowRedirect
  }

  // Normalize originBlacklist
  options.originBlacklist = toStringArray(options.originBlacklist, defaultOptions.originBlacklist)

  // Normalize originWhitelist
  options.originWhitelist = toStringArray(options.originWhitelist, defaultOptions.originWhitelist)

  // Normalize allowEmptyOrigin
  if (!isFunction(options.allowEmptyOrigin) && !isBoolean(options.allowEmptyOrigin)) {
    options.allowEmptyOrigin = defaultOptions.allowEmptyOrigin
  }

  // Normalize checkRateLimit
  if (!isFunction(options.checkRateLimit) && options.checkRateLimit !== null) {
    options.checkRateLimit = defaultOptions.checkRateLimit
  }

  // Normalize redirectSameOrigin
  if (!isBoolean(options.redirectSameOrigin)) {
    options.redirectSameOrigin = defaultOptions.redirectSameOrigin
  }

  // Normalize requireHeaders
  options.requireHeaders = toStringArray(options.requireHeaders, defaultOptions.requireHeaders)

  // Normalize removeHeaders
  options.removeHeaders = toStringArray(options.removeHeaders, defaultOptions.removeHeaders)

  // Normalize addHeaders
  if (typeof options.addHeaders !== 'object' || options.addHeaders === null) {
    options.addHeaders = defaultOptions.addHeaders
  } else {
    Object.keys(options.addHeaders).forEach(key => {
      if (typeof options.addHeaders[key] !== 'string') {
        if (defaultOptions.addHeaders[key] === undefined) {
          delete options.addHeaders[key]
        } else {
          options.addHeaders[key] = defaultOptions.addHeaders[key]
        }
      }
    })
  }

  // Normalize corsMaxAge
  if (!isNumber(options.corsMaxAge) || options.corsMaxAge < 0) {
    options.corsMaxAge = defaultOptions.corsMaxAge
  }

  return options
}

/**
 * Adds CORS headers to the response headers.
 *
 * @param {object} headers Response headers
 * @param {import('node:http').IncomingMessage & import('./handler.js').RequestState} req Request
 * @returns {object} Response headers
 */
export function withCORS(headers, req) {
  headers['access-control-allow-origin'] = '*'
  const corsMaxAge = req.proxyState.corsMaxAge
  if (req.method === 'OPTIONS' && corsMaxAge) {
    headers['access-control-max-age'] = corsMaxAge
  }
  if (req.headers['access-control-request-method']) {
    headers['access-control-allow-methods'] = req.headers['access-control-request-method']
    delete req.headers['access-control-request-method']
  }
  if (req.headers['access-control-request-headers']) {
    headers['access-control-allow-headers'] = req.headers['access-control-request-headers']
    delete req.headers['access-control-request-headers']
  }

  headers['access-control-expose-headers'] = Object.keys(headers).join(',')

  return headers
}

/**
 * Parse a URL string
 *
 * @param {string} url URL string
 * @returns {URL|null} URL instance or null
 */
export function parseURL(url) {
  try {
    return new URL(url)
  } catch {
    return null
  }
}
