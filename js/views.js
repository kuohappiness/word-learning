// 畫面：每個函式只依資料回傳 HTML 字串，不碰 DOM。
import { mascot, sticker, illustration, icon, confetti, starRow } from './art.js';
import {
  LEVELS, AGES, STICKERS, STICKER_TOTAL, GRADUATE_AFTER,
  levelInfo, learnedCount, stickerById,
} from './store.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const enc = encodeURIComponent;
const LEVEL_WORDS = ['簡單', '普通', '好難'];

const ERRORS = {
  demo: '現在是試用模式，只能查「迫不及待」和「辨」。家長在「我的」貼上 API 金鑰之後，什麼字詞都能查。',
  invite: '邀請碼不對，請到「我的」重新輸入。',
  apikey: 'API 金鑰不對，請家長到「我的」重新貼上。',
  credit: 'API 的額度用完了，請家長儲值。',
  busy: '糰糰現在比較忙，等一下再試一次。',
  limit: '今天的查詢次數用完了，明天再來吧！',
  network: '連不上網路，檢查一下網路再試一次。',
  server: '糰糰暫時查不到，請稍後再試一次。',
  bad_word: '請輸入中文的字、詞或成語。',
};
export const errorText = (code) => ERRORS[code] || ERRORS.server;

function speakBtn(text, label, main = false) {
  return `<button type="button" class="speak${main ? ' main' : ''}" data-speak="${esc(text)}" aria-label="${esc(label)}">${icon.speaker}</button>`;
}

function backBar(href, label = '返回', right = '') {
  return `<header class="topbar"><a class="iconbtn" href="${href}" aria-label="${esc(label)}">${icon.back}</a>${right ? `<span class="progress">${right}</span>` : ''}</header>`;
}

// 把句子裡的目標字詞標成主色粗體
export function hl(text, word) {
  const t = esc(text);
  const w = esc(word);
  if (!w) return t;
  return t.split(w).join(`<strong class="hl">${w}</strong>`);
}

function syllables(entry) {
  const r = entry.zhuyin && entry.zhuyin.readings && entry.zhuyin.readings[0];
  if (!r || !r.bopomofo) return null;
  return String(r.bopomofo).trim().split(/\s+/);
}

function anchorBlock(a, title = '記住這個畫面') {
  if (!a || !a.scene) return '';
  return `<section class="anchor"><h2>${esc(title)}</h2><div class="anchor-row">${mascot('plain', 60)}<p>${esc(a.scene)}</p></div>${a.mnemonic ? `<p class="mnemonic">${esc(a.mnemonic)}</p>` : ''}</section>`;
}

function mistakeHtml(m) {
  const w = [...m.wrong];
  const r = [...(m.right || '')];
  if (w.length === r.length) {
    const wrongHtml = w.map((c, i) => (c !== r[i] ? `<s>${esc(c)}</s>` : esc(c))).join('');
    const rightHtml = r.map((c, i) => (c !== w[i] ? `<strong class="hl">${esc(c)}</strong>` : esc(c))).join('');
    return `${wrongHtml} → ${rightHtml}`;
  }
  return `<s>${esc(m.wrong)}</s> → <strong class="hl">${esc(m.right)}</strong>`;
}

const hasQuiz = (e) => !!(e.quiz_usage && e.quiz_usage.correct && e.quiz_usage.wrong);

// ───────── 首頁 ─────────
export function viewHome({ demo, due }) {
  const dueCard = due.length ? `
  <section class="card due">
    <div class="row-between"><h2>今天該複習了</h2><span class="muted">${due.length} 個</span></div>
    <div class="chips">${due.slice(0, 8).map((w) => `<a class="chip" href="#/w/${enc(w.word)}">${esc(w.word)}</a>`).join('')}</div>
    <button type="button" class="btn secondary" data-act="startDue">開始複習</button>
  </section>` : '';
  return `
  <div class="hello">${mascot('search', 80)}<label for="q" class="bubble">想認識哪個字、詞或成語？</label></div>
  <form class="card search" data-form="search" autocomplete="off">
    <input id="q" name="q" type="text" enterkeyhint="search" maxlength="12" placeholder="例如：迫不及待" required>
    <button class="btn primary" type="submit">${icon.search}<span>查一查</span></button>
  </form>
  ${demo ? '<p class="muted small center">試用模式：先查「迫不及待」或「辨」看看</p>' : ''}
  ${dueCard}`;
}

