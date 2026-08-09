/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 *
 * Per-developer certificate issuance API.
 *
 * The npm package (backloop.dev) generates a private key locally, sends only a
 * CSR for one or more subdomains of `*.backloop.dev`, and this server completes
 * the ACME DNS-01 challenge with Let's Encrypt using the Gandi DNS API. The
 * private key NEVER leaves the developer's machine, so no private key is ever
 * published. This keeps the service compliant with the Let's Encrypt Subscriber
 * Agreement, which prohibits disclosing private keys.
 *
 * Run: `IS_PRODUCTION=true npm run api`
 *
 * Endpoints:
 *   POST /cert  body: { "csr": "<PEM CSR>" }  -> { cert, ca, notAfter }
 *   GET  /healthz                              -> { ok: true }
 */
const http = require('http');
const acme = require('acme-client');
const gandi = require('./gandi');

const DOMAIN = process.env.BACKLOOP_DOMAIN || 'backloop.dev';
const PORT = parseInt(process.env.API_PORT || '8080', 10);
const IS_PRODUCTION = process.env.IS_PRODUCTION === 'true';
const MAX_HOSTNAMES = parseInt(process.env.API_MAX_HOSTNAMES || '20', 10);
const MAX_BODY_BYTES = 64 * 1024;

// Per-IP rate limits (in-memory, resets on restart).
const RATE_LIMIT_HOURLY = parseInt(process.env.API_RATE_LIMIT_HOURLY || '5', 10);
const RATE_LIMIT_DAILY = parseInt(process.env.API_RATE_LIMIT_DAILY || '20', 10);

// Global cap, deliberately below Let's Encrypt's 50 certificates per
// registered domain per week, to keep headroom for renewals and the API's own
// certificate. In-memory only; a durable counter (or LE account limits) should
// back this in a multi-instance deployment.
const GLOBAL_WEEKLY = parseInt(process.env.API_GLOBAL_WEEKLY || '49', 10);

if (!process.env.ACME_ACCOUNT_KEY) {
  throw new Error('Missing environment var ACME_ACCOUNT_KEY');
}
if (!process.env.ACME_ACCOUNT_URL) {
  throw new Error('Missing environment var ACME_ACCOUNT_URL');
}

