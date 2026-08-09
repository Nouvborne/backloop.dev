# AGENTS.md — backloop.dev (monorepo)

Guidance for AI coding agents working on this repository.

## What this project is

`backloop.dev` provides HTTPS on localhost for local development:

- DNS: **any** subdomain of `*.backloop.dev` resolves to `127.0.0.1` and `::1`.
- Certificates are **issued per developer**: the npm package generates a private key locally and sends only a CSR to the issuance API (`https://api.backloop.dev/cert`), which completes the ACME DNS-01 challenge with Let's Encrypt and returns a publicly trusted certificate for the requested subdomain(s).
- **No private key is ever uploaded or published.** This is a hard requirement — publishing private keys violates the Let's Encrypt Subscriber Agreement and causes revocation.
- Certificates are **not bundled** in the npm package: they are issued at install time (postinstall, best-effort) and refreshed at runtime when close to expiry.

The apex `backloop.dev` points to the website (GitHub Pages); `api.backloop.dev` is an explicit DNS record that powers certificate issuance.

## Repository map

| Path | What it is |
|---|---|
| `nodejs/` | The `backloop.dev` npm package: Node API (`httpsOptions*`), CLI static server, reverse proxy, multi-host config server, local key + CSR generation and API round-trip. Most of the code and docs live here. |
| `vitejs/` | The `vite-plugin-backloop.dev` npm package: thin Vite plugin wrapping `nodejs/`. |
| `renew/` | Certificate infrastructure: per-developer issuance API (`src/server.js`, Let's Encrypt ACME DNS-01 + Gandi DNS) and wildcard renewal used to keep the website/API certs alive. Needs secrets (`ACME_ACCOUNT_*`, `GANDI_API_TOKEN`). **Do not modify unless explicitly asked.** |
| `.github/workflows/` | Scheduled certificate renewal. |
| branch `gh-pages` | The https://backloop.dev website: cert material, `pack.json`, `llms.txt`, `robots.txt`. Jekyll-rendered README. No private keys here. |
| branch `renew-gh-pages` | Publishing target used by the renewal job. |

There is no root `package.json`: `nodejs/`, `vitejs/` and `renew/` are independent npm projects.

## Develop and test

```bash
cd nodejs
npm install
npm test          # Node.js built-in test runner (Node 18+ required), fully offline
npm run lint      # eslint with neostandard
```

`vitejs/` has no tests; `renew/` cannot be run without production secrets.

## Gotchas

- `npm install` in `nodejs/` triggers `postinstall: node bin/update.js`, which is **best-effort**: it contacts `https://api.backloop.dev/cert` and exits 0 on failure, so installs work offline. For a fully offline install use `npm install --ignore-scripts` and pre-seed `BACKLOOP_DEV_CERTS_DIR` with a valid key + cert + `pack.json`.
- `src/check.js` creates the certs directory if missing (default `nodejs/certs/`, kept by `.gitkeep`).
- The local `certs/` dir contains a **private** `backloop.dev-key.pem` (mode 0600) — it must never be committed, uploaded, or published. `pack.json` is metadata only (hostnames, expiry) and contains no secrets.
- Anyone can obtain a certificate for any subdomain (zero-registration service by design). The only protection against a poisoned DNS redirecting you to a malicious server that holds a cert for your subdomain is pinning the name locally (e.g. `/etc/hosts`). Do not "fix" this with registration — it would kill the zero-setup promise.

## Conventions

- License: BSD-3-Clause. Source files carry a `@license` header, managed via `.licenser.yml`.
- Lint style: [neostandard](https://github.com/neostandard/neostandard) (no semicolon-free style — run `npm run lint` before committing).
- `nodejs/CHANGELOG.md` is updated for every release; version lives in `nodejs/package.json`.
- `vitejs/` depends on `backloop.dev` with a `^` range — when releasing a breaking change in `nodejs/`, also update and release `vitejs/`.
- Keep `nodejs/README.md` the canonical documentation; the root README and the website only summarize and link to it.

## Documentation surfaces to keep in sync

When user-facing behavior changes, update all that apply:

1. `nodejs/README.md` (canonical docs, shipped to npm)
2. `nodejs/AGENTS.md` and `vitejs/AGENTS.md` (shipped to npm)
3. Root `README.md`
4. `gh-pages` branch: `README.md`, `llms.txt`, `llms-full.txt` (the website)
