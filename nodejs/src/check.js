/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const forge = require('node-forge');

const domain = process.env.BACKLOOP_DEV_DOMAIN || 'backloop.dev';
const apiUrl = process.env.BACKLOOP_DEV_API_URL || `https://api.${domain}/cert`;
const certsPath = process.env.BACKLOOP_DEV_CERTS_DIR || path.resolve(__dirname, '../certs/');

const versionNum = 2;
const RENEW_THRESHOLD_DAYS = 30;

const keyFile = path.resolve(certsPath, 'backloop.dev-key.pem');
const certFile = path.resolve(certsPath, 'backloop.dev-cert.crt');
const caFile = path.resolve(certsPath, 'backloop.dev-ca.crt');
const bundleFile = path.resolve(certsPath, 'backloop.dev-bundle.crt');
const packPath = path.resolve(certsPath, 'pack.json');

/**
 * Resolve the hostnames (subdomains of `domain`) this install should have a
 * certificate for. Priority:
 *   1. `hostnames` option (e.g. from the multi-host CLI config)
 *   2. `BACKLOOP_DEV_SUBDOMAIN` env var (comma separated)
 *   3. hostnames already persisted in the local pack.json
 *   4. the machine hostname, sanitized
 */
function resolveHostnames (requested) {
  if (Array.isArray(requested) && requested.length > 0) {
    return normalizeHostnames(requested);
  }
  const fromEnv = process.env.BACKLOOP_DEV_SUBDOMAIN || process.env.BACKLOOP_DEV_HOST;
  if (fromEnv) {
    return normalizeHostnames(fromEnv.split(','));
  }
  const persisted = loadPack();
  if (persisted && Array.isArray(persisted.hostnames) && persisted.hostnames.length > 0) {
    return normalizeHostnames(persisted.hostnames);
  }
  return [defaultHostname()];
}

function normalizeHostnames (hostnames) {
  const seen = new Set();
  const out = [];
  for (const raw of hostnames) {
    let h = String(raw).trim().toLowerCase();
    if (h.endsWith('.' + domain)) h = h.slice(0, -('.' + domain).length);
    if (h === '' || h === domain) continue;
    if (h.startsWith('*.')) h = h.slice(2);
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(h)) continue;
    if (h.length > 63) h = h.slice(0, 63);
    if (!seen.has(h)) {
      seen.add(h);
      out.push(h);
    }
  }
  return out.length > 0 ? out : [defaultHostname()];
}

function defaultHostname () {
  const h = os.hostname().toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
  return h || 'dev';
}

function ensureCertsDir () {
  fs.mkdirSync(certsPath, { recursive: true });
}

