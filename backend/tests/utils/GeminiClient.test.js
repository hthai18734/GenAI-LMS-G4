const test = require('node:test');
const assert = require('node:assert/strict');
const GeminiClient = require('../../src/utils/ai/GeminiClient');

const contents = [{ role: 'user', parts: [{ text: 'Explain this lesson' }] }];
const ok = { candidates: [{ content: { parts: [{ text: 'Answer' }] }, finishReason: 'STOP' }] };
function setup(statuses, extra = {}) {
  const requests = [];
  const client = new GeminiClient({
    env: {
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'primary',
      GEMINI_FALLBACK_MODELS: 'fallback, last, fallback',
    },
    fetch: async (url, options) => {
      requests.push({ url, ...options });
      const status = statuses.shift();
      return {
        ok: status === 200,
        status,
        json: async () => (status === 200 ? ok : { error: { message: 'PRIVATE PROVIDER ERROR' } }),
      };
    },
    ...extra,
  });
  return { client, requests };
}

test('quota exhaustion switches models in order and preserves context', async () => {
  const { client, requests } = setup([429, 429, 200]);
  const result = await client.generateContent({
    contents,
    systemInstruction: { parts: [{ text: 'Tutor' }] },
  });
  assert.equal(result.model, 'last');
  assert.equal(result.text, 'Answer');
  assert.deepEqual(
    requests.map((r) => r.url.split('/models/')[1]),
    ['primary:generateContent', 'fallback:generateContent', 'last:generateContent'],
  );
  assert.equal(requests[0].body, requests[2].body);
  assert.equal(requests[0].headers['x-goog-api-key'], 'test-key');
  assert.ok(!requests[0].url.includes('test-key'));
});

test('all models exhausted returns controlled error without an infinite loop', async () => {
  const { client, requests } = setup([429, 429, 429]);
  await assert.rejects(
    client.generateContent({ contents }),
    (error) => error.status === 503 && !error.message.includes('PRIVATE'),
  );
  assert.equal(requests.length, 3);
});

for (const status of [400, 401, 403]) {
  test(`does not switch models for invalid request or credentials (${status})`, async () => {
    const { client, requests } = setup([status, 200]);
    await assert.rejects(client.generateContent({ contents }));
    assert.equal(requests.length, 1);
  });
}

test('unavailable model is skipped', async () => {
  const { client } = setup([404, 503, 200]);
  assert.equal((await client.generateContent({ contents })).model, 'last');
});

test('missing configuration does not send a request', async () => {
  const { client, requests } = setup([200], { env: {} });
  await assert.rejects(client.generateContent({ contents }), (error) => error.status === 503);
  assert.equal(requests.length, 0);
});

test('blocked content is not retried on another model', async () => {
  let count = 0;
  const { client } = setup([], {
    fetch: async () => {
      count++;
      return { ok: true, json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }) };
    },
  });
  await assert.rejects(client.generateContent({ contents }), (error) => error.status === 422);
  assert.equal(count, 1);
});

test('PDF requests skip Gemma fallbacks without dropping system policy', async () => {
  const { client, requests } = setup([429, 200], {
    env: {
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'primary',
      GEMINI_FALLBACK_MODELS: 'gemma-4-31b-it,last',
    },
  });
  const result = await client.generateContent({
    contents: [
      { role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: 'YWJj' } }] },
    ],
    systemInstruction: { parts: [{ text: 'Tutor policy' }] },
  });
  assert.equal(result.model, 'last');
  assert.equal(requests.length, 2);
  assert.ok(requests[1].url.includes('/last:'));
  assert.match(requests[1].body, /Tutor policy/);
});
