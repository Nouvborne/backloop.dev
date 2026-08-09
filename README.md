# `backloop.dev` 

Loopback domain and SSL certs to handle HTTPS on localhost. 

## Why ?

When you locally develop web applications that intensively use AJAX REST requests. CORS layer is enforced by pure HTTPS only policies from browsers to avoid **mixed content** between HTTP & HTTPS sources.

Backloop.dev SSL certificates enable localhost HTTPS.

All `*.backloop.dev` hostnames point to `127.0.0.1` and `::1`. 

Certificates are issued **per developer**: your private key is generated locally and never leaves your machine; only a CSR is sent to the backloop.dev issuance API (`https://api.backloop.dev/cert`), which completes the Let's Encrypt DNS-01 challenge. No private key is ever published.

## CONTENT 

- [NodeJS](./nodejs) NPM package for usage in Node apps and command line tool to server local files or proxy web sites.
- [ViteJS](./vitejs/) ViteJS plugin for local development
- [The certificates](https://backloop.dev) Web page with instructions and the public certificate material.
- [Renew](./renew) Code that powers the per-developer issuance API and certificate renewal.

Most of the documentation is present on the [NodeJS](./nodejs) package 👈🏻

## For AI agents

- [AGENTS.md](./AGENTS.md) — repository map, dev commands and conventions for coding agents.
- [https://backloop.dev/llms.txt](https://backloop.dev/llms.txt) — LLM-readable summary of the project, with [llms-full.txt](https://backloop.dev/llms-full.txt) for the complete usage documentation in plain markdown.
- [https://backloop.dev/pack.json](https://backloop.dev/pack.json) — machine-readable public certificate material (cert, CA, validity dates — **no private key**).

## CONTRIBUTING

- Pull requests are welcome.

## License

[BSD-3-Clause](https://github.com/Nouvborne/backloop.dev/blob/main/LICENSE)