// ───────── 第一次使用 ─────────
const KEY_INPUT = (value = '', placeholder = '') => `<input id="apikey" name="apikey" type="password" class="text" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(value)}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}>`;

export function viewSetup({ worker }) {
  const ages = AGES.map((a) => `<label class="agebtn"><input type="radio" name="age" value="${a.id}"><span class="agebox">${a.label}<small>${a.sub}</small></span></label>`).join('');
  const access = worker
    ? '<label class="f-t" for="invite">邀請碼</label><input id="invite" name="invite" type="text" class="text" autocomplete="off" required>'
    : `<label class="f-t" for="apikey">API 金鑰（家長設定，也可以之後在「我的」貼上）</label>${KEY_INPUT('', 'sk-…')}`;
  return `
  <div class="setup-head">${mascot('plain', 96)}<h1 class="page">嗨！我是糰糰</h1><p class="muted">選好年紀，我會用你聽得懂的方式解釋。</p></div>
  <form data-form="setup" class="card setup">
    <fieldset class="ages"><legend class="f-t">你幾歲？</legend><div class="grid3">${ages}</div></fieldset>
    ${access}
    <button class="btn primary block" type="submit">開始</button>
  </form>`;
}

// ───────── 查詢中、錯誤 ─────────
export function viewLoading() {
  return `${backBar('#/')}<div class="loading">${mascot('search', 104)}<p>糰糰正在查辭典…</p></div>`;
}

export function viewError(code, word) {
  return `${backBar('#/')}<div class="loading">${mascot('sad', 96)}<p>${esc(errorText(code))}</p>
  ${['network', 'server', 'busy'].includes(code) && word ? `<a class="btn secondary" href="#/w/${enc(word)}" data-act="retry">再試一次</a>` : ''}</div>`;
}

export function viewNotWord(entry, word) {
  if (entry.type === 'typo' && entry.suggest) {
    return `${backBar('#/')}<div class="loading">${mascot('search', 96)}<p>你是不是要找「${esc(entry.suggest)}」？</p>
    <a class="btn primary" href="#/w/${enc(entry.suggest)}">查「${esc(entry.suggest)}」</a></div>`;
  }
  const msg = entry.type === 'blocked'
    ? '這個詞不適合在這裡查，換一個試試看。'
    : `糰糰不認得「${esc(word)}」，檢查一下有沒有打錯字？`;
  return `${backBar('#/')}<div class="loading">${mascot('sad', 96)}<p>${msg}</p></div>`;
}

// ───────── 詞語卡／成語卡 ─────────
function wordHead(entry, settings) {
  const chars = [...entry.word];
  const syl = settings.zhuyin ? syllables(entry) : null;
  const per = syl && syl.length === chars.length;
  const charHtml = chars.map((c, i) => `<span class="ch"><span class="glyph">${esc(c)}</span>${per ? `<span class="zy">${esc(syl[i])}</span>` : ''}</span>`).join('');
  const whole = syl && !per ? `<p class="zy-line">${esc(syl.join(' '))}</p>` : '';
  return `<section class="card wordhead"><div class="wh-main"><div class="chars">${charHtml}</div>${speakBtn(entry.word, '聽發音', true)}</div>${whole}</section>`;
}

