/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const { read, write } = require('./files');
const acme = require('acme-client');

async function pack (domain) {
  const res = {
    version: {
      num: 2,
      message: 'backloop.dev >= 4.0.0 is required; certificates are now issued per developer'
    },
    domain: domain,
    apiUrl: `https://api.${domain}/cert`,
    cert: read(['./gh-pages', domain + '-cert.crt']),
    ca: read(['./gh-pages', domain + '-ca.crt'])
  };
  res.info = await acme.forge.readCertificateInfo(res.cert);
  write(['./gh-pages', 'pack.json'], JSON.stringify(res, null, 2));
}

module.exports = pack;
