// 主程式：路由、事件、朗讀。畫面在 views.js，資料在 store.js。
import * as V from './views.js';
import * as S from './store.js';
import { fetchEntry, fetchFeedback, modeOf } from './api.js';

const cfg = window.WL_CONFIG || {};
const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');
const toastEl = document.getElementById('toast');

const WORD_TYPES = ['char', 'word', 'idiom'];
const CJK = /^[㐀-䶿一-鿿豈-﫿]{1,12}$/;
const enc = encodeURIComponent;

let state = S.load();
S.save(state);
let session = null; // 目前這個字詞的小測驗進度
let rs = null; // 錯題複習進度
let filter = null; // 錯題複習的篩選條件
let current = null; // 目前畫面用到的字詞內容
let lastHash = null;

const shuffle = (a) => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

function persist() { S.save(state); }

// worker / direct / demo，見 api.js
const mode = () => modeOf(cfg, state.settings);

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

function paint(html, tab = null, theme = '') {
  app.innerHTML = html;
  document.body.classList.toggle('notab', !tab);
  document.body.dataset.theme = theme;
  tabbar.querySelectorAll('.tab').forEach((a) => {
    const on = a.dataset.tab === tab;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (location.hash !== lastHash) {
    lastHash = location.hash;
    window.scrollTo(0, 0);
  }
}

function speak(text) {
  if (!('speechSynthesis' in window) || !text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-TW';
  u.rate = 0.9;
  const voice = synth.getVoices().find((v) => /zh[-_]TW/i.test(v.lang));
  if (voice) u.voice = voice;
  synth.speak(u);
}

function normalize(s) {
  const w = String(s || '').replace(/\s+/g, '');
  return CJK.test(w) ? w : '';
}

function needsSetup() {
  return !state.settings.age || (mode() === 'worker' && !state.settings.invite);
}

// ───────── 取得字詞內容（先看本機，再問 Worker）─────────
async function withEntry(word, cb) {
  const age = state.settings.age;
  const cached = (current && current.word === word && current.age === age) ? current : S.entryGet(word, age);
  if (cached) {
    current = cached;
    cb(cached);
    return;
  }
  const myHash = location.hash;
  paint(V.viewLoading());
  let entry;
  try {
    entry = await fetchEntry(word, state.settings, cfg);
  } catch (e) {
    if (location.hash === myHash) paint(V.viewError(e.code || 'network', word));
    return;
  }
  if (entry && WORD_TYPES.includes(entry.type)) {
    entry.age = entry.age || age;
    S.entrySet(word, age, entry);
    current = entry;
  }
  if (location.hash === myHash) cb(entry);
}

const hasQuiz = (e) => !!(e.quiz_usage && e.quiz_usage.correct && e.quiz_usage.wrong);

function pickItems(entry, attempt) {
  const qc = entry.quiz_compare;
  if (!qc || !Array.isArray(qc.items) || !Array.isArray(qc.pair)) return [];
  const [A, B] = qc.pair;
  const as = qc.items.filter((i) => i.answer === A);
  const bs = qc.items.filter((i) => i.answer === B);
  if (!as.length || !bs.length) return qc.items.length >= 2 ? qc.items.slice(0, 2) : [];
  return shuffle([as[attempt % as.length], bs[attempt % bs.length]]);
}

function ensureSession(entry) {
  if (session && session.word === entry.word) return session;
  session = {
    word: entry.word,
    q1: null,
    q1Order: shuffle(['c', 'w']),
    attempt: 0,
    q2: [],
    q2Items: pickItems(entry, 0),
    mistake: false,
    rewarded: false,
    sticker: null,
    illus: null,
    wrongItem: 0,
    moreOpen: false,
    more: null,
    writeText: '',
    writeFb: null,
    writeBusy: false,
  };
  return session;
}

// ───────── 路由 ─────────
function routeHome() {
  paint(V.viewHome({ demo: mode() === 'demo', due: S.dueToday(state) }), 'home');
}

function routeSetup() {
  if (!needsSetup()) { location.replace('#/'); return; }
  paint(V.viewSetup({ worker: mode() === 'worker' }));
}

function routeCard(word) {
  withEntry(word, (entry) => {
    if (!WORD_TYPES.includes(entry.type)) { paint(V.viewNotWord(entry, word)); return; }
    S.touchWord(state, entry.word, entry.type);
    persist();
    paint(V.viewCard({ entry, settings: state.settings }));
  });
}

function routeQ1(word) {
  withEntry(word, (entry) => {
    if (!WORD_TYPES.includes(entry.type) || !hasQuiz(entry)) { location.replace(`#/w/${enc(word)}`); return; }
    ensureSession(entry);
    const nextHref = session.q2Items.length === 2
      ? `#/q2/${enc(word)}`
      : (session.q1 === 'c' ? `#/ok/${enc(word)}` : `#/w/${enc(word)}`);
    paint(V.viewQuiz1({ entry, session, nextHref }));
  });
}

function routeQ2(word) {
  withEntry(word, (entry) => {
    ensureSession(entry);
    if (session.q2Items.length !== 2) { location.replace(`#/q1/${enc(word)}`); return; }
    paint(V.viewQuiz2({ entry, session }));
  });
}

function routeOk(word) {
  withEntry(word, (entry) => {
    ensureSession(entry);
    if (!session.rewarded) {
      session.rewarded = true;
      const isNew = S.recordLearned(state, entry.word);
      if (isNew) session.sticker = S.awardSticker(state).id;
      session.illus = session.sticker || S.STICKERS[Math.floor(Math.random() * S.STICKERS.length)].id;
      persist();
    }
    paint(V.viewCorrect({ entry, session, state }), null, 'celebrate');
  });
}

function routeNg(word) {
  withEntry(word, (entry) => {
    ensureSession(entry);
    if (session.q2Items.length !== 2) { location.replace(`#/w/${enc(word)}`); return; }
    paint(V.viewWrong({ entry, session }));
  });
}

function routeWrite(word) {
  withEntry(word, (entry) => {
    ensureSession(entry);
    paint(V.viewWrite({ entry, session }));
  });
}

function routeReview() {
  if (!filter) {
    filter = { from: S.earliestSeen(state), to: S.today(), scope: 'wrong', stars: [1, 2, 3], count: 10 };
  }
  paint(V.viewReview({ f: filter, list: S.filterForReview(state, filter) }), 'review');
}

function routeReviewQ() {
  if (!rs) { location.replace('#/review'); return; }
  if (rs.i >= rs.list.length) { paint(V.viewReviewDone({ rs }), 'review'); return; }
  const word = rs.list[rs.i];
  withEntry(word, (entry) => {
    if (!WORD_TYPES.includes(entry.type) || !hasQuiz(entry)) {
      rs.i += 1;
      routeReviewQ();
      return;
    }
    paint(V.viewReviewQ({ entry, rs }));
  });
}

function routeMe() {
  paint(V.viewMe({ state, mode: mode() }), 'me');
}

const routes = [
  [/^#\/?$/, routeHome],
  [/^#\/setup$/, routeSetup],
  [/^#\/w\/(.+)$/, routeCard],
  [/^#\/q1\/(.+)$/, routeQ1],
  [/^#\/q2\/(.+)$/, routeQ2],
  [/^#\/ok\/(.+)$/, routeOk],
  [/^#\/ng\/(.+)$/, routeNg],
  [/^#\/write\/(.+)$/, routeWrite],
  [/^#\/review$/, routeReview],
  [/^#\/rq$/, routeReviewQ],
  [/^#\/me$/, routeMe],
];

function render() {
  const hash = location.hash || '#/';
  if (needsSetup() && hash !== '#/setup') { location.replace('#/setup'); return; }
  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (m) {
      let arg = null;
      if (m[1]) {
        try { arg = decodeURIComponent(m[1]); } catch { arg = m[1]; }
      }
      fn(arg);
      return;
    }
  }
  location.replace('#/');
}

function startReview(list) {
  rs = { list, i: 0, picked: null, order: shuffle(['c', 'w']), results: [] };
  if (location.hash === '#/rq') render(); else location.hash = '#/rq';
}

// ───────── 點擊 ─────────
const actions = {
  pick1(el) {
    if (!session || session.q1) return;
    session.q1 = el.dataset.k;
    if (session.q1 === 'w') {
      S.recordWrong(state, session.word);
      session.mistake = true;
      persist();
    }
    render();
  },
  pick2(el) {
    session.q2[Number(el.dataset.i)] = el.dataset.v;
    render();
  },
  submit2() {
    const bad = session.q2Items.findIndex((it, i) => session.q2[i] !== it.answer);
    if (bad === -1) {
      location.hash = `#/ok/${enc(session.word)}`;
      return;
    }
    session.wrongItem = bad;
    session.mistake = true;
    session.moreOpen = false;
    session.more = null;
    S.recordWrong(state, session.word);
    persist();
    location.hash = `#/ng/${enc(session.word)}`;
  },
  retry2() {
    session.attempt += 1;
    session.q2Items = pickItems(current, session.attempt);
    session.q2 = [];
    location.hash = `#/q2/${enc(session.word)}`;
  },
  toggleMore() {
    session.moreOpen = !session.moreOpen;
    render();
  },
  more(el) {
    session.more = el.dataset.k;
    render();
  },
  rate(el) {
    S.setStars(state, session.word, Number(el.dataset.n));
    persist();
    render();
  },
  startDue() {
    const list = S.dueToday(state).map((w) => w.word);
    if (list.length) startReview(list);
  },
  startReview() {
    const list = S.filterForReview(state, filter).map((w) => w.word);
    const n = filter.count === 'all' ? list.length : Math.min(list.length, filter.count);
    if (n) startReview(list.slice(0, n));
  },
  rfScope(el) {
    filter.scope = el.dataset.v;
    render();
  },
  rfStar(el) {
    const n = Number(el.dataset.v);
    const has = filter.stars.includes(n);
    if (has && filter.stars.length === 1) return; // 至少留一個
    filter.stars = has ? filter.stars.filter((x) => x !== n) : [...filter.stars, n].sort();
    render();
  },
  rfCount(el) {
    filter.count = el.dataset.v === 'all' ? 'all' : Number(el.dataset.v);
    render();
  },
  rpick(el) {
    if (!rs || rs.picked) return;
    rs.picked = el.dataset.k;
    const ok = rs.picked === 'c';
    const w = S.recordReview(state, rs.list[rs.i], ok);
    rs.results.push({ word: rs.list[rs.i], ok, graduated: w.graduated });
    persist();
    render();
  },
  rnext() {
    rs.i += 1;
    rs.picked = null;
    rs.order = shuffle(['c', 'w']);
    render();
  },
  setAge(el) {
    state.settings.age = el.dataset.v;
    persist();
    current = null;
    toast('已更新年紀，之後查的字詞會照新的年紀解釋');
    render();
  },
  retry() {
    current = null;
    render();
  },
};

document.addEventListener('click', (e) => {
  const sp = e.target.closest('[data-speak]');
  if (sp) { speak(sp.dataset.speak); return; }
  const el = e.target.closest('[data-act]');
  if (!el || !actions[el.dataset.act]) return;
  e.preventDefault();
  actions[el.dataset.act](el);
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.filter && filter) {
    filter[t.dataset.filter] = t.value;
    render();
  }
  if (t.id === 'zy') {
    state.settings.zhuyin = t.checked;
    persist();
  }
});

document.addEventListener('submit', async (e) => {
  const form = e.target;
  const kind = form.dataset.form;
  if (!kind) return;
  e.preventDefault();

  if (kind === 'search') {
    const word = normalize(form.q.value);
    if (!word) { toast(V.errorText('bad_word')); return; }
    location.hash = `#/w/${enc(word)}`;
  }

  if (kind === 'setup') {
    const picked = form.querySelector('input[name=age]:checked');
    if (!picked) { toast('請先選年紀'); return; }
    if (mode() === 'worker') {
      const inv = form.invite.value.trim();
      if (!inv) { toast('請輸入邀請碼'); return; }
      state.settings.invite = inv;
    } else if (form.apikey && form.apikey.value.trim()) {
      state.settings.apiKey = form.apikey.value.trim();
    }
    state.settings.age = picked.value;
    persist();
    location.hash = '#/';
  }

  if (kind === 'invite') {
    state.settings.invite = form.invite.value.trim();
    persist();
    toast('已儲存邀請碼');
  }

  if (kind === 'apikey') {
    state.settings.apiKey = form.apikey.value.trim();
    persist();
    current = null;
    toast(state.settings.apiKey ? '已儲存 API 金鑰' : '已清除 API 金鑰，回到試用模式');
    render();
  }

  if (kind === 'write' && session) {
    const text = form.s.value.trim();
    if (!text || session.writeBusy) return;
    session.writeText = text;
    session.writeBusy = true;
    session.writeFb = null;
    render();
    try {
      session.writeFb = await fetchFeedback(session.word, text, state.settings, cfg);
    } catch (err) {
      toast(V.errorText(err.code || 'network'));
    }
    session.writeBusy = false;
    if (location.hash.startsWith('#/write/')) render();
  }
});

window.addEventListener('hashchange', render);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
