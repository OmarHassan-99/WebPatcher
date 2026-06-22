/**
 * Polyfill for globalThis.crypto on Node.js < 19.
 *
 * The `langsmith` library (used by @langchain/core) relies on
 * `crypto.getRandomValues()` — the Web Crypto API — which is only
 * available as a global starting from Node.js 19.
 *
 * This file is loaded via the `-r` (--require) flag in the npm scripts
 * so it runs before any other module.
 */
if (typeof globalThis.crypto === 'undefined') {
  const { webcrypto } = require('crypto');
  globalThis.crypto = webcrypto;
}
