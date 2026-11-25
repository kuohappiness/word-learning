// 產生字詞內容的核心：查教育部辭典、請 AI（Claude 或 OpenAI）依說明書規則編寫、整理成固定格式。
// App 的「直接模式」和 Cloudflare Worker 都用這一份，規則只寫在這裡。
// 注音只來自教育部辭典，絕不讓 AI 產生。

const MOEDICT = 'https://www.moedict.tw/uni/'; // 萌典 API：教育部《重編國語辭典修訂本》資料
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
export const DEFAULT_MODEL = 'claude-haiku-5-5';
export const DEFAULT_OPENAI_MODEL = 'gpt-6-luna';
export const OK_TYPES = ['char', 'word', 'idiom'];
export const CJK = /^[㐀-䶿一-鿿豈-﫿]{1,12}$/;

export const AGES = {
  '10-11': '10–11 歲（國小高年級）：短句；學校、家人、寵物等生活情境；用最白話的方式解釋。',
  '12-14': '12–14 歲（國中）：中等長度；可以有社團、同學相處、簡單時事等情境。',
  '15-16': '15–16 歲（高中）：情境可以比較抽象；可以帶出近義詞的差別、正式和口語的用法。',
};

export const SYSTEM_ENTRY = `你是「生詞造句」App 的國語老師，替台灣 10–16 歲的學生編寫字詞學習卡。一律使用繁體中文和台灣用語。
最上層原則：讓學生更輕鬆、更有效率、更正確地吸收知識。

【正確性】
- 不要輸出任何注音或拼音；注音由程式從教育部辭典取得。
- 意思必須符合提供給你的教育部辭典釋義；用自己的話改寫，不可逐字照抄，也不可偏離。
- 拆字只能用真正的字源（例如形聲字的偏旁）；不要用諧音記憶；不要編造典故。
- 所有句子內容正向、適合兒少。

【編寫原則】
1. meaning：一句白話解釋，用字比學生程度更簡單；不用更難的詞解釋，也不用這個字詞本身解釋。
2. anchor：只給一個最好記的記憶錨點。kind 是 scene（以吉祥物「糰糰」——一顆白色湯圓——為主角、誇張但貼切的小場景）、split（字形拆解）、contrast（和長得像的字詞對比）、story（成語典故濃縮）、life（連結學生年齡的生活經驗）其中之一。scene 寫一兩句話。mnemonic 是一句口訣，格式像「迫不及待 ＝ 人心裡急，等不了」。
3. examples：兩句，情境不同；句子裡要有原因和動作，讓人光看上下文就猜得出意思，換成別的詞就不通。
4. pattern：一個造句公式，例如「迫不及待地＋馬上做某件事」。
5. common_mistake：只有常見錯字或常見誤用時才填，例如 {"wrong":"迫不急待","right":"迫不及待"}；否則填 null。

【小測驗】
- quiz_usage：correct 是正確使用目標字詞的一句；wrong 是讀起來通順、但意思用錯的一句（考理解，不是挑語病）。兩句都不可以和 examples 重複。why_right 用一句話說明 correct 為什麼對；explain 用一句話說明 wrong 錯在哪裡。錯的明顯程度依年齡調整，年紀越大越細微。
- quiz_compare：pair 是 [目標字詞, 容易混淆的另一個]。字 → 形近字；詞 → 意思相近但用法不同，或反義詞；成語 → 長得像的成語，或意思相反的成語。items 給四句，每句剛好有一個「＿＿」空格，其中兩句的答案是目標字詞、兩句的答案是另一個；答案放進空格後要通順正確。contrast 用很短的話對照兩者，例如 {"迫不及待":"人心裡急，等不了","迫在眉睫":"事情急，就在眼前"}。explain 用一句話說明兩者的差別。

【還是不懂時】
- extra.simpler：比 meaning 更簡單的說法。
- extra.alt_anchor：另一個不同類型的記憶錨點 {"scene":"","mnemonic":""}。
- extra.more_examples：另外兩句新例句。
- story：只有成語才填，把典故濃縮成三句以內；不確定出處就填 null。

【單一個字（type 為 char）另外要填】
- common_words：三個常用詞。
- lookalikes：只有真的有共用同一個聲旁的形近字家族時才填（包含目標字本身，最多四個），每個 {"char":"辯","part":"中間是「言」","hint":"用嘴說","word":"辯論"}；lookalike_title 例如「看中間，就分得清」。沒有就給 []。
- 如果提供的讀音不只一個，reading_words 依讀音順序各給一到兩個常用詞，例如 [["銀行"],["行走","旅行"]]。

【特殊情況】只輸出其中一個，不要其他欄位：
- 字詞不適合兒少：{"type":"blocked"}
- 很可能是常見字詞打錯：{"type":"typo","suggest":"正確寫法"}
- 不是中文字詞：{"type":"unknown"}

【輸出】只輸出一個 JSON 物件，不要任何說明文字，也不要程式碼框。格式：
{"type":"char 或 word 或 idiom","meaning":"","anchor":{"kind":"","scene":"","mnemonic":""},"examples":["",""],"pattern":"","common_mistake":null,"quiz_usage":{"correct":"","wrong":"","why_right":"","explain":""},"quiz_compare":{"pair":["",""],"items":[{"sentence":"","answer":""}],"contrast":{},"explain":""},"extra":{"simpler":"","alt_anchor":{"scene":"","mnemonic":""},"more_examples":["",""]},"story":null,"common_words":[],"lookalikes":[],"lookalike_title":"","reading_words":[]}`;

