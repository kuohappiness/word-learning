// 執行：node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildEntry, lookupDict, normalizeEntry, shardOf, providerOf } from '../js/engine.js';
import { DEMO } from '../js/demo.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const DICT = { dictBase: 'data/revised/' };

// 假的網路：本機辭典讀檔案，AI 回傳指定內容，其他一律失敗
function mockFetch(aiReply, calls = []) {
  globalThis.fetch = async (url, opts = {}) => {
    url = String(url);
    calls.push(url);
    if (url.startsWith('data/revised/')) {
      try {
        const body = await readFile(root + url, 'utf8');
        return new Response(body, { status: 200 });
      } catch { return new Response('', { status: 404 }); }
    }
    if (url.includes('api.anthropic.com') || url.includes('api.openai.com')) {
      const text = typeof aiReply === 'function' ? aiReply(JSON.parse(opts.body)) : aiReply;
      const body = url.includes('anthropic')
        ? { content: [{ type: 'text', text }] }
        : { choices: [{ message: { content: text } }] };
      return new Response(JSON.stringify(body), { status: 200 });
    }
    throw new Error('network blocked in test: ' + url);
  };
  return calls;
}

const goodReply = (word) => JSON.stringify({
  ...DEMO['迫不及待'],
  word,
  zhuyin: ['ㄨㄛˇ', 'ㄗˋ', 'ㄐㄧˇ', 'ㄅㄧㄢ'], // AI 亂給的注音，必須被丟掉
  quiz_compare: { ...DEMO['迫不及待'].quiz_compare, pair: [word, '迫在眉睫'], items: DEMO['迫不及待'].quiz_compare.items.map((i) => ({ ...i, answer: i.answer === '迫不及待' ? word : i.answer })) },
});

test('分片編號和 Python 建檔程式一致', () => {
  assert.equal(shardOf('辨'), ((0x8fa8) % 256).toString(16).padStart(2, '0'));
  assert.equal(shardOf('迫不及待'), (('迫'.codePointAt(0)) % 256).toString(16).padStart(2, '0'));
});

test('本機辭典查得到注音與釋義', async () => {
  mockFetch('');
  const d = await lookupDict('迫不及待', DICT);
  assert.equal(d.source, 'revised');
  assert.equal(d.readings[0].bopomofo, 'ㄆㄛˋ ㄅㄨˋ ㄐㄧˊ ㄉㄞˋ');
  assert.ok(d.readings[0].defs[0].includes('急迫'));
  assert.ok(d.readings[0].synonyms.includes('迫在眉睫'));
  const many = await lookupDict('行', DICT);
  assert.ok(many.readings.length >= 3, '多音字要列出每個讀音');
  assert.equal(await lookupDict('糰糰糰糰', DICT), null);
});

test('注音只來自辭典：AI 給的注音會被丟掉', async () => {
  mockFetch(goodReply('迫不及待'));
  const e = await buildEntry({ word: '迫不及待', age: '10-11', apiKey: 'sk-ant-test', env: DICT });
  assert.deepEqual(e.zhuyin.readings.map((r) => r.bopomofo), ['ㄆㄛˋ ㄅㄨˋ ㄐㄧˊ ㄉㄞˋ']);
});

test('辭典沒收錄就不顯示注音', async () => {
  mockFetch(goodReply('糰糰'));
  const e = await buildEntry({ word: '糰糰', age: '10-11', apiKey: 'sk-ant-test', env: DICT });
  assert.equal(e.zhuyin, null);
});

test('辭典釋義與近反義詞會放進提示', async () => {
  let prompt = '';
  mockFetch((body) => { prompt = body.messages.at(-1).content; return goodReply('迫不及待'); });
  await buildEntry({ word: '迫不及待', age: '12-14', apiKey: 'sk-ant-test', env: DICT });
  assert.match(prompt, /情況急迫，不能再等了/);
  assert.match(prompt, /近義詞：迫在眉睫/);
  assert.match(prompt, /12–14 歲/);
});

test('打錯字：建議的寫法要辭典裡有才提示', async () => {
  mockFetch(JSON.stringify({ type: 'typo', suggest: '迫不及待' }));
  const ok = await buildEntry({ word: '迫不急待', age: '10-11', apiKey: 'sk-ant-test', env: DICT });
  assert.deepEqual([ok.type, ok.suggest], ['typo', '迫不及待']);
  mockFetch(JSON.stringify({ type: 'typo', suggest: '糰不及待' }));
  const bad = await buildEntry({ word: '迫不急待', age: '10-11', apiKey: 'sk-ant-test', env: DICT });
  assert.equal(bad.type, 'unknown');
});

test('OpenAI 金鑰走 OpenAI', async () => {
  const calls = mockFetch(goodReply('迫不及待'));
  assert.equal(providerOf('sk-proj-abc'), 'openai');
  assert.equal(providerOf('sk-ant-abc'), 'anthropic');
  await buildEntry({ word: '迫不及待', age: '10-11', apiKey: 'sk-proj-test', env: DICT });
  assert.ok(calls.some((u) => u.includes('api.openai.com')));
});

test('單一個字一定是字卡', () => {
  const e = normalizeEntry({ type: 'word', meaning: 'x' }, '辨', null);
  assert.equal(e.type, 'char');
});
