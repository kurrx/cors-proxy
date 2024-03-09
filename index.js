import createServer from './src/index.js'
import cookieParser from 'set-cookie-parser'
import cookieLib from 'cookie'
import 'dotenv/config.js'

const PORT = process.env.PORT || 4001
const IS_PROD = process.env.NODE_ENV === 'production'
const ORIGIN_WHITELIST = process.env.ORIGIN_WHITELIST?.split(', ') || []
const ORIGIN_BLACKLIST = process.env.ORIGIN_BLACKLIST?.split(', ') || []
const TV_PROVIDER_HOST = process.env.TV_PROVIDER_HOST || '^^NOT_EXISTING_HOST^^'

/**
 * WARNING: TODO: Write a explanation
 * Rewrite cookies from `set-cookie` header to `x-proxy-set-cookie-*` headers
 *
 * @param {Object<string, string>} headers
 */
function rewriteCookies(headers) {
  if (!headers['set-cookie']) return
  if (typeof headers['set-cookie'] === 'string') {
    headers['set-cookie'] = [headers['set-cookie']]
    return rewriteCookies(headers)
  }
  const cookies = cookieParser.parse(headers['set-cookie'])
  headers['x-proxy-set-cookies-count'] = `${cookies.length}`
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i]
    headers[`x-proxy-set-cookie-${i + 1}`] = cookieLib.serialize(cookie.name, cookie.value, {
      expires: cookie.expires,
    })
  }
  delete headers['set-cookie']
}

const server = createServer({
  isProxyHttps: IS_PROD,
  originWhitelist: ORIGIN_WHITELIST,
  originBlacklist: ORIGIN_BLACKLIST,
  redirectSameOrigin: true,
  handleInitialRequest(req, res, location) {
    req.proxyState.videoName = location.searchParams.get('proxy-tv-video-filename')
    delete req.headers['origin']
    delete req.headers['referer']
    return false
  },
  handleResponse(req, res, proxyReq, proxyRes) {
    rewriteCookies(proxyRes.headers)

    const type = proxyRes.headers['content-type'] || proxyRes.headers['Content-Type']
    if (type === 'video/mp4' && proxyReq.method === 'GET') {
      proxyRes.headers['Content-Disposition'] = 'attachment'
      if (req.proxyState.videoName) {
        proxyRes.headers['Content-Disposition'] += `; filename="${req.proxyState.videoName}"`
      }
    }
    return false
  },
  allowEmptyOrigin: location => location.hostname.endsWith(TV_PROVIDER_HOST) && location.pathname.endsWith('.mp4'),
  allowFollowRedirect: location => !location.hostname.endsWith(TV_PROVIDER_HOST),
})

server.listen(PORT, () => {
  console.log(`[Server] Running at http://localhost:${PORT}`)
})
