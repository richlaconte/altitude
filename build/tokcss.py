import json, sys
t = json.load(open(sys.argv[1]))
themes = [x['id'] for x in t['color']['themes']]
retired = {x['id']: x.get('retired', []) for x in t['color']['themes']}
def val(v, th):
    if isinstance(v, str): return v if th == themes[0] else None
    return v.get(th)
def conv(v):
    if v.startswith('{') and v.endswith('}'): return f'var(--{v[1:-1]})'
    return v
out = []
for i, th in enumerate(themes):
    sel = ', '.join(([':root'] if i == 0 else []) + [f'[data-theme="{n}"]' for n in [th] + retired[th]])
    lines = []
    for fam in ('color', 'shadow'):
        for tok in t[fam]['tokens']:
            v = val(tok['value'], th)
            if v is None and i > 0: continue
            lines.append(f'  --{tok["name"]}: {conv(v)};')
    out.append(sel + ' {\n' + '\n'.join(lines) + '\n}')
root = []
for fam, body in t.items():
    if fam in ('color', 'shadow', 'type', 'name', 'version'): continue
    for tok in body['tokens']: root.append(f'  --{tok["name"]}: {tok["value"]};')
for k, v in t['type']['families'].items(): root.append(f'  --font-{k}: {v};')
out.append(':root {\n' + '\n'.join(root) + '\n}')
# Sizes that step up under a coarse pointer (#245); density pins or forces them, except the hit-area minimum.
stepped = [tok for fam, body in t.items() if fam not in ('color', 'shadow', 'type', 'name', 'version') for tok in body['tokens'] if 'coarse' in tok]
if stepped:
    out.append('@media (pointer: coarse) {\n  :root {\n' + '\n'.join(f'    --{x["name"]}: {x["coarse"]};' for x in stepped) + '\n  }\n}')
    out.append('[data-density="comfortable"] {\n' + '\n'.join(f'  --{x["name"]}: {x["coarse"]};' for x in stepped) + '\n}')
    out.append('[data-density="compact"] {\n' + '\n'.join(f'  --{x["name"]}: {x["value"]};' for x in stepped if x.get('density', True)) + '\n}')
open(sys.argv[2], 'w').write('\n'.join(out) + '\n')
