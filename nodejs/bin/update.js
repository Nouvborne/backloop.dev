#! /usr/bin/env node
const { updateAndLoad } = require('../src/check');

(async () => {
  try {
    const res = await updateAndLoad({ force: true });
    if (res == null) {
      console.error('Failed to obtain a backloop.dev certificate');
      process.exit(1);
    }
  } catch (err) {
    console.error('Failed to update backloop.dev certificate:', err.message);
    // Best-effort: do not break `npm install` when offline or when the API
    // is unreachable. The certificate is refreshed again at runtime.
    process.exit(0);
  }
})();