const acmeClient = new acme.Client({
  directoryUrl: IS_PRODUCTION ? acme.directory.letsencrypt.production : acme.directory.letsencrypt.staging,
  accountKey: '-----BEGIN RSA PRIVATE KEY-----\n' + process.env.ACME_ACCOUNT_KEY + '\n-----END RSA PRIVATE KEY-----',
  accountUrl: process.env.ACME_ACCOUNT_URL
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

const hitsPerIp = new Map(); // ip -> array of timestamps
const issuanceTimestamps = []; // global, for the weekly budget

function rateLimited (ip) {
  const now = Date.now();
  const recent = (hitsPerIp.get(ip) || []).filter(t => now - t < 24 * 3600 * 1000);
  recent.push(now);
  hitsPerIp.set(ip, recent);

  const hourly = recent.filter(t => now - t < 3600 * 1000).length;
  const daily = recent.length;
  if (hourly > RATE_LIMIT_HOURLY || daily > RATE_LIMIT_DAILY) return true;

  const week = issuanceTimestamps.filter(t => now - t < 7 * 24 * 3600 * 1000).length;
  return week >= GLOBAL_WEEKLY;
}

// ---------------------------------------------------------------------------
// CSR validation
// ---------------------------------------------------------------------------

const labelRe = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const RESERVED = new Set(['api']);

function validSubdomain (name) {
  if (typeof name !== 'string') return false;
  const n = name.toLowerCase();
  if (n === DOMAIN) return false;
  if (!n.endsWith('.' + DOMAIN)) return false;
  const prefix = n.slice(0, -(DOMAIN.length + 1));
  if (prefix.startsWith('_')) return false;
  if (prefix.startsWith('*.')) return false;
  const labels = prefix.split('.');
  return labels.length >= 1 && labels.every(function (l) { return labelRe.test(l); });
}

async function validateCsr (csr) {
  if (typeof csr !== 'string' || csr.length > MAX_BODY_BYTES) {
    throw new Error('missing or invalid "csr" field');
  }
  let info;
  try {
    info = await acme.forge.readCsrDomains(csr);
  } catch (e) {
    throw new Error('unreadable CSR: ' + e.message);
  }

  const names = [info.commonName, ...(info.altNames || [])]
    .filter(Boolean)
    .map(function (n) { return n.toLowerCase(); });

  if (names.length === 0) throw new Error('CSR does not contain any names');

  const unique = [];
  for (const name of names) {
    if (!validSubdomain(name)) {
      throw new Error('name not allowed: ' + name);
    }
    if (RESERVED.has(name.slice(0, -(DOMAIN.length + 1)))) {
      throw new Error('name is reserved: ' + name);
    }
    if (!unique.includes(name)) unique.push(name);
  }
  if (unique.length > MAX_HOSTNAMES) {
    throw new Error('too many hostnames (max ' + MAX_HOSTNAMES + ')');
  }
  return unique;
}

// ---------------------------------------------------------------------------
// ACME issuance
// ---------------------------------------------------------------------------

async function issueCertificate (names) {
  const certificate = await acmeClient.auto({
    commonName: names[0],
    altNames: names,
    challengePriority: ['dns-01'],
    challengeCreateFn: async function (authz, challenge, keyAuthorization) {
      const recordName = gandi.acmeChallengeRecordName(authz.identifier.value, DOMAIN);
      await gandi.update(DOMAIN, recordName, [keyAuthorization]);
    },
    challengeRemoveFn: async function () {
      // TXT records are overwritten on the next issuance; nothing to do.
    }
  });

  const split = splitBundle(certificate);
  const info = await acme.forge.readCertificateInfo(split.cert);
  return {
    cert: split.cert,
    ca: split.ca,
    notAfter: info.notAfter
  };
}

function splitBundle (bundle) {
  const end = bundle.indexOf('-----END CERTIFICATE-----');
  if (end === -1) return { cert: bundle, ca: bundle };
  const leaf = bundle.slice(0, end + '-----END CERTIFICATE-----'.length);
  const rest = bundle.slice(end + '-----END CERTIFICATE-----'.length).trim();
  return { cert: leaf, ca: rest.length > 0 ? rest : leaf };
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

function readBody (req) {
  return new Promise(function (resolve, reject) {
    let data = '';
    let size = 0;
    req.on('data', function (chunk) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', function () { resolve(data); });
    req.on('error', reject);
  });
}

function sendJson (res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

const server = http.createServer(async function (req, res) {
  if (req.method === 'GET' && req.url === '/healthz') {
    return sendJson(res, 200, { ok: true });
  }
  if (req.method !== 'POST' || req.url !== '/cert') {
    return sendJson(res, 404, { error: 'not found' });
  }

  const ip = (req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
  if (rateLimited(ip)) {
    console.log('RATE LIMITED ' + ip);
    return sendJson(res, 429, { error: 'rate limit exceeded, try again later' });
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (e) {
    return sendJson(res, 400, { error: 'invalid JSON body' });
  }

  let names;
  try {
    names = await validateCsr(body.csr);
  } catch (e) {
    return sendJson(res, 400, { error: e.message });
  }

  console.log('ISSUE ' + names.join(', ') + ' from ' + ip);
  try {
    const result = await issueCertificate(names);
    issuanceTimestamps.push(Date.now());
    return sendJson(res, 200, result);
  } catch (e) {
    console.error('ISSUE FAILED ' + names.join(', ') + ' > ' + e.message);
    return sendJson(res, 500, { error: 'certificate issuance failed: ' + e.message });
  }
});

server.listen(PORT, function () {
  console.log('backloop.dev issuance API listening on port ' + PORT +
    (IS_PRODUCTION ? '' : ' (Let\'s Encrypt STAGING)'));
});

module.exports = { server, validateCsr, rateLimited, splitBundle };
