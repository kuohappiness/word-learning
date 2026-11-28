#!/usr/bin/env python3
"""把多音字單元資料（data/polyphones/units/*.json）對照教育部《重編國語辭典修訂本》，
產生 App 用的 data/polyphones.json 與給人核對的 data/polyphones/REVIEW.md。

用法：python3 tools/build-polyphones.py <dict-revised.json> [--review-json 路徑]

原則
- 注音只取自辭典：每個例詞先查辭典詞條，取出該字所在位置的讀音；辭典沒有這個詞時，
  再看單字條目的釋義和例子裡有沒有出現這個詞。單元檔裡的 "book" 只拿來比對，不會顯示。
- 書上讀音和辭典不一致、辭典查不到、練習題答案推不出來，都列進 REVIEW.md 給人決定。
- 練習題的答案和選項全部由程式從辭典推出，不手寫注音。
"""
import json, os, re, sys, glob
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNITS = os.path.join(ROOT, 'data', 'polyphones', 'units')
OUT_JSON = os.path.join(ROOT, 'data', 'polyphones.json')
OUT_MD = os.path.join(ROOT, 'data', 'polyphones', 'REVIEW.md')
TONES = 'ˊˇˋ˙'

def clean(s):
    return re.sub(r'[`~]', '', s or '').strip()

def syllables(bpmf):
    bpmf = re.sub(r'（[^）]*）|\([^)]*\)', '', bpmf or '')
    return [s for s in re.split(r'[\s　]+', bpmf.strip()) if s]

def toneless(s):
    return ''.join(ch for ch in s if ch not in TONES)

def is_variant(defs):
    """單字讀音若只寫「(一)之又音」「之讀音」之類，算又讀，不拿來當選項。"""
    return bool(defs) and all(re.search(r'之(又|讀|語)音|的又音', d) for d in defs)

class Dict:
    def __init__(self, path):
        self.idx = {}
        for e in json.load(open(path, encoding='utf-8')):
            t = e.get('title', '')
            if not t or '{' in t:
                continue
            for h in e.get('heteronyms', []):
                defs = [clean(d.get('def')) for d in h.get('definitions', [])]
                texts = [clean(d.get('def')) + ' ' + ' '.join(clean(x) for x in d.get('example', []) or [])
                         for d in h.get('definitions', [])]
                self.idx.setdefault(t, []).append({
                    'b': ' '.join(syllables(h.get('bopomofo'))), 'defs': defs, 'texts': texts})

    def char_readings(self, ch):
        out = []
        for h in self.idx.get(ch, []):
            if h['b'] and h['b'] not in [r['b'] for r in out]:
                out.append({'b': h['b'], 'defs': h['defs'], 'texts': h['texts'], 'variant': is_variant(h['defs'])})
        return out

    def word_readings(self, word, ch):
        """回傳 [(整詞注音或 None, 這個字的讀音, 來源)]。"""
        res = []
        pos = [i for i, c in enumerate(word) if c == ch]
        if not pos:
            return res
        for h in self.idx.get(word, []) if len(word) > 1 else []:
            syl = syllables(h['b'])
            if len(syl) != len(word):
                continue
            got = {syl[i] for i in pos}
            if len(got) == 1:
                res.append((h['b'], got.pop(), '詞條'))
        if res:
            return res
        # 辭典沒有這個詞：看單字條目的釋義、例子裡有沒有寫到它
        for r in self.char_readings(ch):
            if any(word in t for t in r['texts']):
                res.append((None, r['b'], '字條例子'))
        return res

def same_reading(dict_syl, book):
    if dict_syl == book:
        return 'ok'
    if dict_syl.startswith('˙') and toneless(dict_syl) == toneless(book):
        return 'neutral'
    return None

