import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, runInContext } from 'node:vm';

const context = createContext({});
runInContext(await readFile(new URL('../../infra/cloudfront-functions/url-rewrite.js', import.meta.url), 'utf8'), context);
const run = (uri, querystring = {}, host = 'www.redremodels.com') => context.handler({ request: { uri, method: 'GET', headers: { host: { value: host } }, querystring } });

for (const device of ['desktop', 'mobile', 'tablet']) {
  test(`${device} legacy contact/home URLs redirect every directory variant without losing the query`, () => {
    for (const [page, destination] of [['home', 'https://www.redremodels.com/'], ['contact-us', 'https://www.redremodels.com/contact-us']]) {
      for (const suffix of ['', '/', '/index.html']) {
        const result = run(`/pages/${device}/${page}${suffix}`, { source: { value: 'test' } });
        assert.equal(result.statusCode, 301);
        assert.equal(result.headers.location.value, `${destination}?source=test`);
      }
    }
  });
}

test('legacy services preserves query before the services fragment', () => {
  for (const uri of ['/our-services', '/our-services/', '/pages/desktop/our-services/index.html']) {
    assert.equal(run(uri, { source: { value: 'test' } }).headers.location.value, 'https://www.redremodels.com/?source=test#services');
  }
});

test('apex redirect preserves path and repeated encoded query values', () => {
  const response = run('/contact-us', { q: { multiValue: [{ value: 'hello%20world' }, { value: 'second' }] } }, 'redremodels.com');
  assert.equal(response.statusCode, 301);
  assert.equal(response.headers.location.value, 'https://www.redremodels.com/contact-us?q=hello%20world&q=second');
});

test('normal page and static asset routing remains usable', () => {
  for (const [uri, expected] of [['/', '/index.html'], ['/contact-us', '/contact-us/index.html'], ['/contact-us/', '/contact-us/index.html'], ['/services/kitchen-remodels', '/services/kitchen-remodels/index.html'], ['/blog/', '/blog/index.html'], ['/assets/js/contact-form.js', '/assets/js/contact-form.js'], ['/assets/css/contact-verification.css', '/assets/css/contact-verification.css']]) {
    const response = run(uri);
    assert.equal(response.uri, expected);
    assert.equal(response.statusCode, undefined);
  }
});
