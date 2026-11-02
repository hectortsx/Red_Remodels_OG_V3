import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredEnv, eventFor, loadHandler, validBody } from './helpers/contact-handler.mjs';

// SES puts recipient addresses (and display names) in error messages, e.g. sandbox rejections.
const sesError = () => Object.assign(
  new Error(`Email address is not verified. The following identities failed the check in region US-EAST-1: ${validBody.name} <${validBody.email}>`),
  { name: 'MessageRejected', $metadata: { httpStatusCode: 400, requestId: 'req-123' } },
);
const assertNoVisitorData = (logs) => {
  const output = JSON.stringify(logs);
  for (const value of [validBody.name, validBody.email, validBody.phone, validBody.message, 'not verified'])
    assert.ok(!output.includes(value), `log contains ${value}`);
};

test('failed confirmation email logs the error type without visitor details', async () => {
  const { handler, calls } = await loadHandler({ ...configuredEnv, MAIL_CONFIRMATION_ENABLED: 'true' }, undefined,
    async (_command, n) => { if (n === 2) throw sesError(); });
  assert.equal((await handler(eventFor())).statusCode, 200);
  assert.equal(calls.ses, 2);
  assertNoVisitorData(calls.logs);
  assert.ok(calls.logs.some((line) => line.includes('Confirmation email failed') && line.includes('MessageRejected') && line.includes('400')));
});

test('failed business notification logs the error type without visitor details', async () => {
  const { handler, calls } = await loadHandler(configuredEnv, undefined, async () => { throw sesError(); });
  assert.equal((await handler(eventFor())).statusCode, 500);
  assertNoVisitorData(calls.logs);
  assert.ok(calls.logs.some((line) => line.includes('Send failed') && line.includes('MessageRejected') && line.includes('400')));
});

test('non-SES failures log only a generic error type', async () => {
  const { handler, calls } = await loadHandler(configuredEnv, undefined, async () => { throw `raw ${validBody.email}`; });
  assert.equal((await handler(eventFor())).statusCode, 500);
  assertNoVisitorData(calls.logs);
});