export function viewCard({ entry, settings }) {
  if (entry.type === 'char') return viewChar({ entry, settings });
  const m = entry.common_mistake;
  return `${backBar('#/')}
  ${wordHead(entry, settings)}
  <h2 class="sec">意思</h2>
  <div class="card line"><p>${esc(entry.meaning)}</p>${speakBtn(entry.meaning, '朗讀意思')}</div>
  ${anchorBlock(entry.anchor)}
  ${(entry.examples || []).length ? '<h2 class="sec">例句</h2>' : ''}
  ${(entry.examples || []).map((ex, i) => `<div class="card line"><p class="ex">${hl(ex, entry.word)}</p>${speakBtn(ex, `朗讀例句${i + 1}`)}</div>`).join('')}
  ${entry.pattern ? `<p class="note-line"><span class="label">造句公式</span>${hl(entry.pattern, entry.word)}</p>` : ''}
  ${m && m.wrong && m.right ? `<p class="note-line"><span class="label">常寫錯</span>${mistakeHtml(m)}</p>` : ''}
  ${hasQuiz(entry) ? `<a class="btn primary block" href="#/q1/${enc(entry.word)}">小測驗</a>` : ''}`;
}

// ───────── 字卡 ─────────
function viewChar({ entry, settings }) {
  const readings = (settings.zhuyin && entry.zhuyin && entry.zhuyin.readings) || [];
  const rw = entry.reading_words || [];
  const single = readings.length === 1 ? `<span class="zy-big">${esc(readings[0].bopomofo)}</span>` : '';
  const multi = readings.length > 1
    ? `<div class="readings">${readings.map((r, i) => `<div class="reading"><span class="zy-big">${esc(r.bopomofo)}</span><span class="muted">${esc((rw[i] || []).join('・'))}</span></div>`).join('')}</div>`
    : '';
  const looks = (entry.lookalikes || []).filter((l) => l && l.char);
  const anchor = looks.length >= 2
    ? `<section class="anchor"><h2>${esc(entry.lookalike_title || '看偏旁，就分得清')}</h2><div class="tiles">${looks.map((l) => `<div class="tile${l.char === entry.word ? ' on' : ''}"><span class="tile-ch">${esc(l.char)}</span><span>${esc(l.part)}</span><span class="muted">${esc(l.hint)}${l.word ? ` → ${esc(l.word)}` : ''}</span></div>`).join('')}</div></section>`
    : anchorBlock(entry.anchor);
  const words = entry.common_words || [];
  return `${backBar('#/')}
  <section class="card charhead"><span class="bigchar">${esc(entry.word)}</span><div class="zy-row">${single}${speakBtn(entry.word, '聽發音', true)}</div>${multi}</section>
  <h2 class="sec">意思</h2>
  <div class="card line"><p>${esc(entry.meaning)}</p>${speakBtn(entry.meaning, '朗讀意思')}</div>
  ${words.length ? `<h2 class="sec">常用詞</h2><div class="chips">${words.map((w) => `<a class="chip white" href="#/w/${enc(w)}">${esc(w)}</a>`).join('')}</div>` : ''}
  ${anchor}
  ${hasQuiz(entry) ? `<a class="btn primary block" href="#/q1/${enc(entry.word)}">小測驗</a>` : ''}`;
}

// ───────── 小測驗 1/2：用對了嗎 ─────────
function usageQuestion(entry, order, picked, act) {
  const q = entry.quiz_usage;
  const opts = order.map((k) => ({ key: k, text: k === 'c' ? q.correct : q.wrong }));
  const title = `哪一句的「${entry.word}」用對了？`;
  const optHtml = opts.map((o, i) => {
    const L = 'AB'[i];
    const text = esc(o.text);
    if (!picked) return `<button type="button" class="opt" data-act="${act}" data-k="${o.key}"><span class="badge">${L}</span><span>${text}</span></button>`;
    if (o.key === 'c') return `<div class="opt right"><span class="badge">${icon.check}</span><span class="sr">正確答案：</span><span>${text}</span></div>`;
    if (picked === 'w') return `<div class="opt wrong"><span class="badge">${icon.x}</span><span class="sr">你選的：</span><span>${text}</span></div>`;
    return `<div class="opt dim"><span class="badge">${L}</span><span>${text}</span></div>`;
  }).join('');
  const correctLabel = 'AB'[order.indexOf('c')];
  const fb = !picked ? '' : picked === 'c'
    ? `<p class="fb"><strong class="hl">答對了。</strong>${esc(q.why_right || '')}</p>`
    : `<p class="fb"><strong class="bad">再想想。</strong>${esc(q.explain || '')}所以 ${correctLabel} 才對。</p>`;
  const readAll = `${title}A，${opts[0].text}B，${opts[1].text}`;
  return `<div class="qhead"><h1 class="title">${esc(title)}</h1>${speakBtn(readAll, '朗讀題目和兩個選項')}</div>
  <div class="options">${optHtml}</div>${fb}`;
}

