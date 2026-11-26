// 執行：node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildEntry, buildCard, buildQuiz, lookupDict, normalizeEntry, shardOf, providerOf, lookalikeZhuyin, confusablesOf } from '../js/engine.js';
import { DEMO } from '../js/demo.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const DICT = { dictBase: 'data/revised/', confusablesUrl: 'data/confusables.json' };

// 假的網路：本機辭典讀檔案，AI 回傳指定內容，其他一律失敗
function mockFetch(aiReply, calls = []) {
  globalThis.fetch = async (url, opts = {}) => {
    url = String(url);
    calls.push(url);
    if (url.startsWith('data/')) {
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

test('學習卡只呼叫一次 AI，小測驗另外出題且會看到例句', async () => {
  const calls = mockFetch(goodReply('迫不及待'));
  const card = await buildCard({ word: '迫不及待', age: '10-11', apiKey: 'sk-ant-test', env: DICT });
  assert.equal(calls.filter((u) => u.includes('anthropic')).length, 1);
  assert.equal(card.meaning.length > 0, true);
  let prompt = '';
  mockFetch((body) => { prompt = body.messages.at(-1).content; return goodReply('迫不及待'); });
  const quiz = await buildQuiz({ entry: card, age: '10-11', apiKey: 'sk-ant-test', env: DICT });
  assert.ok(quiz.quiz_usage && quiz.quiz_compare);
  assert.match(prompt, /例句 1：收到外婆寄來的包裹/);
});

test('查畫面時先拿到辭典注音', async () => {
  mockFetch(goodReply('迫不及待'));
  let seen = null;
  await buildCard({ word: '迫不及待', age: '10-11', apiKey: 'sk-ant-test', env: DICT, onDict: (d) => { seen = d; } });
  assert.equal(seen.readings[0].bopomofo, 'ㄆㄛˋ ㄅㄨˋ ㄐㄧˊ ㄉㄞˋ');
});

test('易混清單：查和察', async () => {
  mockFetch('');
  assert.deepEqual(await confusablesOf('查', DICT), ['察']);
  let prompt = '';
  mockFetch((body) => { prompt = body.messages.at(-1).content; return JSON.stringify({ type: 'char', meaning: '仔細看、檢驗。', examples: ['a', 'b'] }); });
  await buildCard({ word: '查', age: '10-11', apiKey: 'sk-ant-test', env: DICT });
  assert.match(prompt, /容易搞混：察/);
});

test('形近字卡片的注音來自辭典，多音字依常用詞判斷', async () => {
  mockFetch('');
  assert.equal(await lookalikeZhuyin('辯', '辯論', DICT), 'ㄅㄧㄢˋ');
  assert.equal(await lookalikeZhuyin('瓣', '花瓣', DICT), 'ㄅㄢˋ');
  assert.equal(await lookalikeZhuyin('辮', '辮子', DICT), 'ㄅㄧㄢˋ');
  assert.equal(await lookalikeZhuyin('行', '銀行', DICT), 'ㄏㄤˊ');
  // 多音字又沒有常用詞可以判斷：不標
  assert.equal(await lookalikeZhuyin('行', '', DICT), null);
});
