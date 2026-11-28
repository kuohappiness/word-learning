#!/usr/bin/env python3
"""把 data/polyphones/units/*.json 排成固定格式（一個義項、一題一行），讓 diff 好讀。
用法：python3 tools/format-unit.py data/polyphones/units/07.json [...]"""
import json, sys
from collections import OrderedDict

def one(x):
    s = json.dumps(x, ensure_ascii=False, separators=(', ', ': '))
    return '{ ' + s[1:-1] + ' }' if s.startswith('{') else s

def fmt(u):
    L = ['{']
    keys = list(u.keys())
    for i, k in enumerate(keys):
        end = ',' if i < len(keys) - 1 else ''
        v = u[k]
        if k == 'chars':
            L.append('  "chars": {')
            cs = list(v.items())
            for j, (ch, gs) in enumerate(cs):
                L.append(f'    {json.dumps(ch, ensure_ascii=False)}: [')
                for m, g in enumerate(gs):
                    L.append(f'      {{ "book": {json.dumps(g["book"], ensure_ascii=False)}, "senses": [')
                    L += ['        ' + one(s) + (',' if n < len(g['senses']) - 1 else '') for n, s in enumerate(g['senses'])]
                    L.append('      ]}' + (',' if m < len(gs) - 1 else ''))
                L.append('    ]' + (',' if j < len(cs) - 1 else ''))
            L.append('  }' + end)
        elif isinstance(v, list):
            L.append(f'  "{k}": [')
            L += ['    ' + one(x) + (',' if n < len(v) - 1 else '') for n, x in enumerate(v)]
            L.append('  ]' + end)
        else:
            L.append(f'  "{k}": ' + one(v) + end)
    L.append('}')
    return '\n'.join(L) + '\n'

for p in sys.argv[1:]:
    u = json.load(open(p, encoding='utf-8'), object_pairs_hook=OrderedDict)
    open(p, 'w', encoding='utf-8').write(fmt(u))
