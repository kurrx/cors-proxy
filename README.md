# cors-proxy

## Overview

### Description

**CORS Proxy** is a NodeJS reverse proxy server which adds CORS headers to the proxied request.

This project is a direct derivative work of [**CORS Anywhere**](https://github.com/Rob--W/cors-anywhere).

The url to proxy is literally taken from the path, validated and proxied. URL is validated with [`URL.canParse()`](https://nodejs.org/api/url.html#urlcanparseinput-base) method of NodeJS URL API.

This package does not put any restrictions on the http methods or headers, except for cookies ([read more](#cookies)). Requesting [user credentials](http://www.w3.org/TR/cors/#user-credentials) is disallowed. The app can be configured to require a header for proxying a request, for example to avoid a direct visit from the browser.

### Motivation

For most use cases [**CORS Anywhere**](https://github.com/Rob--W/cors-anywhere) provides all functionality you may need. However, I needed to modify the response headers before sending it to a user. If that's what you are looking for, feel free to give it a try!

Main differences between **CORS Proxy** and **CORS Anywhere**:

- Added `isEmptyOriginAllowed` callback option to identify is it allowed or not to specific request to be proxied if `Origin` header is empty. (eg. when you proxying files that can be opened in browser tab)
- Added `handleResponse` callback option to modify response before sending it to user.
- Added `isAllowedToFollowRedirect` callback option to identify is it allowed or not to follow redirects that target sends.
- Better autocompletion of `createServer()` options types and added descriptions for each option

## Example

### Installation

```shell
# Clone git repository
git clone https://github.com/kurrx/cors-proxy
cd cors-proxy

# Install dependencies
npm install

# Start development server
npm run start

# Create .env from example
cp .env.example .env
```

### Configuration

You can edit `server.js` file in root directory to change the way server proxies requests. All available [options](#options) listed below.

```js
import createServer from './src/index.js'
import 'dotenv/config'

const server = createServer({
  proxyHttps: process.env.NODE_ENV === 'production',
  originWhitelist: process.env.ORIGIN_WHITELIST?.split(', ') || [],
  originBlacklist: process.env.ORIGIN_BLACKLIST?.split(', ') || [],
  redirectSameOrigin: true,
  removeHeaders: ['origin', 'referer'],
})

const PORT = process.env.PORT || 4001
server.listen(PORT, () => {
  console.log(`[Server] Running at http://localhost:${PORT}`)
})
```

Request examples:

- `http://localhost:4001/http(s)://google.com/any/nesting/supported` - google.com with CORS headers
- `http://localhost:4001/invalid` - Replies 400 Bad Request because `invalid` is not valid URL

## Documentation

### Options

```ts
interface Request extends IncomingMessage {
  proxyState: {
    proxyBaseUrl: string
    location: URL | null
    origin: string
    headers: Record<string, string>
    redirectCount: number
  }
}

type RequestCallback = (req: Request, res: ServerResponse) => boolean
type ResponseCallback = (req: Request, res: ServerResponse, proxyReq: IncomingMessage, proxyRes: ServerResponse) => boolean

interface Options {
  proxyHttps?: boolean
  maxRedirects?: number
  originWhitelist?: string | string[]
  originBlacklist?: string | string[]
  redirectSameOrigin?: boolean
  requireHeaders?: string | string[]
  removeHeaders?: string | string[]
  addHeaders?: Record<string, string>
  corsMaxAge?: number
  handleInitialRequest?: RequestCallback | null
  isEmptyOriginAllowed?: RequestCallback | boolean
  checkRateLimit?: RequestCallback | null
  handleResponse?: ResponseCallback | null
  isAllowedToFollowRedirect?: ResponseCallback | boolean
  httpProxyOptions?: HttpProxyOptions
}
```

#### `Request` interface

Extends initial request `IncomingMessage` with `proxyState` object field. You can access this object with `req.proxyState` (DO NOT MODIFY THESE OPTIONS INSIDE OF CALLBACKS, YOU MAY BREAK SOME INTERNAL LOGIC). Descriptions of each field:

##### `proxyBaseUrl`

TODO

##### `location`

TODO

##### `origin`

TODO

##### `headers`

TODO

##### `redirectCount`

Number of redirects followed.

#### `Options` interface

`src/index.js` exports `createServer(options)` function, which creates a server that handles proxy requests. The following options are supported:

##### `proxyHttps`

TODO

##### `maxRedirects`

TODO

##### `originWhitelist`

TODO

##### `originBlacklist`

TODO

##### `redirectSameOrigin`

TODO

##### `requireHeaders`

TODO

##### `removeHeaders`

TODO

##### `addHeaders`

TODO

##### `corsMaxAge`

TODO

##### `handleInitialRequest`

TODO

##### `isEmptyOriginAllowed`

TODO

##### `checkRateLimit`

TODO

##### `handleResponse`

TODO

##### `isAllowedToFollowRedirect`

TODO

##### `httpProxyOptions`

TODO

### Cookies

TODO

### Client

TODO

## License

The MIT License

Copyright (C) 2013 - 2021 Rob Wu <rob@robwu.nl>  
Copyright (C) 2024 Kurbanali Ruslan <kurr.eax@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
