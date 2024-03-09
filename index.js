import createServer from './src/index.js'
import 'dotenv/config.js'

const PORT = process.env.PORT || 4001
const IS_PROD = process.env.NODE_ENV === 'production'
const ORIGIN_WHITELIST = process.env.ORIGIN_WHITELIST?.split(', ') || []
const ORIGIN_BLACKLIST = process.env.ORIGIN_BLACKLIST?.split(', ') || []

const server = createServer({
  isProxyHttps: IS_PROD,
  allowFollowRedirect: true,
  originWhitelist: ORIGIN_WHITELIST,
  originBlacklist: ORIGIN_BLACKLIST,
  allowEmptyOrigin: true,
  redirectSameOrigin: true,
})

server.listen(PORT, () => {
  console.log(`[Server] Running at http://localhost:${PORT}`)
})
