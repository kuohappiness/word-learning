import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// data/polyphones.json 由 tools/build-polyphones.py 產生。這裡再用 App 本身的辭典分片
// （data/revised/）檢查一次：注音只能來自辭典，練習題答案要對得上。
const P = JSON.parse(readFileSync(new URL('../data/polyphones.json', import.meta.url)));
const shards = {};
const lookup = (w) => {
  const k = (w.codePointAt(0) % 256).toString(16).padStart(2, '0');
  shards[k] ??= JSON.parse(readFileSync(new URL(`../data/revised/${k}.json`, import.meta.url)));
  return (shards[k][w] || []).map((r) => r.b);
};

test('例詞有注音時，必須和辭典詞條一致', () => {
  for (const [ch, c] of Object.entries(P.chars)) {
    for (const r of c.readings) {
      for (const s of r.senses) {
        assert.ok(s.gloss, `${ch} 有義項沒有解釋`);
        for (const w of s.words) {
          if (w.zhuyin == null || w.w.length === 1) continue;
          const dict = lookup(w.w);
          if (dict.length) assert.ok(dict.includes(w.zhuyin), `${w.w} ${w.zhuyin} 不在辭典`);
        }
      }
    }
  }
});

test('每組讀音都是辭典裡這個字的讀音', () => {
  for (const [ch, c] of Object.entries(P.chars)) {
    const dict = lookup(ch);
    for (const r of c.readings) {
      if (r.zhuyin == null) continue;
      const ok = dict.includes(r.zhuyin) ||
        r.senses.some((s) => s.words.some((w) => w.zhuyin && w.zhuyin.split(' ')[w.w.indexOf(ch)] === r.zhuyin));
      assert.ok(ok, `${ch} ${r.zhuyin} 找不到辭典依據`);
    }
  }
});

test('練習題都有答案，選擇題的答案在選項裡', () => {
  for (const u of P.units) {
    assert.ok(u.practice.length > 0, `第 ${u.unit} 單元沒有練習題`);
    for (const q of u.practice) {
      assert.ok(q.answer, `第 ${u.unit} 單元有題目沒有答案`);
      if (q.type === 'pick') assert.ok(q.options.includes(q.answer));
      if (q.type === 'odd') assert.ok(q.words.includes(q.answer));
      if (q.type === 'sentence' || q.type === 'pick') assert.ok(q.text.includes(q.word));
      if (q.word) {
        const dict = lookup(q.word);
        if (dict.length > 0 && q.word.length > 1) {
          const i = q.word.indexOf(q.char);
          assert.ok(dict.some((b) => b.split(' ')[i] === q.answer), `${q.word} 的答案 ${q.answer} 和辭典不符`);
        }
      }
    }
  }
});
