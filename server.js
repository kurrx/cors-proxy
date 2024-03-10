import createServer from './src/index.js'
import { rewriteCookies } from './src/utils.js'
import 'dotenv/config'

const TV_PROVIDER_HOST = process.env.TV_PROVIDER_HOST || null
const server = createServer({
  proxyHttps: process.env.NODE_ENV === 'production',
  originWhitelist: process.env.ORIGIN_WHITELIST?.split(', ') || [],
  originBlacklist: process.env.ORIGIN_BLACKLIST?.split(', ') || [],
  removeHeaders: ['cookie', 'origin', 'referer'],
  handleInitialRequest(req) {
    const location = req.proxyState.location
    if (!location) return false
    req.proxyState.videoName = location.searchParams.get('proxy-tv-video-filename')
    return false
  },
  isEmptyOriginAllowed(req) {
    const location = req.proxyState.location
    if (!location || !TV_PROVIDER_HOST) return false
    return location.hostname.endsWith(TV_PROVIDER_HOST) && location.pathname.endsWith('.mp4')
  },
  handleResponse(req, res, proxyReq, proxyRes) {
    rewriteCookies(proxyRes.headers)
    const contentType = proxyRes.headers['content-type'] || proxyRes.headers['Content-Type']
    if (contentType === 'video/mp4' && proxyReq.method === 'GET' && req.proxyState.videoName) {
      proxyRes.headers['Content-Disposition'] = `attachment; filename="${req.proxyState.videoName}"`
    }
    return false
  },
  isAllowedToFollowRedirect(req) {
    const location = req.proxyState.location
    if (!location || !TV_PROVIDER_HOST) return false
    return !location.hostname.endsWith(TV_PROVIDER_HOST)
  },
})

const PORT = process.env.PORT || 4001
server.listen(PORT, () => {
  console.log(`[Server] Running at http://localhost:${PORT}`)
})