export function viewQuiz1({ entry, session, nextHref }) {
  return `${backBar(`#/w/${enc(entry.word)}`, '回到詞語卡', nextHref.includes('/q2/') ? '1 / 2' : '')}
  ${usageQuestion(entry, session.q1Order, session.q1, 'pick1')}
  ${session.q1 ? `<a class="btn primary block" href="${nextHref}">${nextHref.includes('/q2/') ? '下一題' : '完成'}</a>` : ''}`;
}

// ───────── 小測驗 2/2：比一比 ─────────
export function viewQuiz2({ entry, session }) {
  const [A, B] = entry.quiz_compare.pair;
  const cards = session.q2Items.map((it, i) => {
    const chosen = session.q2[i] || '';
    const parts = esc(it.sentence).split('＿＿');
    const sentence = parts.length > 1 ? `${parts[0]}<span class="blank">${esc(chosen)}</span>${parts.slice(1).join('')}` : esc(it.sentence);
    const readText = it.sentence.replace('＿＿', chosen || '，空格，');
    const picks = [A, B].map((v) => `<button type="button" class="pick${chosen === v ? ' on' : ''}" aria-pressed="${chosen === v}" data-act="pick2" data-i="${i}" data-v="${esc(v)}">${esc(v)}</button>`).join('');
    return `<div class="card qcard"><div class="qrow"><p class="qs">${sentence}</p>${speakBtn(readText, `朗讀第${i + 1}句`)}</div><div class="picks">${picks}</div></div>`;
  }).join('');
  const done = session.q2Items.every((_, i) => session.q2[i]);
  return `${backBar(`#/q1/${enc(entry.word)}`, '回到上一題', '2 / 2')}
  <h1 class="title">比一比</h1>
  <p class="lead">「${esc(A)}」和「${esc(B)}」很容易搞混，把它們放進對的句子。</p>
  ${cards}
  ${done
    ? '<button type="button" class="btn primary block" data-act="submit2">對答案</button>'
    : '<button type="button" class="btn block" disabled>兩句都選好，再對答案</button>'}`;
}

// ───────── 答對 ─────────
export function viewCorrect({ entry, session, state }) {
  const ill = stickerById(session.illus);
  const got = session.sticker ? stickerById(session.sticker) : null;
  const qc = entry.quiz_compare || {};
  const contrast = qc.contrast || {};
  const rows = (qc.pair || []).filter((p) => contrast[p]).map((p) => `<div class="crow"><span class="cw">${esc(p)}</span><span>${esc(contrast[p])}</span></div>`).join('');
  const count = learnedCount(state);
  const lv = levelInfo(count);
  const progress = lv.next ? `已學會 ${count} 個，再 ${lv.toNext} 個就升級` : `已學會 ${count} 個，你已經是詞語大師了`;
  const reward = got
    ? `<div class="card reward">${sticker(got.id, 44)}<div><strong>獲得貼紙「${esc(got.name)}」</strong><span class="muted small">${progress}</span></div></div>`
    : `<p class="muted small center">${progress}</p>`;
  const w = state.words[entry.word] || { stars: 0 };
  const rate = [1, 2, 3].map((n) => `<button type="button" class="rate${w.stars === n ? ' on' : ''}" aria-pressed="${w.stars === n}" aria-label="${n} 顆星，${LEVEL_WORDS[n - 1]}" data-act="rate" data-n="${n}"><span class="stars">${starRow(n)}</span><span>${LEVEL_WORDS[n - 1]}</span></button>`).join('');
  return `<section class="celebrate">${confetti}<h1>答對了！</h1><p class="muted">${esc(ill.caption)}</p>${illustration(ill.id, ill.caption)}</section>
  ${rows ? `<div class="card"><h2 class="sec flush">記住這一組</h2>${rows}</div>` : ''}
  ${reward}
  <div class="card"><div class="q-title">這組詞對你來說難嗎？</div><div class="grid3">${rate}</div><p class="muted small">星星越多，錯題複習時越常出現</p></div>
  <div class="grid2 actions"><a class="btn primary" href="#/write/${enc(entry.word)}">換我造句</a><a class="btn secondary" href="#/">下一個</a></div>`;
}

// ───────── 答錯 ─────────
function moreBlock(entry, session) {
  const x = entry.extra || {};
  const opts = [
    ['simpler', '更簡單的說法', !!x.simpler],
    ['anchor', '換一個記憶畫面', !!(x.alt_anchor && x.alt_anchor.scene)],
    ['examples', '再看兩個例句', !!(x.more_examples && x.more_examples.length)],
    ['story', '聽成語小故事', entry.type === 'idiom' && !!entry.story],
  ].filter((o) => o[2]);
  if (!opts.length) return '';
  const btns = opts.map(([k, label]) => `<button type="button" class="moreopt${session.more === k ? ' on' : ''}" aria-pressed="${session.more === k}" data-act="more" data-k="${k}">${label}</button>`).join('');
  let content = '';
  if (session.more === 'simpler') content = `<div class="card line"><p>${esc(x.simpler)}</p>${speakBtn(x.simpler, '朗讀')}</div>`;
  if (session.more === 'anchor') content = anchorBlock(x.alt_anchor, '換一個畫面記');
  if (session.more === 'examples') content = x.more_examples.map((ex, i) => `<div class="card line"><p class="ex">${hl(ex, entry.word)}</p>${speakBtn(ex, `朗讀例句${i + 1}`)}</div>`).join('');
  if (session.more === 'story') content = `<div class="card line"><p>${esc(entry.story)}</p>${speakBtn(entry.story, '朗讀故事')}</div>`;
  return `<div class="grid2 more">${btns}</div>${content}`;
}

export function viewWrong({ entry, session }) {
  const i = session.wrongItem || 0;
  const it = session.q2Items[i];
  const chosen = session.q2[i] || '';
  const parts = esc(it.sentence).split('＿＿');
  const sentence = parts.length > 1 ? `${parts[0]}<span class="wavy">${esc(chosen)}</span>${parts.slice(1).join('')}` : esc(it.sentence);
  const a = entry.anchor || {};
  return `${backBar(`#/q2/${enc(entry.word)}`, '回到比一比')}
  <div class="oops">${mascot('sad', 76)}<div><h1>差一點點！</h1><p class="muted">第 ${i + 1} 句再看一次</p></div></div>
  <div class="card">
    <p class="big">${sentence}</p>
    ${entry.quiz_compare.explain ? `<div class="explain">${esc(entry.quiz_compare.explain)}</div>` : ''}
    ${a.mnemonic ? `<div class="recall">想想看：${esc(a.mnemonic)}</div>` : ''}
  </div>
  <button type="button" class="btn primary block" data-act="retry2">再挑戰一題</button>
  <button type="button" class="btn secondary block tight" data-act="toggleMore" aria-expanded="${!!session.moreOpen}">${icon.bulb}<span>還是不懂？</span></button>
  ${session.moreOpen ? moreBlock(entry, session) : ''}`;
}

// ───────── 換我造句 ─────────
export function viewWrite({ entry, session }) {
  const fb = session.writeFb;
  return `${backBar(`#/w/${enc(entry.word)}`, '回到詞語卡')}
  <h1 class="title">換我造句</h1>
  <p class="lead">用「${esc(entry.word)}」造一個句子。</p>
  ${entry.pattern ? `<p class="note-line"><span class="label">造句公式</span>${hl(entry.pattern, entry.word)}</p>` : ''}
  <form data-form="write" class="writeform">
    <label class="sr" for="s">你的句子</label>
    <textarea id="s" name="s" rows="3" maxlength="60" required>${esc(session.writeText || '')}</textarea>
    <button class="btn primary block" type="submit"${session.writeBusy ? ' disabled' : ''}>${session.writeBusy ? '糰糰在看…' : '請糰糰看看'}</button>
  </form>
  ${fb ? `<div class="card fbcard">
    ${fb.praise ? `<p>${esc(fb.praise)}</p>` : ''}
    ${fb.note ? `<p class="muted">${esc(fb.note)}</p>` : ''}
    ${fb.suggestion ? `<p><span class="label">可以這樣寫</span>${hl(fb.suggestion, entry.word)}</p>` : ''}
  </div>` : ''}`;
}

// ───────── 錯題複習 ─────────
export function viewReview({ f, list }) {
  const tog = (act, val, on, label, aria = '') => `<button type="button" class="tog${on ? ' on' : ''}" aria-pressed="${on}" data-act="${act}" data-v="${val}"${aria ? ` aria-label="${aria}"` : ''}>${label}</button>`;
  const n = f.count === 'all' ? list.length : Math.min(list.length, f.count);
  const rows = list.slice(0, 5).map((w) => `<a class="wrow" href="#/w/${enc(w.word)}"><span class="ww">${esc(w.word)}</span><span class="stars" role="img" aria-label="${w.stars || 1} 顆星">${starRow(w.stars || 1, 13)}</span><span class="wd">${esc(w.firstSeen.slice(5).replace('-', '/'))}</span>${w.wrong ? `<span class="cnt">錯 ${w.wrong}</span>` : ''}</a>`).join('');
  return `<h1 class="page">錯題複習</h1>
  <div class="card filters">
    <div class="f"><div class="f-t">${icon.calendar}<span>日期區間</span></div>
      <div class="grid2 tight">
        <div class="field"><label for="from">從</label><input id="from" type="date" data-filter="from" value="${esc(f.from)}"></div>
        <div class="field"><label for="to">到</label><input id="to" type="date" data-filter="to" value="${esc(f.to)}"></div>
      </div></div>
    <div class="f"><div class="f-t">要練哪些</div><div class="grid2 tight">${tog('rfScope', 'wrong', f.scope === 'wrong', '答錯過的')}${tog('rfScope', 'all', f.scope === 'all', '全部查過的')}</div></div>
    <div class="f"><div class="f-t">難度星星（可複選）</div><div class="grid3 tight">${[1, 2, 3].map((s) => tog('rfStar', s, f.stars.includes(s), `<span class="stars">${starRow(s, 14)}</span><span>${LEVEL_WORDS[s - 1]}</span>`, `${s} 顆星，${LEVEL_WORDS[s - 1]}`)).join('')}</div></div>
    <div class="f"><div class="f-t">題數</div><div class="grid3 tight">${[10, 20, 'all'].map((c) => tog('rfCount', c, f.count === c, c === 'all' ? '全部' : `${c} 題`)).join('')}</div></div>
  </div>
  <div class="row-between sec-row"><span class="strong">符合條件</span><span class="pri strong">共 ${list.length} 個</span></div>
  ${rows || '<p class="muted center">目前沒有符合條件的字詞</p>'}
  ${list.length > 5 ? `<p class="muted center small">還有 ${list.length - 5} 個…</p>` : ''}
  ${n ? `<button type="button" class="btn primary block" data-act="startReview">開始複習（${n} 題）</button>` : ''}
  <p class="muted center small">同一個複習答對 ${GRADUATE_AFTER} 次，就從錯題本畢業</p>`;
}

export function viewReviewQ({ entry, rs }) {
  const last = rs.i === rs.list.length - 1;
  return `${backBar('#/review', '結束複習', `${rs.i + 1} / ${rs.list.length}`)}
  ${usageQuestion(entry, rs.order, rs.picked, 'rpick')}
  ${rs.picked ? `<button type="button" class="btn primary block" data-act="rnext">${last ? '看結果' : '下一題'}</button>` : ''}`;
}

export function viewReviewDone({ rs }) {
  const ok = rs.results.filter((r) => r.ok).length;
  const grad = rs.results.filter((r) => r.graduated).map((r) => r.word);
  return `<div class="loading">${mascot(ok === rs.results.length ? 'plain' : 'book', 104)}
  <h1 class="page">複習完成！</h1>
  <p>答對 ${ok} / ${rs.results.length} 題</p>
  ${grad.length ? `<p class="muted">從錯題本畢業：${grad.map(esc).join('、')}</p>` : ''}
  <a class="btn primary" href="#/">回首頁</a></div>`;
}

// ───────── 我的 ─────────
export function viewMe({ state, mode }) {
  const count = learnedCount(state);
  const lv = levelInfo(count);
  const ages = AGES.map((a) => `<button type="button" class="agechip${state.settings.age === a.id ? ' on' : ''}" aria-pressed="${state.settings.age === a.id}" data-act="setAge" data-v="${a.id}">${a.label}<small>${a.sub}</small></button>`).join('');
  const ladder = LEVELS.map((l) => {
    const cur = l.lv === lv.cur.lv;
    const done = l.lv < lv.cur.lv;
    const dot = done ? `<span class="dot done">${icon.check}</span>` : cur ? `<span class="dot cur">${l.lv}</span>` : `<span class="dot">${icon.lock}</span>`;
    const right = cur ? `目前・${l.need} 個` : l.need === 0 ? '起點' : `${l.need} 個`;
    return `<div class="lrow${cur ? ' cur' : ''}${!done && !cur ? ' locked' : ''}">${dot}<span class="lname">Lv.${l.lv} ${esc(l.name)}</span><span class="lright">${right}</span></div>`;
  }).join('');
  const owned = STICKERS.filter((s) => state.stickers[s.id]);
  const left = STICKER_TOTAL - owned.length;
  const tiles = owned.map((s) => `<div class="stile">${sticker(s.id, 44, s.name)}<span>${esc(s.name)}</span></div>`).join('')
    + (left > 0 ? `<div class="stile locked">${icon.lock}<span>還有 ${left} 張</span></div>` : '');
  return `<h1 class="page">我的</h1>
  <section class="card hero">${mascot('book', 80)}<div class="hero-t">
    <div class="lv">Lv.${lv.cur.lv} ${esc(lv.cur.name)}</div>
    <div>已學會 <strong>${count}</strong> 個字詞</div>
    <div class="bar"><span style="width:${Math.round(lv.progress * 100)}%"></span></div>
    <div class="muted small">${lv.next ? `再 ${lv.toNext} 個升級「${esc(lv.next.name)}」` : '已經是最高等級了'}</div>
  </div></section>
  <section class="card">
    <div class="f-t">我的年紀</div><div class="grid3">${ages}</div>
    <div class="switch-row"><label for="zy">顯示注音</label><input id="zy" type="checkbox"${state.settings.zhuyin ? ' checked' : ''}></div>
    ${mode === 'worker'
    ? `<form data-form="invite" class="invite-row"><label for="invite">邀請碼</label><input id="invite" name="invite" type="text" class="text" autocomplete="off" value="${esc(state.settings.invite)}"><button class="btn secondary small-btn" type="submit">儲存</button></form>`
    : `<form data-form="apikey" class="invite-row"><label for="apikey">API 金鑰</label>${KEY_INPUT(state.settings.apiKey, '還沒設定')}<button class="btn secondary small-btn" type="submit">儲存</button></form>`}
  </section>
  <h2 class="sec">升級之路</h2>
  <p class="muted small rule">小測驗答對，或錯題複習答對，就算學會一個</p>
  <div class="ladder">${ladder}</div>
  <div class="row-between sec-row"><span class="strong">貼紙收藏</span><span class="muted">${owned.length} / ${STICKER_TOTAL}</span></div>
  <div class="stickers">${tiles}</div>`;
}
