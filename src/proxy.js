import httpProxy from 'http-proxy'

/**
 * Create proxy instance with default and given values
 *
 * @param {httpProxy.ServerOptions} [options] Options
 * @returns {httpProxy} Proxy instance
 */
function createProxy(options = {}) {
  /**
   * Default http-proxy options
   * @type {httpProxy.ServerOptions}
   */
  const httpProxyOptions = {
    xfwd: false, // Append x-forwarded-* headers
    ...options,
  }

  const proxy = httpProxy.createServer(httpProxyOptions)

  // When the server fails, 500 error with message is returned
  proxy.on('error', (err, req, res) => {
    if (res.headersSent) {
      // This could happen when a protocol error occurs when an error occurs
      // after the headers have been received (and forwarded). Do not write
      // the headers because it would generate an error.
      // Prior to Node 13.x, the stream would have ended.
      // As of Node 13.x, we must explicitly close it.
      if (res.writableEnded === false) {
        res.end()
      }
      return
    }

    // When the error occurs after setting headers but before
    // writing the response, then any previously set headers
    // must be removed.
    res.getHeaderNames().forEach(name => {
      res.removeHeader(name)
    })
    res.writeHead(500, { 'Access-Control-Allow-Origin': '*' })
    res.end(err.message)
  })

  return proxy
}

export default createProxy
