'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGeminiProvider, validateGrounding, ProviderFailure } = require('../model-provider.cjs');
const { ResearchService } = require('../core.cjs');
const config = { model: 'gemini-unit-fixture', apiKey: 'unit-test-key-never-live-123456', timeoutMs: 100, maxOutputTokens: 1024, temperature: 0 };
const output = { observations: [{ evidenceId: 'answer', quote: 'identity' }], recommendation: 'practice' };
const envelope = value => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }], modelVersion: 'unit-fixture', usageMetadata: { totalTokenCount: 10 } });
const response = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
test('provider fixes endpoint, keeps secret out of URL/artifacts, limits transmitted fields and records metadata', async () => {
  let captured;
  const provider = createGeminiProvider(config, { fetchImpl: async (url, options) => { captured = { url, options }; return response(envelope(output)); } });
  const result = await provider.generate('feedback', { answer: 'identity', question: 'Explain access' });
  assert.equal(captured.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-unit-fixture:generateContent');
  assert.equal(captured.options.headers['x-goog-api-key'], config.apiKey);
  assert.equal(captured.options.redirect, 'error');
  const body = JSON.parse(captured.options.body);
  assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), { answer: 'identity', question: 'Explain access' });
  assert.equal(body.generationConfig.candidateCount, 1); assert.equal(body.tools, undefined);
  assert.deepEqual(result.output, output); assert.match(result.promptHash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(result).includes(config.apiKey), false);
});
test('provider rejects unsafe configuration and unexpected principal fields before fetching', async () => {
  for (const changes of [{ model: '../attacker' }, { apiKey: 'REPLACE_SECRET' }, { endpoint: 'https://attacker' }, { timeoutMs: 0 }, { maxOutputTokens: 9000 }, { temperature: NaN }])
    assert.throws(() => createGeminiProvider({ ...config, ...changes }), e => e.code === 'invalid_provider_configuration');
  let calls = 0;
  const provider = createGeminiProvider(config, { fetchImpl: async () => { calls++; return response(envelope(output)); } });
  await assert.rejects(provider({ answer: 'identity', question: 'Question', tenant: 'private' }), e => e.code === 'invalid_provider_input');
  await assert.rejects(provider({ answer: 'a'.repeat(21000), question: 'Question' }), e => e.code === 'provider_input_too_large');
  assert.equal(calls, 0);
});
test('HTTP errors are sanitized and never retried or replaced by offline success', async () => {
  let calls = 0;
  const provider = createGeminiProvider(config, { fetchImpl: async () => { calls++; return new Response(config.apiKey, { status: 429 }); } });
  await assert.rejects(provider({ answer: 'identity', question: 'Question' }), error => error instanceof ProviderFailure && error.message === 'provider_http_failure');
  assert.equal(calls, 1);
});
test('malformed, blocked, truncated and oversized responses fail closed', async () => {
  const truncated = envelope(output); truncated.candidates[0].finishReason = 'MAX_TOKENS';
  for (const body of ['not json', JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }), JSON.stringify(truncated), 'x'.repeat(131073)]) {
    const provider = createGeminiProvider(config, { fetchImpl: async () => new Response(body, { headers: { 'Content-Type': 'application/json' } }) });
    await assert.rejects(provider({ answer: 'identity', question: 'Question' }), error => error instanceof ProviderFailure);
  }
});
test('timeout and upstream cancellation abort the request', async () => {
  const fetchImpl = async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('stub abort')), { once: true }));
  const provider = createGeminiProvider(config, { fetchImpl });
  await assert.rejects(provider({ answer: 'identity', question: 'Question' }), e => e.code === 'provider_aborted');
  const controller = new AbortController();
  const request = provider({ answer: 'identity', question: 'Question' }, { signal: controller.signal }); controller.abort();
  await assert.rejects(request, e => e.code === 'provider_aborted');
});
test('grounding quote contract rejects missing, fabricated and invalid labels without asserting entailment', () => {
  assert.equal(validateGrounding({ label: 'undetermined', evidence: [] }, null).label, 'undetermined');
  for (const value of [{ label: 'source_supported', evidence: [] }, { label: 'source_contradicted', evidence: ['PhD'] }, { label: 'verified', evidence: ['Skills'] }])
    assert.throws(() => validateGrounding(value, 'Skills'), e => e.code === 'invalid_grounding_contract');
  assert.equal(validateGrounding({ label: 'source_supported', evidence: ['Skills'] }, 'Skills').label, 'source_supported');
});
test('model output cannot bypass the service schema or release a fabricated score', async () => {
  const provider = createGeminiProvider(config, { fetchImpl: async () => response(envelope({ ...output, score: 100 })) });
  const credential = 'a'.repeat(32);
  const service = new ResearchService({ principals: [{ id: 'alice', tenant: 'A', role: 'candidate', credential }], provider });
  const user = service.authenticate(service.login(credential, 'r').token);
  const { id } = service.create(user, {}, 'r');
  const result = await service.submit(user, id, { answer: 'identity' }, 'r');
  assert.equal(result.state, 'abstained'); assert.equal(result.score, undefined);
});
test('secret echoes are discarded before any successful artifact is returned', async () => {
  const provider = createGeminiProvider(config, { fetchImpl: async () => response(envelope({ ...output, leaked: config.apiKey })) });
  await assert.rejects(provider({ answer: 'identity', question: 'Question' }), e => e.code === 'provider_secret_echo');
});
