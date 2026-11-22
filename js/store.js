// 本機資料：設定、字詞紀錄、貼紙、字詞內容快取。全部存在這台裝置，不收集個資。

export const LEVELS = [
  { lv: 1, name: '湯圓寶寶', need: 0 },
  { lv: 2, name: '小書僮', need: 20 },
  { lv: 3, name: '詞語探險家', need: 60 },
  { lv: 4, name: '造句達人', need: 150 },
  { lv: 5, name: '詞語大師', need: 300 },
];

export const AGES = [
  { id: '10-11', label: '10–11 歲', sub: '國小高年級' },
  { id: '12-14', label: '12–14 歲', sub: '國中' },
  { id: '15-16', label: '15–16 歲', sub: '高中' },
];

// 目前畫好 3 張；說明書暫定總共 30 張，之後再補。
export const STICKERS = [
  { id: 'snail', name: '兜風糰糰', caption: '糰糰開心到騎蝸牛去兜風了' },
  { id: 'egg', name: '荷包蛋糰糰', caption: '糰糰開心到頭上煎了一顆荷包蛋' },
  { id: 'surf', name: '衝浪糰糰', caption: '糰糰踩著吐司去衝浪了' },
];
export const STICKER_TOTAL = 30;

// 同一個字詞在複習中答對幾次就畢業
export const GRADUATE_AFTER = 2;

const STATE_KEY = 'wl:v1';
const ENTRY_KEY = 'wl:entries:v1';
const ENTRY_MAX = 300;

const mem = {};
const storage = {
  get(k) {
    try { return globalThis.localStorage ? globalThis.localStorage.getItem(k) : (mem[k] ?? null); }
    catch { return mem[k] ?? null; }
  },
  set(k, v) {
    try { if (globalThis.localStorage) globalThis.localStorage.setItem(k, v); else mem[k] = v; }
    catch { mem[k] = v; }
  },
};

export function today(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return today(new Date(y, m - 1, d + n));
}

export function uuid() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'd-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function defaults() {
  return {
    settings: { age: null, zhuyin: true, invite: '', device: uuid() },
    words: {},
    stickers: {},
  };
}

export function load() {
  const base = defaults();
  try {
    const raw = JSON.parse(storage.get(STATE_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      return {
        settings: { ...base.settings, ...(raw.settings || {}) },
        words: raw.words || {},
        stickers: raw.stickers || {},
      };
    }
  } catch { /* 資料壞掉就從頭開始 */ }
  return base;
}

export function save(state) {
  storage.set(STATE_KEY, JSON.stringify(state));
}

export function touchWord(state, word, type) {
  const t = today();
  let w = state.words[word];
  if (!w) {
    w = state.words[word] = {
      word, type: type || 'word', firstSeen: t, lastSeen: t,
      stars: 0, wrong: 0, learned: false, reviewCorrect: 0, due: null, graduated: false,
    };
  } else {
    w.lastSeen = t;
    if (type) w.type = type;
  }
  return w;
}

// 答錯：進錯題本，明天複習
export function recordWrong(state, word) {
  const w = touchWord(state, word);
  w.wrong += 1;
  w.reviewCorrect = 0;
  w.graduated = false;
  w.due = addDays(today(), 1);
  return w;
}

// 小測驗答對：算學會。回傳是不是第一次學會
export function recordLearned(state, word) {
  const w = touchWord(state, word);
  const isNew = !w.learned;
  w.learned = true;
  return isNew;
}

// 難易度星星：2 顆以上會排進複習
export function setStars(state, word, n) {
  const w = touchWord(state, word);
  w.stars = Math.max(0, Math.min(3, n));
  if (w.stars >= 2 && !w.graduated && !w.due) w.due = addDays(today(), w.stars === 3 ? 1 : 3);
  return w;
}

// 錯題複習的結果
export function recordReview(state, word, correct) {
  if (!correct) return recordWrong(state, word);
  const w = touchWord(state, word);
  w.learned = true;
  w.reviewCorrect += 1;
  if (w.reviewCorrect >= GRADUATE_AFTER) {
    w.graduated = true;
    w.due = null;
  } else {
    w.due = addDays(today(), 3);
  }
  return w;
}

export function learnedCount(state) {
  return Object.values(state.words).filter((w) => w.learned).length;
}

export function levelInfo(count) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (count >= l.need) cur = l;
  const next = LEVELS.find((l) => l.need > count) || null;
  const progress = next ? (count - cur.need) / (next.need - cur.need) : 1;
  return { cur, next, progress, toNext: next ? next.need - count : 0 };
}

function inReviewPool(w) {
  return !w.graduated && (w.wrong > 0 || w.stars >= 2);
}

// 首頁「今天該複習了」
export function dueToday(state) {
  const t = today();
  return Object.values(state.words)
    .filter((w) => inReviewPool(w) && w.due && w.due <= t)
    .sort((a, b) => a.due.localeCompare(b.due));
}

// 錯題複習的篩選：f = { from, to, scope: 'wrong'|'all', stars: [1,2,3], count }
export function filterForReview(state, f) {
  const list = Object.values(state.words).filter((w) => {
    if (f.scope === 'wrong' && (w.graduated || !(w.wrong > 0))) return false;
    if (f.from && w.firstSeen < f.from) return false;
    if (f.to && w.firstSeen > f.to) return false;
    return f.stars.includes(w.stars || 1);
  });
  list.sort((a, b) => (b.stars - a.stars) || (b.wrong - a.wrong) || b.firstSeen.localeCompare(a.firstSeen));
  return list;
}

export function earliestSeen(state) {
  const days = Object.values(state.words).map((w) => w.firstSeen).sort();
  return days[0] || today();
}

export function awardSticker(state, rand = Math.random) {
  const s = STICKERS[Math.floor(rand() * STICKERS.length)];
  state.stickers[s.id] = (state.stickers[s.id] || 0) + 1;
  return s;
}

export function stickerById(id) {
  return STICKERS.find((s) => s.id === id) || STICKERS[0];
}

// 查過的字詞內容存在本機，第二次打開不用再連網
export function entryGet(word, age) {
  try {
    const all = JSON.parse(storage.get(ENTRY_KEY) || '{}');
    return all[`${age}|${word}`] || null;
  } catch { return null; }
}

export function entrySet(word, age, entry) {
  let all = {};
  try { all = JSON.parse(storage.get(ENTRY_KEY) || '{}'); } catch { all = {}; }
  delete all[`${age}|${word}`];
  all[`${age}|${word}`] = entry;
  const keys = Object.keys(all);
  if (keys.length > ENTRY_MAX) for (const k of keys.slice(0, keys.length - ENTRY_MAX)) delete all[k];
  storage.set(ENTRY_KEY, JSON.stringify(all));
}
