import createServer from './src/index.js'
import { rewriteCookies } from './src/utils.js'
import 'dotenv/config'

const PORT = process.env.PORT || 4001
const IS_PROD = process.env.NODE_ENV === 'production'
const ORIGIN_WHITELIST = process.env.ORIGIN_WHITELIST?.split(', ') || []
const ORIGIN_BLACKLIST = process.env.ORIGIN_BLACKLIST?.split(', ') || []
const TV_PROVIDER_HOST = process.env.TV_PROVIDER_HOST || '^^NOT_EXISTING_HOST^^'

const server = createServer({
  proxyHttps: IS_PROD,
  originWhitelist: ORIGIN_WHITELIST,
  originBlacklist: ORIGIN_BLACKLIST,
  redirectSameOrigin: true,
  removeHeaders: ['cookie', 'origin', 'referer'],
  handleInitialRequest(req) {
    const location = req.proxyState.location
    if (!location) return false
    req.proxyState.videoName = location.searchParams.get('proxy-tv-video-filename')
    return false
  },
  isEmptyOriginAllowed(req) {
    const location = req.proxyState.location
    if (!location) return false
    return location.hostname.endsWith(TV_PROVIDER_HOST) && location.pathname.endsWith('.mp4')
  },
  handleResponse(req, res, proxyReq, proxyRes) {
    rewriteCookies(proxyRes.headers)
    const type = proxyRes.headers['content-type'] || proxyRes.headers['Content-Type']
    if (type === 'video/mp4' && proxyReq.method === 'GET' && req.proxyState.videoName) {
      proxyRes.headers['Content-Disposition'] = `attachment; filename="${req.proxyState.videoName}"`
    }
    return false
  },
  isAllowedToFollowRedirect(req) {
    const location = req.proxyState.location
    return !location.hostname.endsWith(TV_PROVIDER_HOST)
  },
})

server.listen(PORT, () => {
  console.log(`[Server] Running at http://localhost:${PORT}`)
})