function loadPack () {
  if (!fs.existsSync(packPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

/**
 * Load the certificate material currently on disk.
 * @returns {null | { key: string, cert: string, ca: string, hostnames: string[], expirationDays: number, info: object }}
 */
function loadLocal () {
  const pack = loadPack();
  if (pack == null) return null;
  if (!fs.existsSync(keyFile) || !fs.existsSync(certFile)) return null;
  const notAfter = pack.info && pack.info.notAfter;
  if (!notAfter) return null;
  return {
    key: fs.readFileSync(keyFile, 'utf-8'),
    cert: fs.readFileSync(certFile, 'utf-8'),
    ca: fs.existsSync(caFile) ? fs.readFileSync(caFile, 'utf-8') : fs.readFileSync(certFile, 'utf-8'),
    hostnames: Array.isArray(pack.hostnames) ? pack.hostnames : [],
    info: pack.info,
    expirationDays: expirationDays(notAfter)
  };
}

/**
 * Load a certificate for the given hostnames, issuing one through the
 * backloop.dev API if needed.
 * @param {object} [opts]
 * @param {string[]} [opts.hostnames] desired subdomains of `domain`
 * @param {boolean} [opts.force] force a refresh
 * @returns {Promise<null | { key, cert, ca, hostnames, expirationDays, info }>}
 */
async function updateAndLoad (opts = {}) {
  const hostnames = resolveHostnames(opts.hostnames);
  ensureCertsDir();
  const actual = loadLocal();

  const want =
    actual != null &&
    actual.expirationDays > RENEW_THRESHOLD_DAYS &&
    !opts.force &&
    sameHostnames(actual.hostnames, hostnames);

  if (want) {
    return actual;
  }

  return issue(hostnames);
}

function sameHostnames (a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const set = new Set(a.map(h => h.toLowerCase()));
  return b.every(h => set.has(h.toLowerCase()));
}

/**
 * Request a certificate for `hostnames` from the backloop.dev API.
 * The private key is generated locally and never leaves this machine;
 * only the CSR (a public certificate signing request) is sent.
 */
async function issue (hostnames) {
  console.log('Requesting backloop.dev certificate for ' + hostnames.map(h => h + '.' + domain).join(', '));
  const keyPem = loadOrCreateKey();
  const csr = createCsr(keyPem, hostnames);

  const res = await requestCert(csr);

  const notAfter = res.notAfter;
  if (notAfter == null) {
    throw new Error('backloop.dev API returned a certificate without a "notAfter" validity date');
  }

  fs.writeFileSync(certFile, res.cert);
  fs.writeFileSync(caFile, res.ca);
  fs.writeFileSync(bundleFile, res.cert + '\n' + res.ca);
  fs.writeFileSync(packPath, JSON.stringify({
    version: { num: versionNum },
    domain,
    hostnames,
    info: { notAfter }
  }, null, 2));

  const loaded = loadLocal();
  console.log(`Updated backloop.dev certificate, expires in ${loaded.expirationDays} days`);
  return loaded;
}

function loadOrCreateKey () {
  if (fs.existsSync(keyFile)) {
    return fs.readFileSync(keyFile, 'utf-8');
  }
  console.log('Generating a local private key for backloop.dev');
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const pem = forge.pki.privateKeyToPem(keys.privateKey);
  fs.writeFileSync(keyFile, pem, { mode: 0o600 });
  return pem;
}

/**
 * Build a PKCS#10 CSR covering `hostnames` using the local private key.
 * @param {string} keyPem
 * @param {string[]} hostnames subdomains (labels) of `domain`
 * @returns {string} PEM CSR
 */
function createCsr (keyPem, hostnames) {
  const privateKey = forge.pki.privateKeyFromPem(keyPem);
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);
  csr.setSubject([{
    name: 'commonName',
    value: hostnames[0] + '.' + domain
  }]);
  csr.setAttributes([{
    name: 'extensionRequest',
    extensions: [{
      name: 'subjectAltName',
      altNames: hostnames.map(h => ({ type: 2, value: h + '.' + domain }))
    }]
  }]);
  csr.sign(privateKey, forge.md.sha256.create());
  return forge.pki.certificationRequestToPem(csr);
}

/**
 * POST the CSR to the backloop.dev issuance API.
 * @param {string} csr PEM CSR
 * @returns {Promise<{ cert: string, ca: string, notAfter: string }>}
 */
function requestCert (csr) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiUrl);
    const client = url.protocol === 'http:' ? require('http') : https;
    const body = JSON.stringify({ csr });
    const req = client.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 60000
    }, function (res) {
      let data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          reject(new Error('Invalid response from backloop.dev API (HTTP ' + res.statusCode + '): ' + data));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error('backloop.dev API error (HTTP ' + res.statusCode + '): ' + (parsed.error || data)));
          return;
        }
        if (!parsed.cert || !parsed.ca) {
          reject(new Error('backloop.dev API returned an incomplete payload'));
          return;
        }
        resolve(parsed);
      });
    });
    req.on('timeout', function () {
      req.destroy(new Error('Timeout requesting certificate from backloop.dev API'));
    });
    req.on('error', reject);
    req.end(body);
  });
}

/**
 * @returns {number} - in days when the certificate expires (if negative it's expired)
 */
function expirationDays (stringDate) {
  const expireMs = new Date(stringDate).getTime() - Date.now();
  return Math.trunc(expireMs / (1000 * 60 * 60 * 24));
}

module.exports = {
  updateAndLoad,
  loadLocal,
  resolveHostnames,
  expirationDays
};
