import assert from 'node:assert/strict';
import handler from '../dist/server/server.js';

for (const path of ['/', '/login', '/signup', '/dashboard']) {
  const response = await handler.fetch(new Request(`http://localhost${path}`));
  const html = await response.text();
  assert.equal(response.status, 200, `${path} should render`);
  if (path === '/login') assert.match(html, /type="password"/);
  if (path === '/signup') assert.match(html, /Create an account/);
  if (path === '/dashboard') {
    assert.match(html, /Checking your session/);
    assert.doesNotMatch(html, /What would you like to unlock/);
  }
  console.log(`${path}: OK`);
}
