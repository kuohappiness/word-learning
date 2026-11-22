// 和 Cloudflare Worker 溝通。workerUrl 留空時使用內建範例（試用模式）。
import { DEMO } from './demo.js';

export class ApiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

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

export async function fetchEntry(word, settings, cfg) {
  if (!cfg.workerUrl) {
    const d = DEMO[word];
    if (d) return JSON.parse(JSON.stringify(d));
    throw new ApiError('demo');
  }
  return post(cfg, '/api/entry', { word, age: settings.age, device: settings.device }, settings.invite);
}

export async function fetchFeedback(word, sentence, settings, cfg) {
  if (!cfg.workerUrl) {
    return {
      ok: true,
      praise: '試用模式還不能請糰糰看句子。',
      suggestion: '',
      note: '接上 AI 之後，糰糰會告訴你哪裡寫得好、怎麼改會更通順。',
    };
  }
  return post(cfg, '/api/sentence', { word, sentence, age: settings.age, device: settings.device }, settings.invite);
}