def resolve(D, word, ch, prefer=None, aliases=None):
    """推出 word 裡 ch 的辭典讀音。prefer 是書上的讀音，只用來在一詞多音時挑對應的那一個。
    aliases 是單元檔的 "aliases"：辭典用異體字收錄時（例如「祕魯」收在「秘魯」），改查那個寫法。"""
    cands = D.word_readings(word, ch)
    if not cands and aliases and word in aliases and ch in word:
        alt = aliases[word]
        cands = D.word_readings(alt, alt[word.index(ch)])
    if not cands:
        return None, None, '辭典查不到'
    if prefer:
        for want in ('ok', 'neutral'):
            for full, syl, src in cands:
                if same_reading(syl, prefer) == want:
                    return syl, full, src
    syls = {syl for _, syl, _ in cands}
    if len(syls) == 1:
        full, syl, src = cands[0]
        return syl, full, src
    return None, None, '辭典有幾種讀法：' + '、'.join(sorted(syls))

def load_units():
    units = []
    for p in sorted(glob.glob(os.path.join(UNITS, '*.json'))):
        u = json.load(open(p, encoding='utf-8'), object_pairs_hook=OrderedDict)
        u['_file'] = os.path.relpath(p, ROOT)
        units.append(u)
    return units

def build(D, units):
    app = {'chars': OrderedDict(), 'units': []}
    review = []
    issues = []
    for u in units:
        ru = {'unit': u['unit'], 'page': u['page'], 'chars': [], 'practice': [], 'skipped': u.get('skipped', [])}
        book_reading_of = {}  # (char, word) -> 書上讀音，給練習題挑一詞多音用
        for ch, groups in u['chars'].items():
            dr = D.char_readings(ch)
            dict_bs = [r['b'] for r in dr]
            rc = {'char': ch, 'groups': [], 'extra': []}
            app_groups = []
            for g in groups:
                B = g['book']
                rg = {'book': B, 'in_dict': B in dict_bs, 'senses': [],
                      'dict_defs': next((r['defs'] for r in dr if r['b'] == B), [])}
                derived = set()
                app_senses = []
                for s in g['senses']:
                    rs = {'gloss': s['gloss'], 'note': s.get('note'), 'words': []}
                    app_words = []
                    for w in s['words']:
                        book_reading_of[(ch, w)] = B
                        syl, full, how = resolve(D, w, ch, prefer=B, aliases=u.get('aliases'))
                        if syl is None:
                            st = 'missing'
                        else:
                            st = same_reading(syl, B) or 'conflict'
                        if st == 'conflict':
                            derived.add(syl)
                            issues.append({'unit': u['unit'], 'kind': '讀音不同', 'char': ch,
                                           'text': f'「{w}」書上標 {B}，辭典讀 {syl}'})
                        elif st == 'missing' and ch in w and len(w) > 1:
                            issues.append({'unit': u['unit'], 'kind': '辭典查不到', 'char': ch,
                                           'text': f'「{w}」（{B}）：{how}'})
                        rs['words'].append({'w': w, 'zhuyin': full, 'char_zhuyin': syl, 'how': how, 'status': st})
                        if st in ('ok', 'neutral'):
                            app_words.append({'w': w, 'zhuyin': full})
                        elif st == 'missing':
                            app_words.append({'w': w, 'zhuyin': None})
                    rg['senses'].append(rs)
                    if app_words or not s['words']:
                        sense = {'gloss': s['gloss']}
                        if s.get('note'):
                            sense['note'] = s['note']
                        sense['words'] = app_words
                        app_senses.append(sense)
                # 這一組顯示的注音：書上讀音在辭典的單字讀音裡才用；否則看例詞推出的辭典讀音是否一致
                if rg['in_dict']:
                    shown = B
                elif len(derived) == 1:
                    shown = derived.pop()
                else:
                    shown = None
                if not rg['in_dict']:
                    issues.append({'unit': u['unit'], 'kind': '讀音不在辭典', 'char': ch,
                                   'text': f'書上讀音 {B} 不在辭典「{ch}」字的讀音裡（辭典：{"、".join(dict_bs) or "無"}）'
                                           + (f'；App 改顯示辭典讀音 {shown}' if shown else '；App 不顯示注音')})
                rg['shown'] = shown
                rc['groups'].append(rg)
                if app_senses:
                    app_groups.append({'zhuyin': shown, 'senses': app_senses})
            book_bs = {g['book'] for g in groups}
            rc['extra'] = [{'b': r['b'], 'defs': r['defs'][:2]} for r in dr
                           if r['b'] not in book_bs and not r['variant']
                           and not all(d.startswith('姓') for d in r['defs'])]
            ru['chars'].append(rc)
            app['chars'][ch] = {'unit': u['unit'], 'readings': app_groups}

        app_unit = {'unit': u['unit'], 'chars': list(u['chars'].keys()), 'practice': []}
        for i, q in enumerate(u.get('practice', []), 1):
            ch, t = q['char'], q['type']
            rq = {'n': i, 'type': t, 'char': ch, 'text': q.get('text'), 'word': q.get('word'),
                  'words': q.get('words'), 'answer': None, 'options': None, 'problem': None}
            if t in ('word', 'sentence', 'pick'):
                w = q['word']
                if ch not in w:
                    rq['problem'] = f'「{w}」裡沒有「{ch}」'
                elif t != 'word' and w not in (q.get('text') or ''):
                    rq['problem'] = f'句子裡找不到「{w}」'
                else:
                    syl, full, how = resolve(D, w, ch, prefer=book_reading_of.get((ch, w)), aliases=u.get('aliases'))
                    if syl is None:
                        rq['problem'] = how
                    else:
                        rq['answer'] = syl
                        rq['word_zhuyin'] = full
                if t == 'pick' and rq['answer']:
                    # 選項：這個單元教過、且辭典也有的讀音；不夠兩個才補辭典其他讀音
                    seen = [g['book'] for g in u['chars'].get(ch, [])]
                    pool = [r['b'] for r in D.char_readings(ch) if not r['variant']]
                    taught = [b for b in pool if b in seen]
                    opts = [rq['answer']] + [b for b in taught if b != rq['answer']]
                    opts += [b for b in pool if b not in opts][:max(0, 2 - len(opts))]
                    if len(opts) < 2:
                        rq['problem'] = '辭典裡只有一個讀音，做不成選擇題'
                    rq['options'] = sorted(opts[:3], key=lambda b: pool.index(b) if b in pool else 99)
            elif t == 'odd':
                per = []
                for w in q['words']:
                    syl, full, how = resolve(D, w, ch, prefer=book_reading_of.get((ch, w)), aliases=u.get('aliases'))
                    per.append((w, syl))
                rq['per'] = per
                if any(s is None for _, s in per):
                    rq['problem'] = '有詞推不出讀音：' + '、'.join(w for w, s in per if s is None)
                else:
                    counts = {}
                    for _, s in per:
                        counts[s] = counts.get(s, 0) + 1
                    lone = [w for w, s in per if counts[s] == 1]
                    if len(counts) == 2 and len(lone) == 1:
                        rq['answer'] = lone[0]
                    else:
                        rq['problem'] = '不是剛好只有一個詞讀音不同'
            if rq['problem']:
                issues.append({'unit': u['unit'], 'kind': '練習題', 'char': ch, 'text': f'第 {i} 題：{rq["problem"]}'})
            else:
                item = {'type': t, 'char': ch}
                for k in ('text', 'word', 'words', 'options'):
                    if rq.get(k):
                        item[k] = rq[k]
                item['answer'] = rq['answer']
                app_unit['practice'].append(item)
            ru['practice'].append(rq)
        app['units'].append(app_unit)
        review.append(ru)
    return app, review, issues

