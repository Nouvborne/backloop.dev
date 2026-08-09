/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */

const superagent = require('superagent');
if (!process.env.GANDI_API_TOKEN) {
  throw new Error('Missing environement var GANDI_API_TOKEN');
}
const API_KEY = process.env.GANDI_API_TOKEN;

const SHARINGID = null;

// only set shqring_id query param if defined
const query = SHARINGID ? { sharing_id: SHARINGID } : {};

const API_BASE = 'https://api.gandi.net/v5/livedns/domains';

/**
 * Compute the zone-relative record name for a DNS-01 challenge of `identifier`.
 * e.g. identifier "app.backloop.dev", domain "backloop.dev" => "_acme-challenge.app"
 *      identifier "backloop.dev"                         => "_acme-challenge"
 */
function acmeChallengeRecordName (identifier, domain) {
  const sub = String(identifier).toLowerCase();
  if (sub === domain) return '_acme-challenge';
  if (sub.endsWith('.' + domain)) {
    return '_acme-challenge.' + sub.slice(0, -(domain.length + 1));
  }
  return '_acme-challenge.' + sub;
}

async function put (domain, name, values, type, ttl) {
  const endPoint = API_BASE + '/' + domain + '/records/' + name + '/' + type;
  const res = await superagent.put(endPoint)
    .query(query)
    .set('Authorization', 'Bearer ' + API_KEY)
    .send({ rrset_ttl: ttl, rrset_values: values });
  return res;
}

async function post (domain, name, values, type, ttl) {
  const endPoint = API_BASE + '/' + domain + '/records/' + name + '/' + type;
  const res = await superagent.post(endPoint)
    .query(query)
    .set('Authorization', 'Bearer ' + API_KEY)
    .send({ rrset_ttl: ttl, rrset_values: values });
  return res;
}

/**
 * Set a DNS record. Tries to update (PUT) and falls back to creating (POST),
 * as some Gandi zones reject PUT for records that do not exist yet.
 */
async function update (domain, name, values, type = 'TXT', ttl = 300) {
  console.log('GANDI > ' + name + ' = ' + values + ' -- type: ' + type + ' ttl: ' + ttl);
  try {
    return await put(domain, name, values, type, ttl);
  } catch (e) {
    const status = e.response && e.response.status;
    console.log('GANDI PUT failed (status ' + status + '), trying POST to create the record');
    try {
      return await post(domain, name, values, type, ttl);
    } catch (e2) {
      throw new Error('Error updating Gandi: ' + e2.message + '  ' + (e2.response && e2.response.text));
    }
  }
}

module.exports = {
  update,
  acmeChallengeRecordName
};
