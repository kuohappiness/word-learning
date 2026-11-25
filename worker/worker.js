// 生詞造句 App 的後端代理（Cloudflare Workers）——日後推廣給更多人時才需要。
// 一兩個孩子自己用時，App 的「直接模式」就夠了，不用架這個。
//
// 內容產生的規則都在 ../js/engine.js，這個檔案只負責：邀請碼、每日上限、快取。
// 部署方式：在 worker 資料夾執行 npx wrangler deploy（會自動把 engine.js 一起打包）。
//
// 在 Cloudflare 要設定：
//   Secret  ANTHROPIC_API_KEY   Claude API 金鑰
//   Secret  INVITE_CODE         邀請碼
//   KV      CACHE               綁定名稱必須是 CACHE：存內容快取與每日次數
//   變數    ALLOWED_ORIGIN      例如 https://kuohappiness.github.io（不填 = 允許所有網站呼叫）
//   變數    DAILY_LIMIT         每台裝置每天最多產生幾次新內容，預設 100
//   變數    MODEL               預設 claude-haiku-5-5
//   變數    DICT_BASE（選用）   本機辭典的網址，例如 https://kuohappiness.github.io/word-learning/data/revised/
//   KV      CONCISED（選用）     匯入教育部《國語辭典簡編本》後綁定，注音會優先用簡編本

import { AGES, CJK, OK_TYPES, buildEntry, buildFeedback, entryOk } from '../js/engine.js';

const CACHE_VERSION = 'v1';

function corsHeaders(request, env) {
  const origin = request.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || '').trim();
  return {
    'access-control-allow-origin': allowed ? (origin === allowed ? origin : allowed) : '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-invite-code',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors },
  });
}

function taipeiDay() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

async function overLimit(env, device) {
  if (!env.CACHE) return false;
  const limit = parseInt(env.DAILY_LIMIT || '100', 10);
  const key = `rate:${device}:${taipeiDay()}`;
  const n = parseInt((await env.CACHE.get(key)) || '0', 10);
  if (n >= limit) return true;
  await env.CACHE.put(key, String(n + 1), { expirationTtl: 2 * 24 * 3600 });
  return false;
}

async function handleEntry(body, env, cors) {
  const word = String(body.word || '').replace(/\s+/g, '');
  if (!CJK.test(word)) return json({ error: 'bad_word' }, 400, cors);
  const age = AGES[body.age] ? body.age : '10-11';
  const device = String(body.device || 'anon').slice(0, 64);

  const key = `entry:${CACHE_VERSION}:${age}:${word}`;
  if (env.CACHE) {
    const hit = await env.CACHE.get(key, 'json');
    if (hit) return json(hit, 200, cors);
  }
  if (await overLimit(env, device)) return json({ error: 'limit' }, 429, cors);

  const entry = await buildEntry({ word, age, apiKey: env.ANTHROPIC_API_KEY, provider: 'anthropic', models: { anthropic: env.MODEL }, env: { CONCISED: env.CONCISED, dictBase: env.DICT_BASE } });

  if (env.CACHE) {
    // 好的內容長期保存；查不到、打錯字的結果保存 30 天
    if (entryOk(entry)) await env.CACHE.put(key, JSON.stringify(entry));
    else if (!OK_TYPES.includes(entry.type)) await env.CACHE.put(key, JSON.stringify(entry), { expirationTtl: 30 * 24 * 3600 });
  }
  return json(entry, 200, cors);
}

async function handleSentence(body, env, cors) {
  const word = String(body.word || '').replace(/\s+/g, '');
  const sentence = String(body.sentence || '').trim().slice(0, 60);
  if (!CJK.test(word) || !sentence) return json({ error: 'bad_word' }, 400, cors);
  const age = AGES[body.age] ? body.age : '10-11';
  const device = String(body.device || 'anon').slice(0, 64);
  if (await overLimit(env, device)) return json({ error: 'limit' }, 429, cors);
  const fb = await buildFeedback({ word, sentence, age, apiKey: env.ANTHROPIC_API_KEY, provider: 'anthropic', models: { anthropic: env.MODEL } });
  return json(fb, 200, cors);
}

export async function handle(request, env) {
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return json({ error: 'not_found' }, 404, cors);
  if (!env.INVITE_CODE || request.headers.get('x-invite-code') !== env.INVITE_CODE) {
    return json({ error: 'invite' }, 401, cors);
  }
  const path = new URL(request.url).pathname;
  try {
    const body = await request.json().catch(() => ({}));
    if (path === '/api/entry') return await handleEntry(body, env, cors);
    if (path === '/api/sentence') return await handleSentence(body, env, cors);
    return json({ error: 'not_found' }, 404, cors);
  } catch (e) {
    return json({ error: 'server', detail: String((e && e.message) || e).slice(0, 300) }, 500, cors);
  }
}

export default { fetch: handle };
