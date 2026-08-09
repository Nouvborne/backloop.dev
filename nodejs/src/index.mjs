import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const backloopDev = require('./index.js');

export default await backloopDev.httpsOptionsPromise();
export const httpsOptions = backloopDev.httpsOptions;
export const httpsOptionsAsync = backloopDev.httpsOptionsAsync;
export const httpsOptionsPromise = backloopDev.httpsOptionsPromise;
