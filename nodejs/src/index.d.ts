/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */

/**
 * HTTPS options for use with Node.js https.createServer()
 */
export interface HttpsOptions {
  /** Private key in PEM format (generated locally, never uploaded) */
  key: string;
  /** Leaf certificate in PEM format, valid for hostname(s) */
  cert: string;
  /** Issuer (CA) chain in PEM format */
  ca: string;
  /** First hostname (subdomain of backloop.dev) the certificate is valid for */
  hostname: string;
  /** All hostnames (subdomains of backloop.dev) the certificate is valid for */
  hostnames: string[];
}

/**
 * Options accepted by httpsOptions* functions.
 */
export interface HttpsOptionsRequest {
  /** Subdomains of backloop.dev the certificate must cover */
  hostnames?: string[];
  /** Force a refresh even if the certificate is still fresh */
  force?: boolean;
}

/**
 * Callback for httpsOptionsAsync
 */
export type HttpsOptionsCallback = (error: Error | null, options?: HttpsOptions) => void;

/**
 * Synchronously returns HTTPS options for backloop.dev certificates.
 * If certificates are missing or expired, attempts an automatic update
 * and exits the process.
 *
 * @param opts - Optional hostnames/force options
 * @returns HTTPS options object with key, cert, ca, hostname and hostnames properties
 *
 * @example
 * ```js
 * const https = require('https');
 * const { httpsOptions } = require('backloop.dev');
 *
 * https.createServer(httpsOptions(), app).listen(443);
 * ```
 */
export function httpsOptions(opts?: HttpsOptionsRequest): HttpsOptions;

/**
 * Asynchronously retrieves HTTPS options using a callback.
 * Updates certificates if needed before returning.
 *
 * @param done - Callback called with (error, options)
 * @param opts - Optional hostnames/force options
 *
 * @example
 * ```js
 * const { httpsOptionsAsync } = require('backloop.dev');
 *
 * httpsOptionsAsync((err, options) => {
 *   if (err) throw err;
 *   https.createServer(options, app).listen(443);
 * });
 * ```
 */
export function httpsOptionsAsync(done: HttpsOptionsCallback, opts?: HttpsOptionsRequest): void;

/**
 * Asynchronously retrieves HTTPS options using a Promise.
 * Updates certificates if needed before returning.
 *
 * @param opts - Optional hostnames/force options
 * @returns Promise resolving to HTTPS options
 *
 * @example
 * ```js
 * const { httpsOptionsPromise } = require('backloop.dev');
 *
 * const options = await httpsOptionsPromise();
 * https.createServer(options, app).listen(443);
 * ```
 */
export function httpsOptionsPromise(opts?: HttpsOptionsRequest): Promise<HttpsOptions>;
