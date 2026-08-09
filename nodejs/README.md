# backloop.dev

[![npm](https://img.shields.io/npm/v/backloop.dev)](https://www.npmjs.com/package/backloop.dev) [![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

Do SSL HTTPS requests on **Localhost** using a domain and SSL certificates pointing to your local environment.

**https://\<any subdomain>.backloop.dev/ → https://localhost/**

Any subdomain of `*.backloop.dev` points to `localhost`!

--------------------------------------------------

**Exception:** `backloop.dev`, which points to the website, and `api.backloop.dev`, which powers certificate issuance.


## Why?

**backloop.dev** solves [mixed-content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content) issues when developing a WebApp or Backend on local environment while accessing resources on remote HTTPS sources.

The issue is often raised by the [same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) mechanism that restricts the loading of resources from another origin unless this can be allowed by sending correct [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) headers.

Which anyway will fall back on the must-have "non-mixed-content" (no HTTP & HTTPS).

But making requests to **HTTPS APIs** from **HTTP** sites on **localhost** would not be possible without changing security options on your browser, which is why **backloop.dev** provides SSL certificates with a full loopback domain, to let anyone benefit from a signed certificate on **localhost**.

## How it works

- `*.backloop.dev` resolves to `127.0.0.1` / `::1` (public DNS).
- On first use, this package **generates a private key on your machine** — it never leaves it.
- It sends only a certificate signing request (CSR) for your subdomain to the `backloop.dev` issuance API (`https://api.backloop.dev/cert`), which completes the ACME DNS-01 challenge with Let's Encrypt (it controls the DNS) and returns a **publicly trusted certificate** for your subdomain.
- The certificate is stored locally, refreshed automatically when close to expiry, and served by your local HTTPS server.

No private key is ever published, which keeps the service compliant with the [Let's Encrypt Subscriber Agreement](https://letsencrypt.org/repository/) (disclosing private keys is prohibited and leads to revocation).

## Certificate files

Certificates are not bundled with the npm package. They are requested from the [backloop.dev](https://backloop.dev) issuance API at installation and runtime, or manually with `backloop.dev-update`. They are stored in the package `certs/` directory by default; to specify a custom location, set the environment variable `BACKLOOP_DEV_CERTS_DIR`.

The local `certs/` directory contains:
- `backloop.dev-key.pem` — **your private key** (never uploaded, never published)
- `backloop.dev-cert.crt` / `backloop.dev-ca.crt` / `backloop.dev-bundle.crt` — the public certificate material
- `pack.json` — metadata (hostnames, expiry), no secrets

If the certificate is outdated or missing, it is issued/refreshed at boot.

### Subdomain selection

The certificate is valid for the subdomain(s) of `*.backloop.dev` you use. By default this is your machine hostname (sanitized). Override it with the `BACKLOOP_DEV_SUBDOMAIN` environment variable (comma-separated for multiple):

```bash
export BACKLOOP_DEV_SUBDOMAIN=myapp
```

## Usage

### Installation

```
npm install backloop.dev [-g]
```
Add `-g` to use `backloop.dev` and `backloop.dev-proxy` globally.

### Command line

(Don't forget to prefix commands with `npx` if not installed globally.)

#### Static file server

Serve the contents of a directory on `https://<subdomain>.backloop.dev:<port>/`:

```
backloop.dev <path> [<port>]
```

Example:
```bash
BACKLOOP_DEV_SUBDOMAIN=myapp backloop.dev ./dist 4443
# Server started on port 4443 serving files in './dist'
# Open https://myapp.backloop.dev:4443/
```

#### Reverse proxy

Proxy requests from `https://<subdomain>.backloop.dev:<port>/` to a backend.
Supports `http://` and `https://` targets, with optional base path.
Note: adds `x-forwarded-proto: https` to headers for express-session and similar services.

```
backloop.dev-proxy <target> [<port>]
```

Where `<target>` can be:
- `http://host[:port][/path]`
- `https://host[:port][/path]`
- `host[:port]` (legacy format, defaults to http)

Examples:
```bash
# Proxy to a local dev server
backloop.dev-proxy localhost:3000

# Proxy to an https backend with a base path
backloop.dev-proxy https://localhost:8443/api 4443
```

#### Multi-host config mode

Serve multiple hostnames from a single instance, each with its own static files or proxy target:

```
backloop.dev --config=<config.json>
```

Config file format:
```json
{
  "port": 7654,
  "hostnames": {
    "app": { "path": "./dist" },
    "api": { "proxy": "http://localhost:3000/v1" },
    "admin": { "proxy": "https://anotherwebsite.com:8443" }
  }
}
```

This starts a single server on port 7654 where:
- `https://app.backloop.dev:7654/` serves static files from `./dist`
- `https://api.backloop.dev:7654/` proxies to `http://localhost:3000/v1`
- `https://admin.backloop.dev:7654/` proxies to `https://anotherwebsite.com:8443`

The configured hostnames are covered by the requested certificate, so a single certificate is issued for all of them.

Paths are resolved relative to the config file location.

**Path-based routing** is also supported. Use `hostname/path/` keys (trailing slash required) to route different URL prefixes to different handlers on the same hostname:

```json
{
  "port": 7654,
  "hostnames": {
    "tom/static/": { "path": "./public" },
    "tom/": { "proxy": "http://localhost:3000" }
  }
}
```

Here `https://tom.backloop.dev:7654/static/app.js` serves `./public/app.js`, while `https://tom.backloop.dev:7654/api/users` proxies to `http://localhost:3000/api/users`. The longest matching prefix wins.

#### Certificate update

Manually force a refresh of the certificate:

```
backloop.dev-update
```

### From a node app

#### ES6 Module

```js
import httpsOptions from 'backloop.dev';
import https from 'https';

https.createServer(httpsOptions, (req, res) => {
  res.writeHead(200);
  res.end('hello world\n');
}).listen(8443);

// https://<httpsOptions.hostname>.backloop.dev:8443/
```

#### CommonJS

```js
const https = require('https');
const httpsOptionsAsync = require('backloop.dev').httpsOptionsAsync;

httpsOptionsAsync(function (err, httpsOptions) {
  https.createServer(httpsOptions, (req, res) => {
    res.writeHead(200);
    res.end('hello world\n');
  }).listen(8443);
});
```

Or with promises:

```js
const https = require('https');
const httpsOptionsPromise = require('backloop.dev').httpsOptionsPromise;

(async () => {

  const httpsOptions = await httpsOptionsPromise();
  https.createServer(httpsOptions, (req, res) => {
    res.writeHead(200);
    res.end('hello world\n');
  }).listen(8443);

})();
```

The returned object also carries `hostname` (and `hostnames`): the subdomain(s) of `*.backloop.dev` the certificate is valid for. Use `httpsOptions.hostname` to build your URL.

The following is not recommended as it will crash your app if the certificates are expired. It will however refresh them for your next boot ;).

```js
const https = require('https');
const options = require('backloop.dev').httpsOptions();

https.createServer(options, (req, res) => {
  res.writeHead(200);
  res.end('hello world\n');
}).listen(8443);
```

#### Express

```js
const https = require('https');
const httpsOptionsAsync = require('backloop.dev').httpsOptionsAsync;
const express = require('express');
const app = express();

// ...your code...

httpsOptionsAsync(function (err, httpsOptions) {
  https.createServer(httpsOptions, app).listen(8443);
});
```

#### VueJs

```js
// consider  `await require('backloop.dev').httpsOptionsPromise()`
const backloopHttpsOptions = require('backloop.dev').httpsOptions();
backloopHttpsOptions.https = true;
backloopHttpsOptions.host = backloopHttpsOptions.hostname + '.backloop.dev';

module.exports = {
  // ...your options...
  devServer: backloopHttpsOptions
};
```

Now `vue-cli-service serve` will be served on `https://<your hostname>.backloop.dev`

#### ViteJs

File: `vite.config.js`

```js
import { defineConfig } from 'vite';
import backloopHttpsOptions from 'backloop.dev';

export default defineConfig({
  server: {
    port: 4443,
    host: backloopHttpsOptions.hostname + '.backloop.dev',
    https: backloopHttpsOptions
  },
  // ... //
});
```

Now `npm run dev` will be served on `https://<your hostname>.backloop.dev`
There is also a ViteJS plugin that does the same: [vite-plugin-backloop.dev](https://www.npmjs.com/package/vite-plugin-backloop.dev).

## Security

Your private key never leaves your machine, and no private key is published by the service. However, anyone can ask the issuance API for a certificate for any subdomain of `*.backloop.dev` (that is the point of a zero-registration service).

What if `*.backloop.dev` DNS A and AAAA entries are not pointing to `127.0.0.1` and `::1` but to another IP (malicious ones)?
Then your HTTPS requests will not end up on your machine, but on these malicious servers — and a certificate exists for your subdomain.

Even if this is very unlikely to happen, you may want to be on the safe side by adding `<what you need>.backloop.dev` in your `/etc/hosts` file.

```
127.0.0.1 localhost whatever.backloop.dev ...
::1 localhost whatever.backloop.dev ...
```

## Testing

```
npm test
```

Uses Node.js built-in test runner (requires Node.js 18+). Tests generate a local self-signed certificate and run fully offline.

## Contributing

`npm run lint` lints the code with [neostandard](https://github.com/neostandard/neostandard).

Pull requests are welcome.

The code to issue certificates (the API) and publish the website is [here on github](https://github.com/Nouvborne/backloop.dev/tree/main/renew)

## License

[BSD-3-Clause](https://github.com/Nouvborne/backloop.dev/blob/main/LICENSE)
