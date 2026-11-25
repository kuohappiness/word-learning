import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/store.js';

const fresh = () => ({ settings: {}, words: {}, stickers: {} });

test('錯題複習答對 2 次就畢業', () => {
  const st = fresh();
  S.recordWrong(st, '辨');
  assert.equal(S.recordReview(st, '辨', true).graduated, false);
  assert.equal(S.recordReview(st, '辨', true).graduated, true);
  assert.equal(S.filterForReview(st, { scope: 'wrong', stars: [1, 2, 3] }).length, 0);
});

test('複習答錯會重新計算', () => {
  const st = fresh();
  S.recordWrong(st, '辨');
  S.recordReview(st, '辨', true);
  S.recordReview(st, '辨', false);
  assert.equal(st.words['辨'].reviewCorrect, 0);
  assert.equal(st.words['辨'].wrong, 2);
});

test('等級門檻依說明書', () => {
  assert.deepEqual(S.LEVELS.map((l) => l.need), [0, 20, 60, 150, 300]);
  assert.equal(S.levelInfo(19).cur.name, '湯圓寶寶');
  assert.equal(S.levelInfo(20).cur.name, '小書僮');
  assert.equal(S.levelInfo(300).next, null);
});

test('錯題複習可依日期與星星篩選', () => {
  const st = fresh();
  S.recordWrong(st, '辨');
  S.setStars(st, '辨', 3);
  st.words['辨'].firstSeen = '2026-11-01';
  assert.equal(S.filterForReview(st, { scope: 'wrong', stars: [3], from: '2026-10-01', to: '2026-11-30' }).length, 1);
  assert.equal(S.filterForReview(st, { scope: 'wrong', stars: [1], from: '2026-10-01', to: '2026-11-30' }).length, 0);
  assert.equal(S.filterForReview(st, { scope: 'wrong', stars: [3], from: '2026-11-02', to: '2026-11-30' }).length, 0);
});
