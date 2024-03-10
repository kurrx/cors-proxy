import createServer from './src/index.js'
import 'dotenv/config'

const server = createServer({
  proxyHttps: process.env.NODE_ENV === 'production',
  originWhitelist: process.env.ORIGIN_WHITELIST?.split(', ') || [],
  originBlacklist: process.env.ORIGIN_BLACKLIST?.split(', ') || [],
})

const PORT = process.env.PORT || 4001
server.listen(PORT, () => {
  console.log(`[Server] Running at http://localhost:${PORT}`)
})
