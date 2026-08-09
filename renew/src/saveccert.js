/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const { write } = require('./files');

/**
 * Save a certificate to the gh-pages checkout.
 *
 * Only the PUBLIC certificate material is written. The private key is never
 * persisted into gh-pages: publishing a private key violates the Let's Encrypt
 * Subscriber Agreement and would get the certificate revoked.
 */
function save (domain, certificate) {
  write(['./gh-pages', domain + '-bundle.crt'], certificate);
  // strip bundle in ca + cert
  const FirstEnd = certificate.indexOf('-----END CERTIFICATE-----');
  const SecondBegin = certificate.indexOf('-----BEGIN CERTIFICATE-----', FirstEnd);
  write(['./gh-pages', domain + '-cert.crt'], certificate.substring(0, SecondBegin - 1));
  write(['./gh-pages', domain + '-ca.crt'], certificate.substring(SecondBegin));
}

module.exports = save;
