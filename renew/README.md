# `backloop.dev` renew

Certificate infrastructure for backloop.dev:

- **Per-developer issuance API** (`src/server.js`) — the [backloop.dev](https://github.com/Nouvborne/backloop.dev) npm package sends a CSR for a subdomain, and this server completes the ACME DNS-01 challenge with Let's Encrypt via Gandi DNS. **The private key is generated on the developer's machine and never touches this server.**
- **Wildcard renewal** (`src/index.js`) — renews `*.backloop.dev` and publishes only the *public* certificate material to the `gh-pages/` branch. No private key is ever written to or published from `gh-pages/` (publishing keys violates the Let's Encrypt Subscriber Agreement).

The renewal is managed by a GitHub workflow (see `../.github/workflows`).

## Installation

```
npm install
npm run setup   # clone gh-pages branch as a directory
```

## Account creation

First you need to create an account on Letsencrypt with:
  - Staging: `BACKLOOP_EMAIL={your email} node ./src/createAccount.js`
  - Production: `IS_PRODUCTION=true BACKLOOP_EMAIL={your email} node ./src/createAccount.js`

Keep the values of `Account key` and `Account Url` respectively in environment variables `ACME_ACCOUNT_KEY` and `ACME_ACCOUNT_URL`. They are used by the renewal script and the API. You need to do this only once per environment.

## Issuance API (per-developer certificates)

The API is an HTTP server. Required environment variables:

- `ACME_ACCOUNT_URL` and `ACME_ACCOUNT_KEY` — the Let's Encrypt account
- `GANDI_API_TOKEN` — a gandi.net API key that can update `backloop.dev` DNS (https://api.gandi.net/docs/authentication/)

Optional environment variables:

- `PORT` (default `8080`), `BACKLOOP_DOMAIN` (default `backloop.dev`)
- `IS_PRODUCTION=true` — use Let's Encrypt production (otherwise **staging**)
- `API_RATE_LIMIT_HOURLY` (default `5`), `API_RATE_LIMIT_DAILY` (default `20`) — per-IP limits
- `API_GLOBAL_WEEKLY` (default `49`) — global cap, deliberately under Let's Encrypt's 50 certs/week/registered-domain limit

Run:

```
IS_PRODUCTION=true npm run api
```

Endpoints:

- `POST /cert` with body `{ "csr": "<PEM CSR>" }` → `{ cert, ca, notAfter }`. The CSR must request one or more subdomains of `backloop.dev` (no apex, no wildcard, `api.*` is reserved). The server validates every name, sets the `_acme-challenge.<sub>` TXT records via Gandi, and completes the order.
- `GET /healthz` → `{ ok: true }`

### Deployment notes

- `*.backloop.dev` resolves to `127.0.0.1`, so the API must be served from a **dedicated hostname with an explicit DNS record** that overrides the wildcard: add an `A`/`AAAA` record for `api.backloop.dev` pointing at the API server's public IP. Explicit records take precedence over the wildcard.
- Give `api.backloop.dev` its own TLS certificate (e.g. via the same ACME DNS-01 flow, or terminate TLS at a reverse proxy).
- Run it behind a process manager and keep the ACME account secrets in a secret store.

## Wildcard renewal

To create new certificates, you need to set the following environment variables:
  - `ACME_ACCOUNT_URL` - generated on the previous step
  - `ACME_ACCOUNT_KEY` - generated on the previous step
  - `GANDI_API_TOKEN` - A gandi.net's ApiKey that allows to update your domain [Read more](https://api.gandi.net/docs/authentication/)

Run:
  - Staging: `npm start`
  - Production: `IS_PRODUCTION=true npm start`

This generates the wildcard certificate and writes the **public** cert material into `gh-pages/` (checkout of the `gh-pages` branch). The workflow also removes any legacy `*-key.part*.pem` files from the published branch.

Add `IS_PRODUCTION=true` to use Let's Encrypt's production API **which has a call limit!**

## CONTRIBUTING

- Pull requests are welcome

You may want to contribute to this repository to make it work for your own domain name or to support validation on other registrars (DNS services) than gandi.net

## License

[BSD-3-Clause](https://github.com/Nouvborne/backloop.dev/blob/main/LICENSE)
