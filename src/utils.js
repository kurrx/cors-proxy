import { URL } from 'node:url'
import setCookieParser from 'set-cookie-parser'
import cookie from 'cookie'

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
 * @param {import('./types.js').Options} defaultOptions Options
 * @param {import('./types.js').CreateServerOptions} options Options
 * @returns {import('./types.js').Options} Normalized options
 */
export function normalizeOptions(defaultOptions, options) {
  Object.keys(defaultOptions).forEach(key => {
    if (options[key] === undefined) {
      options[key] = defaultOptions[key]
    }
  })

  // Normalize proxyHttps
  if (!isBoolean(options.proxyHttps)) {
    options.proxyHttps = defaultOptions.proxyHttps
  }

  // Normalize maxRedirects
  if (!isNumber(options.maxRedirects) || options.maxRedirects < 0) {
    options.maxRedirects = defaultOptions.maxRedirects
  }

  // Normalize originWhitelist
  options.originWhitelist = toStringArray(options.originWhitelist, defaultOptions.originWhitelist)

  // Normalize originBlacklist
  options.originBlacklist = toStringArray(options.originBlacklist, defaultOptions.originBlacklist)

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

  // Normalize handleInitialRequest
  if (!isFunction(options.handleInitialRequest) && options.handleInitialRequest !== null) {
    options.handleInitialRequest = defaultOptions.handleInitialRequest
  }

  // Normalize isEmptyOriginAllowed
  if (!isFunction(options.isEmptyOriginAllowed) && !isBoolean(options.isEmptyOriginAllowed)) {
    options.isEmptyOriginAllowed = defaultOptions.isEmptyOriginAllowed
  }

  // Normalize handleResponse
  if (!isFunction(options.handleResponse) && options.handleResponse !== null) {
    options.handleResponse = defaultOptions.handleResponse
  }

  // Normalize isAllowedToFollowRedirect
  if (!isFunction(options.isAllowedToFollowRedirect) && !isBoolean(options.isAllowedToFollowRedirect)) {
    options.isAllowedToFollowRedirect = defaultOptions.isAllowedToFollowRedirect
  }

  // Normalize checkRateLimit
  if (!isFunction(options.checkRateLimit) && options.checkRateLimit !== null) {
    options.checkRateLimit = defaultOptions.checkRateLimit
  }

  return options
}

/**
 * Adds CORS headers to the response headers.
 *
 * @param {import('./types.js').Headers} headers Response headers
 * @param {import('./types.js').Request} req Request
 * @returns {import('./types.js').Headers} Response headers
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
 * @returns {URL | null} URL instance or null
 */
export function parseURL(url) {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

/**
 * Deletes all `Set-Cookie` headers and rewrites to `X-Proxy-Set-Cookie-{number}` headers.
 *
 * Where `{number}` is the number from `1` to `X-Proxy-Set-Cookies-Count`.
 *
 * **WARNING:** Use this function only if you know what you are doing.
 * It's not secure to expose cookies sent from target to the client.
 * I'm using this function because I know that the target is not sending
 * any sensitive data.
 *
 * @param {import('./src/types.js').Headers} headers Headers Object
 * @returns {void}
 */
export function rewriteCookies(headers) {
  if (!headers['set-cookie']) return
  if (typeof headers['set-cookie'] === 'string') {
    headers['set-cookie'] = [headers['set-cookie']]
    return rewriteCookies(headers)
  }
  const cookies = setCookieParser.parse(headers['set-cookie'])
  headers['x-proxy-set-cookies-count'] = `${cookies.length}`
  for (let i = 0; i < cookies.length; i++) {
    const setCookie = cookies[i]
    headers[`x-proxy-set-cookie-${i + 1}`] = cookie.serialize(setCookie.name, setCookie.value, {
      expires: setCookie.expires,
    })
  }
  delete headers['set-cookie']
}
