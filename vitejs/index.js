/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
import { httpsOptionsPromise } from 'backloop.dev';

/**
 * Vite plugin for backloop.dev HTTPS local development.
 *
 * The plugin requests a certificate for the given `hostname` (or the
 * machine's default backloop.dev subdomain) and serves Vite over
 * https://<hostname>.backloop.dev:<port>/ with a publicly trusted certificate.
 *
 * @param {string} [hostname] - subdomain to use (e.g. 'myapp' becomes myapp.backloop.dev).
 *   Omit to use the default subdomain issued to this machine.
 * @param {number} [port] - optional port for the dev server
 */
function backloop(hostname, port) {
  return {
    name: 'backloop.dev',
    apply: 'serve',
    async config(options) {
      options.server = options.server || {};
      const opts = await httpsOptionsPromise(hostname ? { hostnames: [hostname] } : undefined);
      const host = hostname || opts.hostname;
      options.server.host = `${host}.backloop.dev`;
      options.server.https = opts;
      options.server.port = port || options.server.port;
    }
  };
}

export default backloop;
