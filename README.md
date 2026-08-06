# `backloop.dev` 

Loopback domain and SSL certs to handle HTTPS on localhost. 

## Why ?

When you locally develop web applications that intensively use AJAX REST requests. CORS layer is enforced by pure HTTPS only policies from browsers to avoid **mixed content** between HTTP & HTTPS sources.

Backloop.dev SSL certificates enable localhost HTTPS.

All `*.backloop.dev` hostnames point to `127.0.0.1` and `::1`. 

## CONTENT 

- [NodeJS](./nodejs) NPM package for usage in Node apps and command line tool to server local files or proxy web sites.
- [ViteJS](./vitejs/) ViteJS plugin for local development
- [The certificates](https://backloop.dev) Web page from which you can download the SSL certificates.
- [Renew](./renew) Code that takes care of generating certificates regularly and publishing them.

Most of the documentation is present on the [NodeJS](./nodejs) package 👈🏻

## For AI agents

- [AGENTS.md](./AGENTS.md) — repository map, dev commands and conventions for coding agents.
- [https://backloop.dev/llms.txt](https://backloop.dev/llms.txt) — LLM-readable summary of the project, with [llms-full.txt](https://backloop.dev/llms-full.txt) for the complete usage documentation in plain markdown.
- [https://backloop.dev/pack.json](https://backloop.dev/pack.json) — machine-readable certificate bundle (cert, CA, split key, validity dates).

## CONTRIBUTING

- Pull requests are welcome.

## License

[BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
