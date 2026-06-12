# AGENTS.md — vite-plugin-backloop.dev

Quick reference for AI agents using this package.

## What it does

One-line HTTPS for the Vite dev server, with a real (Let's Encrypt-signed) certificate. Any subdomain of `*.backloop.dev` resolves to `127.0.0.1` / `::1`, so the browser sees a valid HTTPS origin while everything stays on your machine.

## Usage

```js
// vite.config.js
import { defineConfig } from 'vite';
import backloop from 'vite-plugin-backloop.dev';

export default defineConfig({
  plugins: [
    backloop('myapp')          // optional second arg: port
  ]
});
```

`npm run dev` then serves on `https://myapp.backloop.dev:<port>/`.

The plugin only applies to `serve` (dev), never to builds. It sets `server.host`, `server.https` and optionally `server.port` — remove any conflicting manual `server.https` config.

## Notes

- Certificates come from the [backloop.dev](https://www.npmjs.com/package/backloop.dev) dependency: downloaded at install time and auto-refreshed. Install needs network access (see that package's AGENTS.md for offline workarounds).
- The certificate is intentionally public; it only secures loopback traffic.
- Source: a single file, `index.js`. Types in `index.d.ts`.
- Repo: https://github.com/perki/backloop.dev (`vitejs/` folder) — see the root AGENTS.md for monorepo conventions.
