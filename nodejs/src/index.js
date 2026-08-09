/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const check = require('./check');

/**
 * Build the https options object from a loaded certificate.
 */
function toOptions (actual) {
  return {
    key: actual.key,
    cert: actual.cert,
    ca: actual.ca,
    hostname: actual.hostnames[0],
    hostnames: actual.hostnames
  };
}

/**
 * Synchronously return https options. If the certificate is missing or
 * expired, triggers an update and exits the process (works on next start).
 * Avoid in long-running tooling.
 * @param {object} [opts] - same options as httpsOptionsPromise
 */
function httpsOptions (opts) {
  const actual = check.loadLocal();
  if (actual == null || actual.expirationDays < 0) {
    // lazyly try to update
    console.log('** Lazily trying to update the certificate on my own ...');
    httpsOptionsAsync(function (err, res) {
      if (err) {
        console.log('** Failed with error', err);
      } else if (res) {
        console.log('** Did it!! Killing your service... Just restart your service');
      }
      process.exit(1);
    }, opts);
    return { key: '', cert: '', ca: '' };
  }
  return toOptions(actual);
}

/**
 * @callback requestCallback
 * @param {error} error
 * @param {res} httpsOptions
 */

/**
 * @param {requestCallback} done
 * @param {object} [opts] - same options as httpsOptionsPromise
 */
function httpsOptionsAsync (done, opts) {
  httpsOptionsPromise(opts).then((res) => { done(null, res); }, done);
}

/**
 * @param {object} [opts]
 * @param {string[]} [opts.hostnames] - subdomains of backloop.dev the certificate must cover
 * @returns Promise<httpsOptions>
 */
async function httpsOptionsPromise (opts) {
  const actual = await check.updateAndLoad(opts || {});
  if (actual == null) throw new Error('Failed loading backloop.dev certificate');
  return toOptions(actual);
}

module.exports = {
  httpsOptions,
  httpsOptionsAsync,
  httpsOptionsPromise
};
