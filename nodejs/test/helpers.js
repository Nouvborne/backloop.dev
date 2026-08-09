/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const forge = require('node-forge');

/**
 * Create a temporary certs directory seeded with a self-signed certificate so
 * tests run fully offline. Returns the directory path.
 * @param {string[]} hostnames - subdomains of backloop.dev to cover
 * @returns {string} path to the certs directory
 */
function setupCertsDir (hostnames) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backloop-certs-'));
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date(Date.now() - 24 * 3600 * 1000);
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 3600 * 1000);
  const attrs = [{ name: 'commonName', value: hostnames[0] + '.backloop.dev' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([{
    name: 'subjectAltName',
    altNames: hostnames.map(function (h) { return { type: 2, value: h + '.backloop.dev' }; })
  }]);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  fs.writeFileSync(path.join(dir, 'backloop.dev-key.pem'), forge.pki.privateKeyToPem(keys.privateKey));
  fs.writeFileSync(path.join(dir, 'backloop.dev-cert.crt'), forge.pki.certificateToPem(cert));
  fs.writeFileSync(path.join(dir, 'backloop.dev-ca.crt'), forge.pki.certificateToPem(cert));
  fs.writeFileSync(path.join(dir, 'backloop.dev-bundle.crt'), forge.pki.certificateToPem(cert));
  fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify({
    version: { num: 2 },
    domain: 'backloop.dev',
    hostnames,
    info: { notAfter: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString() }
  }));
  return dir;
}

module.exports = { setupCertsDir };
