# Changelog

## 4.0.0

### Breaking changes
- **No more shared certificate.** Private keys are no longer published or downloaded from `pack.json`. Publishing a private key violates the Let's Encrypt Subscriber Agreement (and caused revocation), so the shared wildcard certificate is gone.
- Certificates are now **issued per developer**: the package generates a private key locally, sends only a CSR to the backloop.dev issuance API (`https://api.backloop.dev/cert`), which completes the ACME DNS-01 challenge and returns a publicly trusted certificate for your subdomain(s). The private key never leaves your machine.
- `pack.json` no longer contains `key1`/`key2`/`cert`/`ca` — only metadata (`hostnames`, `info.notAfter`). Old `pack.json` files are ignored.
- `httpsOptions*()` now also return `hostname` (and `hostnames`): the subdomain(s) the certificate is valid for. Use it to build your URL (e.g. `https://${options.hostname}.backloop.dev`).
- `httpsOptions*()` accept an optional `{ hostnames: [...] }` argument (used by multi-host config) and `{ force: true }`.
- Subdomain selection: `BACKLOOP_DEV_SUBDOMAIN` env var (comma-separated) > hostnames persisted locally > sanitized machine hostname.
- New dependency: `node-forge` (local key + CSR generation).

### Changes
- `bin/update.js` (postinstall) is now best-effort: it warns instead of failing `npm install` when the API is unreachable/offline.
- Multi-host mode requests a certificate covering all configured hostnames.
- Tests are fully offline (seeded self-signed certificate via `test/helpers.js`).

## 3.0.3
- Added `AGENTS.md` (guidance for AI coding agents), shipped with the package
- Added `files` field to package.json: tarball no longer includes `test/`, `eslint.config.js` and the example `config.json`

## 3.1.0

### New features
- **Multi-host config mode**: Serve multiple hostnames from a single instance using `backloop.dev --config=<file>`. Each hostname can independently serve static files or proxy to a backend.
- **HTTPS proxy support**: Proxy can now target `https://` backends in addition to `http://`.
- **Proxy path support**: Proxy targets can include a base path (e.g. `http://localhost:3000/api`), which is prepended to all proxied requests.

### Changes
- `backloop.dev-proxy` now accepts full URL format: `backloop.dev-proxy https://host:port/path [port]` (legacy `host:port` format still supported).
- Refactored static server and proxy into reusable handler factories (`createStaticHandler`, `createProxyHandler`).
- Added test suite using Node.js built-in test runner (24 tests).

### Config file format
```json
{
  "port": 6667,
  "hostnames": {
    "app": { "path": "./dist" },
    "api": { "proxy": "http://localhost:3000/v1" },
    "secure": { "proxy": "https://backend:8443" }
  }
}
```

## 3.0.1
- Package version update

## 3.0.0
- Removed Express dependency
- Pure Node.js HTTPS server and proxy
- Added TypeScript definitions
- Added ES Module support
