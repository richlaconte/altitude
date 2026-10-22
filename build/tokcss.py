import json, sys
t = json.load(open(sys.argv[1]))
themes = [x['id'] for x in t['color']['themes']]
def val(v, th):
    if isinstance(v, str): return v if th == themes[0] else None
    return v.get(th)
def conv(v):
    if v.startswith('{') and v.endswith('}'): return f'var(--{v[1:-1]})'
    return v
out = []
for i, th in enumerate(themes):
    sel = f':root, [data-theme="{th}"]' if i == 0 else f'[data-theme="{th}"]'
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
open(sys.argv[2], 'w').write('\n'.join(out) + '\n')