export const SYSTEM_SENTENCE = `你是溫和的國語老師「糰糰」，幫台灣 10–16 歲的學生看他用指定字詞造的句子。一律使用繁體中文和台灣用語。
只輸出一個 JSON 物件，不要其他文字：
{"ok":true 或 false,"praise":"一句具體的鼓勵，說出寫得好的地方","note":"用法錯了就用一句話說明哪裡不對；用法正確就填空字串","suggestion":"改得更通順或用法正確的一句；原句已經很好就給一個更生動的版本"}
- ok 表示目標字詞的用法是否正確。
- 語氣溫和，不嘲笑；用字符合學生年齡。
- 如果句子內容不適合兒少，praise 改成提醒換一個主題，suggestion 給一個適合的例句。`;

// kind：apikey（金鑰錯）、credit（額度用完）、busy（太忙，稍後再試）、network（連不上）、server（其他）
export class EngineError extends Error {
  constructor(kind, status = 0, detail = '') {
    super(`${kind} ${status} ${detail}`.trim());
    this.kind = kind;
    this.status = status;
  }
}

export function parseJson(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no json');
  return JSON.parse(t.slice(start, end + 1));
}

export async function callClaude({ apiKey, model, system, user, maxTokens, browser = false }) {
  const headers = {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };
  // 從瀏覽器直接呼叫時，Claude API 要求加上這個標頭
  if (browser) headers['anthropic-dangerous-direct-browser-access'] = 'true';
  let res;
  try {
    res = await fetch(CLAUDE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
  } catch (e) {
    throw new EngineError('network', 0, String(e));
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    let kind = 'server';
    if (res.status === 401 || res.status === 403) kind = 'apikey';
    else if (res.status === 429 || res.status === 529) kind = 'busy';
    else if (/credit|balance|billing/i.test(detail)) kind = 'credit';
    throw new EngineError(kind, res.status, detail.slice(0, 200));
  }
  const data = await res.json();
  return (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
}

// OpenAI 的模型會先思考再回答，思考用掉的 token 也算在上限裡，所以上限要多留一倍
export async function callOpenAI({ apiKey, model, system, user, maxTokens }) {
  let res;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: model || DEFAULT_OPENAI_MODEL,
        reasoning_effort: 'low',
        max_completion_tokens: maxTokens * 2,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    });
  } catch (e) {
    throw new EngineError('network', 0, String(e));
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    let kind = 'server';
    if (res.status === 401 || res.status === 403) kind = 'apikey';
    // 429 可能是額度用完，也可能只是暫時太忙
    else if (res.status === 429) kind = /insufficient_quota|billing|quota/i.test(detail) ? 'credit' : 'busy';
    else if (res.status === 503) kind = 'busy';
    throw new EngineError(kind, res.status, detail.slice(0, 200));
  }
  const data = await res.json();
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return typeof content === 'string' ? content : '';
}