STATUS = {'ok': '✓', 'neutral': '✓ 輕聲', 'conflict': '✗ 讀音不同', 'missing': '？ 辭典無此詞'}
TYPES = {'word': '詞語填音', 'sentence': '句子填音', 'pick': '選出正確讀音', 'odd': '哪個讀音不同'}

def mark(text, word, ch):
    if not text:
        return f'「{word}」'.replace(ch, f'**{ch}**', 1)
    i = text.find(word)
    j = i + word.index(ch)
    return text[:j] + f'「**{ch}**」' + text[j + 1:]

def write_md(review, issues):
    L = ['# 多音字資料核對表', '',
         '由 `tools/build-polyphones.py` 產生，請勿手改；要修改請改 `data/polyphones/units/` 再重新產生。',
         '注音全部來自教育部《重編國語辭典修訂本》。「書上」只用來比對，不會顯示在 App。', '']
    kinds = OrderedDict()
    for it in issues:
        kinds.setdefault(it['kind'], []).append(it)
    L += ['## 需要確認的地方', '']
    if not issues:
        L += ['沒有。', '']
    for k, its in kinds.items():
        L += [f'### {k}（{len(its)}）', '']
        L += [f'- 第 {it["unit"]} 單元「{it["char"]}」：{it["text"]}' for it in its]
        L += ['']
    for ru in review:
        L += [f'## 第 {ru["unit"]} 單元（書頁 {ru["page"]}）：{"、".join(c["char"] for c in ru["chars"])}', '']
        for rc in ru['chars']:
            L += [f'### {rc["char"]}', '']
            for rg in rc['groups']:
                shown = rg['shown'] or '（不顯示）'
                head = f'**{shown}**' if rg['shown'] == rg['book'] else f'**{shown}**（書上 {rg["book"]}）'
                L += [f'- {head}']
                for n, s in enumerate(rg['senses'], 1):
                    note = f'（{s["note"]}）' if s.get('note') else ''
                    ws = '、'.join(
                        f'{w["w"]}' + (f' {w["zhuyin"]}' if w['zhuyin'] else '') + ('' if w['status'] == 'ok' else f' {STATUS[w["status"]]}')
                        for w in s['words'])
                    L += [f'  {n}. {s["gloss"]}{note}　例：{ws}']
                if rg['dict_defs']:
                    L += [f'  - 辭典釋義：' + ' ／ '.join(rg['dict_defs'][:4])]
            if rc['extra']:
                L += ['- 辭典另有、書上沒收：' + '；'.join(f'{e["b"]}（{e["defs"][0] if e["defs"] else ""}）' for e in rc['extra'])]
            L += ['']
        if ru['skipped']:
            L += ['**沒收進來的**', '']
            L += [f'- 「{s["char"]}」{s["book"]} {s["what"]}：{s["reason"]}' for s in ru['skipped']]
            L += ['']
        L += ['**練習題（答案由辭典推出）**', '', '| # | 題型 | 題目 | 答案 |', '|---|---|---|---|']
        for q in ru['practice']:
            if q['type'] == 'odd':
                body = '、'.join(f'「{w}」' for w in q['words'])
                ans = q['answer'] or '—'
                if q.get('per'):
                    ans += '（' + '，'.join(f'{w} {s or "?"}' for w, s in q['per']) + '）'
            else:
                body = mark(q['text'], q['word'], q['char'])
                if q['options']:
                    body += '<br>選項：' + '　'.join(q['options'])
                ans = q['answer'] or '—'
            if q['problem']:
                ans += f' ⚠ {q["problem"]}'
            L += [f'| {q["n"]} | {TYPES[q["type"]]} | {body} | {ans} |']
        L += ['']
    os.makedirs(os.path.dirname(OUT_MD), exist_ok=True)
    open(OUT_MD, 'w', encoding='utf-8').write('\n'.join(L))

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    D = Dict(sys.argv[1])
    app, review, issues = build(D, load_units())
    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(app, f, ensure_ascii=False, separators=(',', ':'))
    write_md(review, issues)
    if '--review-json' in sys.argv:
        p = sys.argv[sys.argv.index('--review-json') + 1]
        json.dump({'review': review, 'issues': issues}, open(p, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'{len(app["chars"])} 個字、{sum(len(u["practice"]) for u in app["units"])} 題練習；需要確認 {len(issues)} 處')

if __name__ == '__main__':
    main()
