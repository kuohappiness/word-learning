#!/usr/bin/env python3
import json, sys, os, re
# 從教育部《重編國語辭典修訂本》JSON（g0v/moedict-data 格式）產生 data/revised/ 的分片查詢檔。
# 用法：python3 tools/build-dict.py dict-revised.json data/revised
# 分片規則要和 js/engine.js 的 shardOf() 一致：第一個字的碼位 % 256。
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
N = 256
shards = [dict() for _ in range(N)]
clean = lambda s: re.sub(r'[`~]', '', s or '').strip()
n=0
for e in d:
    t = e.get('title','')
    if '{' in t or not t: continue
    rs = []
    for h in e.get('heteronyms', []):
        b = (h.get('bopomofo') or '').strip()
        if not b: continue
        defs = [clean(x.get('def')) for x in h.get('definitions', [])][:4]
        defs = [x for x in defs if x]
        r = {'b': b, 'd': defs}
        syn = []; ant = []
        for x in h.get('definitions', []):
            if x.get('synonyms'): syn += x['synonyms'].split(',')
            if x.get('antonyms'): ant += x['antonyms'].split(',')
        if syn: r['s'] = syn[:4]
        if ant: r['a'] = ant[:4]
        rs.append(r)
    if not rs: continue
    k = ord(t[0]) % N
    shards[k][t] = rs
    n+=1
os.makedirs(out, exist_ok=True)
tot=0
for i,s in enumerate(shards):
    p = os.path.join(out, f'{i:02x}.json')
    with open(p,'w') as f: json.dump(s, f, ensure_ascii=False, separators=(',',':'))
    tot += os.path.getsize(p)
print(n, 'entries', tot/1e6, 'MB')
