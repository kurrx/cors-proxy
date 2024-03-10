# cors-proxy

## Overview

**CORS Proxy** is a NodeJS reverse proxy server which adds CORS headers to the proxied request.

This project is a direct derivative work of [**CORS Anywhere**](https://github.com/Rob--W/cors-anywhere).

The url to proxy is literally taken from the path, validated and proxied. URL is validated with [`URL.canParse()`](https://nodejs.org/api/url.html#urlcanparseinput-base) method of NodeJS URL API.

This package does not put any restrictions on the http methods or headers, except for cookies ([read more](#cookies)). Requesting [user credentials](http://www.w3.org/TR/cors/#user-credentials) is disallowed. The app can be configured to require a header for proxying a request, for example to avoid a direct visit from the browser.

## Motivation

For most use cases [**CORS Anywhere**](https://github.com/Rob--W/cors-anywhere) provides all functionality you may need. However, I needed to modify the response headers before sending it to a user. If that's what you are looking for, feel free to give it a try!

Main differences between **CORS Proxy** and **CORS Anywhere**:

- Added `isEmptyOriginAllowed` callback option to identify is it allowed or not to specific request to be proxied if `Origin` header is empty. (eg. when you proxying files that can be opened in browser tab)
- Added `handleResponse` callback option to modify response before sending it to user.
- Added `isAllowedToFollowRedirect` callback option to identify is it allowed or not to follow redirects that target sends.
- Added [`X-Proxy-*`](#x-proxy--headers) headers
- Better autocompletion of `createServer()` options types and added descriptions for each option

## Getting Started

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

### Usage

You can edit `server.js` file in root directory to change the way server proxies requests. All available options you can see [here](#options).

```js
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
```

Request examples:

- `http://localhost:4001/http(s)://google.com/any/nesting/level` - google.com with CORS headers
- `http://localhost:4001/http://localhost:8080/` - localhost:8080 with CORS headers
- `http://localhost:4001/invalid` - Replies 400 Bad Request because `invalid` is not valid URL

## Documentation

### Options

#### `IncomingMessageWithProxyState` interface

Extends client `IncomingMessage` request with `proxyState` object. You can access this object with `req.proxyState` (do not modify these options, you may break some internal logic).

```ts
interface IncomingMessageWithProxyState extends IncomingMessage {
  proxyState: {
    proxyBaseUrl: string
    location: URL | null
    origin: string
    headers: Record<string, string>
    redirectCount: number
  }
}
```

- `proxyBaseUrl` - Base URL of the proxy server. Used to change redirect location to the proxy server.  
  _Example:_ If target responds with 3XX code and with `https://google.com` location header (in case when following redirect is not allowed), then we modify it to `http://localhost:4001/https://google.com`.

- `location` - Parsed `URL` object of the target url. If url is not valid, then it will be `null`.

- `origin`- origin of the request. If header is not present, then it will be empty string.

- `headers` - Headers that is sent to the target.

- `redirectCount` - Number of redirects followed.

#### `Options` interface

`src/index.js` exports `createServer(options)` function, which creates a server that handles proxy requests. The following options are supported:

```ts
type RequestCallback = (req: IncomingMessageWithProxyState, res: ServerResponse) => boolean
type ResponseCallback = (
  req: IncomingMessageWithProxyState, // Client request
  res: ServerResponse, // Client response
  proxyReq: IncomingMessage, // Proxy request
  proxyRes: ServerResponse, // Proxied response
) => boolean

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

- `proxyHttps` - TODO (Default: `false`)

- `maxRedirects` - Maximum number of redirects to follow (default: `5`)

- `originWhitelist` - If set, requests whose origin is not listed are blocked. If this list is empty, all origins are blocked (default: `[]`)

- `originBlacklist` - If set, requests whose origin is listed are blocked (default: `[]`)

- `redirectSameOrigin` - If true, requests to URLs from the same origin will not be proxied but redirected. The primary purpose for this option is to save server resources by delegating the request to the client (since same-origin requests should always succeed, even without proxying). (default: `false`)

- `requireHeaders` - If set, the request must include this header or the API will refuse to proxy. Recommended if you want to prevent users from using the proxy for normal browsing (default: `[]`)

- `removeHeaders` - Exclude certain headers from being included in the request (default: `['cookie']`)

- `addHeaders` - Set headers for the request (overwrites existing ones, but can be overwritten by [`X-Proxy-*`](#x-proxy--headers) headers) (default: `{}`)

- `corsMaxAge` - If set, an Access-Control-Max-Age request header with this value (in seconds) will be added (default: `0`)

- `handleInitialRequest` - If set, it is called right after parsing url. If the function returns true, the request will not be handled further. Then the function is responsible for handling the request. This feature can be used to passively monitor requests, for example for logging it should return `false` (default: `null`)

- `isEmptyOriginAllowed` - If set as callback, it is called when `Origin` header is empty to decide is it allowed to proxy current request or not (default: `true`)

- `checkRateLimit` - You can implement rate limiting here. If this function returns a non-empty string, the request is rejected and the string is send to the client (default: `null`)

- `handleResponse` - If set, it is called before sending response to the user. If the function returns true, the response will not be sent to the user. Then the function is responsible for handling the response. This feature can be used to add some headers before sending it to user, for example you can set `Content-Disposition` header to make file downloadable from browser if target sends file, in that case you should return `false` (default: `null`)

- `isAllowedToFollowRedirect` - If set as callback, it is called when target responds with 3XX status code to decide to follow redirect or not (default: `true`)

- `httpProxyOptions` - Under the hood, [http-proxy](https://github.com/nodejitsu/node-http-proxy) is used to proxy requests. Use this option if you really need to pass options to http-proxy. The documentation for these options can be found [here](https://github.com/http-party/node-http-proxy#options). (default: `{ xfwd: false }`)

### `X-Proxy-*` headers

This feature designed to overwrite browsers list of disallowed headers (eg. setting custom `User-Agent` on browser will throw an error). You can set `X-Proxy-*` headers to overwrite original headers before sending request to the target.

Example: Client is sending request with `User-Agent` header, but target rejects request for some reason. In that case you can set `X-Proxy-User-Agent` header with other value and it will overwrite `User-Agent` header before sending request to the target.

### Cookies

Cookies are not proxied. If the target sets a cookie, it will be deleted from response headers. If the client sends a cookie, it will be deleted from response headers (default of `removeHeaders` option). This is because the server is not intended to be used for normal browsing, and it is not safe to proxy cookies. But there are few workarounds for that:

- You can set `X-Proxy-Cookie` header to overwrite `Cookie` header before sending request to the target.
- You can use `rewriteCookies()` function that is exported from `src/utils.js` inside of `handleResponse` callback to rewrite cookies before sending response to the user. Basically this function rewrites all `Set-Cookie` headers sent from the target to `X-Proxy-Set-Cookie-{num}` headers and deletes original `Set-Cookie` headers. Where `num` is number from `1` to `X-Proxy-Cookies-Count`. Then you can use `X-Proxy-Set-Cookie-{number}` headers to store cookies on the client side.
- Use `cookieDomainRewrite` option from `http-proxy` to rewrite cookies domain before sending it to the client:  
  You also need to comment `delete proxyRes.headers['set-cookie']` inside of `src/handle.js` file to make it work.

I do not recommend to use cookies with this server, but if you really need to use it, then you can use one of the workarounds above.

### Client

To use the API, just prefix the URL with the API URL. You can use like that:

```js
const corsProxiedApi = axios.create({
  baseURL: 'http://localhost:4001/https://api.corsless.com/',
})

// http://localhost:4001/https://corsless.com/endpoint
corsProxiedApi.get('/endpoint').then(res => {
  console.log(res.data)
})
```

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
