# AGENTS.md — vite-plugin-backloop.dev

Quick reference for AI agents using this package.

## What it does

One-line HTTPS for the Vite dev server, with a real (publicly trusted) certificate. Any subdomain of `*.backloop.dev` resolves to `127.0.0.1` / `::1`, so the browser sees a valid HTTPS origin while everything stays on your machine.

## Usage

```js
// vite.config.js
import { defineConfig } from 'vite';
import backloop from 'vite-plugin-backloop.dev';

export default defineConfig({
  plugins: [
    backloop('myapp')          // optional: subdomain; omit for the machine default
  ]
});
```

`npm run dev` then serves on `https://myapp.backloop.dev:<port>/` (or `https://<default>.backloop.dev:<port>/` if no subdomain is given).

The plugin only applies to `serve` (dev), never to builds. It sets `server.host`, `server.https` and optionally `server.port` — remove any conflicting manual `server.https` config.

## Notes

- Certificates come from the [backloop.dev](https://www.npmjs.com/package/backloop.dev) dependency: the private key is generated locally and a CSR is sent to the backloop.dev issuance API, which completes the ACME DNS-01 challenge. Install/runtime need network access (see that package's AGENTS.md for offline workarounds).
- **The private key never leaves the machine and is never published.** Do not treat the certificate as a shared/public secret — only the public cert material is.
- The plugin imports named exports (`httpsOptionsPromise`) from `backloop.dev`, which the package's `src/index.mjs` re-exports.
- Source: a single file, `index.js`. Types in `index.d.ts`.
- Repo: https://github.com/Nouvborne/backloop.dev (`vitejs/` folder) — see the root AGENTS.md for monorepo conventions.