// 用金鑰的開頭判斷是哪一家：sk-ant- 是 Claude，其他是 OpenAI
export const providerOf = (apiKey) => (/^sk-ant-/.test(String(apiKey || '').trim()) ? 'anthropic' : 'openai');

// models：{ anthropic, openai }，沒填就用預設
// provider 沒指定就看金鑰判斷
export function callModel({ apiKey, provider, models = {}, system, user, maxTokens, browser = false }) {
  return (provider || providerOf(apiKey)) === 'openai'
    ? callOpenAI({ apiKey, model: models.openai, system, user, maxTokens })
    : callClaude({ apiKey, model: models.anthropic, system, user, maxTokens, browser });
}

// ───────── 教育部辭典 ─────────
const cleanDef = (s) => String(s || '').replace(/[`~]/g, '').trim();

export async function lookupDict(word, env = {}) {
  if (env.CONCISED) {
    const hit = await env.CONCISED.get(word, 'json');
    if (hit && Array.isArray(hit.readings) && hit.readings.length) {
      return { source: 'concised', readings: hit.readings };
    }
  }
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
  try {
    const res = await fetch(MOEDICT + encodeURIComponent(word), {
      headers: { accept: 'application/json' },
      signal: ctrl ? ctrl.signal : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const readings = (data.heteronyms || [])
      .filter((h) => h && h.bopomofo)
      .map((h) => ({
        bopomofo: String(h.bopomofo).trim(),
        defs: (h.definitions || []).slice(0, 4).map((d) => cleanDef(d.def)).filter(Boolean),
      }));
    return readings.length ? { source: 'revised', readings } : null;
  } catch {
    // 查不到或連不上辭典：不顯示注音
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ───────── 整理 AI 回傳的內容 ─────────
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const strList = (v, n) => (Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, n) : []);

export function normalizeEntry(raw, word, dict) {
  const type = str(raw.type);
  if (type === 'blocked') return { type: 'blocked', word };
  if (type === 'unknown') return { type: 'unknown', word };
  if (type === 'typo') {
    const suggest = str(raw.suggest);
    return CJK.test(suggest) && suggest !== word ? { type: 'typo', word, suggest } : { type: 'unknown', word };
  }

  let t = OK_TYPES.includes(type) ? type : 'word';
  if ([...word].length === 1) t = 'char';
  else if (t === 'char') t = 'word';

  const anchor = raw.anchor && typeof raw.anchor === 'object'
    ? { kind: str(raw.anchor.kind), scene: str(raw.anchor.scene), mnemonic: str(raw.anchor.mnemonic) }
    : null;
  const cm = raw.common_mistake && str(raw.common_mistake.wrong) && str(raw.common_mistake.right)
    ? { wrong: str(raw.common_mistake.wrong), right: str(raw.common_mistake.right) }
    : null;

  const qu = raw.quiz_usage || {};
  const quiz_usage = str(qu.correct) && str(qu.wrong)
    ? { correct: str(qu.correct), wrong: str(qu.wrong), why_right: str(qu.why_right), explain: str(qu.explain) }
    : null;

  let quiz_compare = null;
  const qc = raw.quiz_compare || {};
  const pair = strList(qc.pair, 2);
  if (pair.length === 2 && pair[0] === word && pair[1] !== word) {
    const items = (Array.isArray(qc.items) ? qc.items : [])
      .map((it) => ({
        sentence: str(it && it.sentence).replace(/[_＿]{1,}|（\s*）|\(\s*\)|○+/g, '＿＿').replace(/(＿＿)+/g, '＿＿'),
        answer: str(it && it.answer),
      }))
      .filter((it) => pair.includes(it.answer) && it.sentence.split('＿＿').length === 2);
    const hasA = items.some((i) => i.answer === pair[0]);
    const hasB = items.some((i) => i.answer === pair[1]);
    if (hasA && hasB) {
      const contrast = {};
      for (const p of pair) if (qc.contrast && str(qc.contrast[p])) contrast[p] = str(qc.contrast[p]);
      quiz_compare = { pair, items, contrast, explain: str(qc.explain) };
    }
  }

  const x = raw.extra || {};
  const alt = x.alt_anchor && str(x.alt_anchor.scene)
    ? { scene: str(x.alt_anchor.scene), mnemonic: str(x.alt_anchor.mnemonic) }
    : null;

  return {
    word,
    type: t,
    meaning: str(raw.meaning),
    anchor,
    examples: strList(raw.examples, 2),
    pattern: str(raw.pattern),
    common_mistake: cm,
    quiz_usage,
    quiz_compare,
    extra: { simpler: str(x.simpler), alt_anchor: alt, more_examples: strList(x.more_examples, 2) },
    story: t === 'idiom' ? (str(raw.story) || null) : null,
    common_words: t === 'char' ? strList(raw.common_words, 4) : [],
    lookalikes: t === 'char' && Array.isArray(raw.lookalikes)
      ? raw.lookalikes
        .map((l) => ({ char: str(l && l.char), part: str(l && l.part), hint: str(l && l.hint), word: str(l && l.word) }))
        .filter((l) => [...l.char].length === 1)
        .slice(0, 4)
      : [],
    lookalike_title: str(raw.lookalike_title),
    reading_words: Array.isArray(raw.reading_words) ? raw.reading_words.map((r) => strList(r, 2)) : [],
    // 注音只來自辭典
    zhuyin: dict ? { source: dict.source, readings: dict.readings.map((r) => ({ bopomofo: r.bopomofo })) } : null,
  };
}

export function problems(entry) {
  if (!OK_TYPES.includes(entry.type)) return [];
  const p = [];
  if (!entry.meaning) p.push('缺少 meaning');
  if (entry.examples.length < 2) p.push('examples 要兩句');
  if (!entry.quiz_usage) p.push('quiz_usage 不完整');
  if (!entry.quiz_compare) p.push('quiz_compare 不完整：pair 第一個要是目標字詞，items 每句要有「＿＿」，兩個答案都要出現');
  return p;
}

export const entryOk = (entry) => OK_TYPES.includes(entry.type) && !problems(entry).length;

export function entryPrompt(word, age, dict) {
  const lines = [
    `目標字詞：${word}（${[...word].length} 個字）`,
    `學生年齡：${AGES[age] || AGES['10-11']}`,
  ];
  if (dict) {
    lines.push(`教育部辭典：有收錄，共 ${dict.readings.length} 個讀音。以下是辭典釋義，請以它為準：`);
    dict.readings.forEach((r, i) => {
      lines.push(`讀音 ${i + 1} 的釋義：`);
      (r.defs || []).forEach((d, j) => lines.push(`  ${j + 1}. ${d}`));
    });
  } else {
    lines.push('教育部辭典：查無此詞。如果它是正確、常用的字詞，照常編寫；如果很可能是打錯字，回傳 typo；如果不是中文字詞，回傳 unknown。');
  }
  return lines.join('\n');
}

// 產生一個字詞的完整內容；內容不完整或格式錯會再請 AI 重寫一次
export async function buildEntry({ word, age, apiKey, provider, models, env = {}, browser = false }) {
  const dict = await lookupDict(word, env);
  const prompt = entryPrompt(word, age, dict);
  const ask = async (p) => {
    const text = await callModel({ apiKey, provider, models, system: SYSTEM_ENTRY, user: p, maxTokens: 3000, browser });
    try { return normalizeEntry(parseJson(text), word, dict); } catch { return null; }
  };
  let entry = await ask(prompt);
  const issues = entry ? problems(entry) : ['輸出不是合法的 JSON'];
  if (issues.length) {
    const retried = await ask(`${prompt}\n\n上一次的輸出有問題：${issues.join('；')}。請重新輸出完整的 JSON。`);
    if (retried) entry = retried;
  }
  if (!entry) throw new EngineError('server', 0, 'bad json');
  entry.age = age;
  return entry;
}

export async function buildFeedback({ word, sentence, age, apiKey, provider, models, browser = false }) {
  const user = `目標字詞：${word}\n學生年齡：${AGES[age] || AGES['10-11']}\n學生的句子：${sentence}`;
  const text = await callModel({ apiKey, provider, models, system: SYSTEM_SENTENCE, user, maxTokens: 600, browser });
  let raw;
  try { raw = parseJson(text); } catch { throw new EngineError('server', 0, 'bad json'); }
  return { ok: raw.ok === true, praise: str(raw.praise), note: str(raw.note), suggestion: str(raw.suggestion) };
}
