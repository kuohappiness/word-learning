// 取得字詞內容與造句回饋。三種模式：
//   worker：config.js 填了 workerUrl → 經過 Cloudflare Worker（日後推廣時用）
//   direct：裝置上存了 API 金鑰 → App 直接呼叫 Claude 或 OpenAI（一兩個孩子自己用）
//   demo：都沒有 → 只能查內建範例
import { DEMO } from './demo.js';
import { buildEntry, buildFeedback, EngineError } from './engine.js';

export class ApiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export function modeOf(cfg, settings) {
  if (cfg.workerUrl) return 'worker';
  if (settings.apiKey) return 'direct';
  return 'demo';
}

const modelsOf = (cfg) => ({ anthropic: cfg.model, openai: cfg.openaiModel });

function base(cfg) {
  return String(cfg.workerUrl || '').replace(/\/+$/, '');
}

async function post(cfg, path, body, invite) {
  let res;
  try {
    res = await fetch(base(cfg) + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-invite-code': invite || '' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('network');
  }
  if (res.status === 401) throw new ApiError('invite');
  if (res.status === 429) throw new ApiError('limit');
  if (res.status === 400) throw new ApiError('bad_word');
  if (!res.ok) throw new ApiError('server');
  try {
    return await res.json();
  } catch {
    throw new ApiError('server');
  }
}

async function direct(fn) {
  try {
    return await fn();
  } catch (e) {
    throw new ApiError(e instanceof EngineError ? e.kind : 'server');
  }
}

export async function fetchEntry(word, settings, cfg) {
  const mode = modeOf(cfg, settings);
  if (mode === 'worker') {
    return post(cfg, '/api/entry', { word, age: settings.age, device: settings.device }, settings.invite);
  }
  if (mode === 'direct') {
    return direct(() => buildEntry({ word, age: settings.age, apiKey: settings.apiKey, models: modelsOf(cfg), browser: true }));
  }
  const d = DEMO[word];
  if (d) return JSON.parse(JSON.stringify(d));
  throw new ApiError('demo');
}

export async function fetchFeedback(word, sentence, settings, cfg) {
  const mode = modeOf(cfg, settings);
  if (mode === 'worker') {
    return post(cfg, '/api/sentence', { word, sentence, age: settings.age, device: settings.device }, settings.invite);
  }
  if (mode === 'direct') {
    return direct(() => buildFeedback({ word, sentence, age: settings.age, apiKey: settings.apiKey, models: modelsOf(cfg), browser: true }));
  }
  return {
    ok: true,
    praise: '試用模式還不能請糰糰看句子。',
    suggestion: '',
    note: '貼上 API 金鑰之後，糰糰會告訴你哪裡寫得好、怎麼改會更通順。',
  };
}
