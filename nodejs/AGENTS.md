# AGENTS.md — backloop.dev (npm package)

Quick reference for AI agents using or modifying this package.

## What it does

HTTPS on localhost without self-signed certificates:

- Any subdomain of `*.backloop.dev` resolves to `127.0.0.1` / `::1` (public DNS).
- On first use the package generates a **private key locally**, sends only a CSR to the backloop.dev issuance API (`https://api.backloop.dev/cert`), which completes the ACME DNS-01 challenge with Let's Encrypt and returns a publicly trusted certificate for the requested subdomain(s).
- It exposes the material as ready-to-use `{ key, cert, ca, hostname, hostnames }` options for `https.createServer()`.

So `https://<your-subdomain>.backloop.dev:<port>/` reaches your local server with a valid certificate — no browser warnings, no mixed-content/CORS friction.

**No private key is ever uploaded or published.** This is a hard requirement: publishing a private key violates the Let's Encrypt Subscriber Agreement and gets certificates revoked.

## API (CommonJS and ESM)

```js
import httpsOptions from 'backloop.dev';                  // ESM default: sync, see caveat below
const { httpsOptions, httpsOptionsAsync, httpsOptionsPromise } = require('backloop.dev');
```

- `httpsOptionsPromise(opts?): Promise<{key, cert, ca, hostname, hostnames}>` — **preferred**; issues/refreshes the certificate if needed.
- `httpsOptionsAsync(done, opts?)` — callback flavor of the same.
- `httpsOptions(opts?)` — sync; if the certificate is missing/expired it triggers an update and **exits the process** (works on next start). Avoid in long-running tooling.

`opts`:
- `{ hostnames: ['app', 'api'] }` — subdomains of `*.backloop.dev` the certificate must cover (multi-host mode passes the configured hostnames).
- `{ force: true }` — refresh even if still fresh.

Subdomain selection order: `opts.hostnames` → `BACKLOOP_DEV_SUBDOMAIN` env var → hostnames persisted in local `pack.json` → sanitized machine hostname.

Types are in `src/index.d.ts`.

## CLI (npx or global install)

```bash
backloop.dev <path> [<port>]              # static file server on https://<subdomain>.backloop.dev:<port>/
backloop.dev-proxy <target> [<port>]      # reverse proxy to http(s)://host[:port][/path]
backloop.dev --config=<config.json>       # multi-host: route hostnames/paths to static dirs or proxies
backloop.dev-update                       # force certificate refresh
```

Multi-host config format (paths resolved relative to the config file):

```json
{
  "port": 7654,
  "hostnames": {
    "app": { "path": "./dist" },
    "api": { "proxy": "http://localhost:3000/v1" },
    "tom/static/": { "path": "./public" }
  }
}
```

Keys with a trailing `/` are path prefixes on a hostname; longest prefix wins. The configured hostnames are requested as the certificate's names.

## Certificates: where and when

- Certificates are **not bundled** and **not shared**. They are issued per developer through `POST https://api.backloop.dev/cert` (see `renew/src/server.js`), which validates the CSR and completes the ACME DNS-01 challenge via Gandi DNS.
- API endpoint configurable via `BACKLOOP_DEV_API_URL` (default `https://api.backloop.dev/cert`). Useful to point at a local staging API.
- Stored in `<package>/certs/` by default; override with the env var `BACKLOOP_DEV_CERTS_DIR` (the directory is created if missing).
- Files: `backloop.dev-key.pem` (private, mode 0600), `backloop.dev-cert.crt`, `backloop.dev-ca.crt`, `backloop.dev-bundle.crt`, `pack.json` (metadata only — hostnames, expiry; **no key**).
- **Offline/sandboxed environments**: `postinstall` (`bin/update.js`) is best-effort — it logs a warning and exits 0 if the API is unreachable, so `npm install` no longer hard-fails offline. The certificate is issued/refreshed at runtime. `npm install --ignore-scripts` also works; pre-seed `BACKLOOP_DEV_CERTS_DIR` with a valid key+cert+pack.json to be fully offline.
- Trust note: if you want to guard against DNS tampering, add `<name>.backloop.dev` to `/etc/hosts` pointing to `127.0.0.1`. Anyone can obtain a certificate for any subdomain (zero-registration service), so pinning the name locally is the only protection against a poisoned DNS redirecting you to a malicious server that has a cert for your subdomain.

## Developing this package

```bash
npm install
npm test        # Node.js built-in test runner, Node 18+ (tests are offline)
npm run lint    # eslint + neostandard
```

Layout: `src/index.js|mjs|d.ts` (API), `src/check.js` (key/CSR generation, API round-trip, refresh logic), `src/webserver/` (CLI server, proxy, multi-host config), `bin/` (CLI entry points), `test/` (offline tests seeded with a local self-signed certificate via `test/helpers.js`).

See the [repository AGENTS.md](https://github.com/Nouvborne/backloop.dev/blob/main/AGENTS.md) for monorepo-wide conventions. Full documentation: [README.md](./README.md).
