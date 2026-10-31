"""Pairwise distances between captured screens, after Design Theater (arXiv 2607.22928), and creative range after
Design Creativity Bench (arXiv 2610.11539).

  visual  1 - cosine similarity of UIClip embeddings (Wu et al. 2024)
  tiles   the same on a 3 x 3 grid of 400px tiles, each tile matched to its nearest counterpart (Hungarian), mean
          of the matched distances: detail at close to UIClip's training scale, wherever on the screen it sits
  colour  Earth Mover's Distance between CIELCh histograms, ground distance in CIELAB (delta E 1976)
  layout  Zhang-Shasha tree edit distance between DOM layout trees (repeated siblings folded), divided by the larger tree's size

Across systems: each measure for builds of the same brief. Within a system: creative range (one task, two domains),
task range (different tasks, -a briefs with -a, -b with -b) and the noise floor (repeat builds of one prompt).

Usage: python measure.py <captures dir> <results.json>   (setup: see README.md)
"""
import json, sys, itertools
from pathlib import Path
import numpy as np
from PIL import Image

UICLIP = 'biglab/uiclip_jitteredwebsites-2-224-paraphrased_webpairs_humanpairs'
PROCESSOR = 'openai/clip-vit-base-patch32'
REFERENCE = ('claude-altitude', 'altitude-preview')  # systems built with Altitude; every other system is a baseline

GRID = 3

def embed(images):
    import torch
    from transformers import CLIPModel, CLIPProcessor
    model, processor = CLIPModel.from_pretrained(UICLIP).eval(), CLIPProcessor.from_pretrained(PROCESSOR)
    out = []
    with torch.no_grad():
        for i in range(0, len(images), 32):
            inputs = processor(images=images[i:i + 32], return_tensors='pt', do_resize=False, do_center_crop=False)
            features = model.get_image_features(**inputs)
            out.append(getattr(features, 'pooler_output', features))
    features = torch.cat(out)
    return (features / features.norm(dim=-1, keepdim=True)).numpy()

def views(path):
    """The whole screen resized to 224 (not centre-cropped, so nothing at the edges is lost), then its tiles."""
    image = Image.open(path).convert('RGB')
    w, h = image.size
    tiles = [image.crop((x * w // GRID, y * h // GRID, (x + 1) * w // GRID, (y + 1) * h // GRID)) for y in range(GRID) for x in range(GRID)]
    return [im.resize((224, 224), Image.BICUBIC) for im in [image, *tiles]]

def tile_distance(a, b):
    from scipy.optimize import linear_sum_assignment
    cost = 1 - a @ b.T
    rows, cols = linear_sum_assignment(cost)
    return float(cost[rows, cols].mean())

def lab(path):
    rgb = np.asarray(Image.open(path).convert('RGB').resize((200, 200), Image.BOX), dtype=np.float64) / 255
    linear = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    xyz = linear.reshape(-1, 3) @ np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]).T
    xyz /= np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[:, 1] - 16, 500 * (f[:, 0] - f[:, 1]), 200 * (f[:, 1] - f[:, 2])], axis=1)

# Histogram bins in LCh: lightness in tens, chroma in widening steps, hue in 30 degree sectors.
# Near-neutral pixels (chroma under 5) share one hue bin, since their hue is noise.
L_EDGES, C_EDGES, HUE_BINS = np.arange(0, 101, 10), np.array([0, 5, 15, 30, 50, 80, 200]), 12

def histogram(points):
    L, a, b = points.T
    C, h = np.hypot(a, b), np.degrees(np.arctan2(b, a)) % 360
    li = np.clip(np.digitize(L, L_EDGES) - 1, 0, len(L_EDGES) - 2)
    ci = np.clip(np.digitize(C, C_EDGES) - 1, 0, len(C_EDGES) - 2)
    hi = np.where(ci == 0, 0, (h // (360 / HUE_BINS)).astype(int))
    keys, counts = np.unique(np.stack([li, ci, hi], axis=1), axis=0, return_counts=True)
    return {tuple(k): c / counts.sum() for k, c in zip(keys, counts)}

def centre(key):
    li, ci, hi = key
    L = (L_EDGES[li] + L_EDGES[li + 1]) / 2
    C = 0 if ci == 0 else (C_EDGES[ci] + C_EDGES[ci + 1]) / 2
    h = np.radians((hi + 0.5) * 360 / HUE_BINS)
    return np.array([L, C * np.cos(h), C * np.sin(h)])

def emd(p, q):
    import ot
    keys = sorted(set(p) | set(q))
    centres = np.array([centre(k) for k in keys])
    ground = np.linalg.norm(centres[:, None] - centres[None], axis=2)
    return float(ot.emd2(np.array([p.get(k, 0.0) for k in keys]), np.array([q.get(k, 0.0) for k in keys]), ground))

def shape(node):
    return node['type'] + '(' + ','.join(shape(c) for c in node['children']) + ')'

def fold(node):
    """Repeated siblings of one shape (table rows, list items, tiles) count once: layout, not how much content there is."""
    children, last = [], None
    for child in (fold(c) for c in node['children']):
        if shape(child) != last:
            children.append(child)
        last = shape(child)
    return {'type': node['type'], 'children': children}

def tree(node):
    from zss import Node
    out = Node(node['type'])
    for child in node['children']:
        out.addkid(tree(child))
    return out

def size(node):
    return 1 + sum(size(c) for c in node['children'])

def layout_distance(a, b):
    from zss import simple_distance
    return simple_distance(tree(a), tree(b)) / max(size(a), size(b))

def comparable(a, b):
    """Two builds of the same brief, or a domain-free preview and a build of its task. Only first samples are compared across systems."""
    if a['system'] == b['system'] or a['sample'] > 1 or b['sample'] > 1:
        return False
    if a['brief'] and b['brief']:
        return a['brief'] == b['brief']
    return a['task'] == b['task']

def mean(values):
    values = [v for v in values if v is not None]
    return round(float(np.mean(values)), 4) if values else None

def main(captures, results):
    captures = Path(captures)
    screens = json.loads((captures / 'index.json').read_text())['screens']
    for s in screens:
        s.setdefault('sample', 1)
        s['png'], s['layout'] = captures / f"{s['id']}.png", fold(json.loads((captures / f"{s['id']}.layout.json").read_text()))
    n = 1 + GRID * GRID
    features = embed([view for s in screens for view in views(s['png'])])
    vectors = {s['id']: features[i * n] for i, s in enumerate(screens)}
    tiles = {s['id']: features[i * n + 1:(i + 1) * n] for i, s in enumerate(screens)}
    hist = {s['id']: histogram(lab(s['png'])) for s in screens}
    def distance(a, b):
        return {'visual': round(float(1 - vectors[a['id']] @ vectors[b['id']]), 4),
                'tiles': round(tile_distance(tiles[a['id']], tiles[b['id']]), 4),
                'colour': round(emd(hist[a['id']], hist[b['id']]), 2),
                'layout': round(layout_distance(a['layout'], b['layout']), 4)}
    pairs = []
    for a, b in itertools.combinations(screens, 2):
        if comparable(a, b):
            pairs.append({'a': a['id'], 'b': b['id'], 'systems': sorted([a['system'], b['system']]), **distance(a, b)})
    # Noise floor: one system's repeat builds of the same prompt. A gap between systems smaller than this says nothing.
    noise_pairs = [{'system': a['system'], 'brief': a['brief'], 'a': a['id'], 'b': b['id'], **distance(a, b)}
                   for a, b in itertools.combinations(screens, 2) if a['brief'] and a['system'] == b['system'] and a['brief'] == b['brief']]
    systems = sorted({s['system'] for s in screens})
    measures = ('visual', 'tiles', 'colour', 'layout')
    matrix = {m: {x: {y: mean([p[m] for p in pairs if sorted([x, y]) == p['systems']]) for y in systems if y != x} for x in systems} for m in measures}
    baselines = [s for s in systems if s not in REFERENCE]
    # Distance from the centre: a system's mean distance to the baselines' builds of the same briefs.
    centre_distance = {m: {x: mean([p[m] for p in pairs if x in p['systems'] and (set(p['systems']) - {x}) <= set(baselines)]) for x in systems} for m in measures}
    # Creative range: how far one system's two domain builds of a task sit apart.
    by_system_task = {}
    for s in screens:
        if s['brief'] and s['sample'] == 1:
            by_system_task.setdefault((s['system'], s['task']), []).append(s)
    range_pairs = [{'system': system, 'task': task, 'a': a['id'], 'b': b['id'], **distance(a, b)}
                   for (system, task), group in by_system_task.items() if len(group) == 2 for a, b in [group]]
    creative_range = {m: {x: mean([p[m] for p in range_pairs if p['system'] == x]) for x in systems} for m in measures}
    # Task range: how far one system's builds of different tasks sit apart. A system that puts every screen in the
    # same frame (tell LA5) scores low on layout here, whatever its creative range.
    task_pairs = [{'system': a['system'], 'a': a['id'], 'b': b['id'], **distance(a, b)}
                  for a, b in itertools.combinations([s for s in screens if s['sample'] == 1], 2)
                  if a['system'] == b['system'] and a['task'] != b['task'] and (not a['brief'] or a['brief'][-1] == b['brief'][-1])]
    task_range = {m: {x: mean([p[m] for p in task_pairs if p['system'] == x]) for x in systems} for m in measures}
    noise = {m: {x: mean([p[m] for p in noise_pairs if p['system'] == x]) for x in systems} for m in measures}
    Path(results).write_text(json.dumps({
        'method': {'uiclip': UICLIP, 'processor': PROCESSOR, 'viewport': '1200x1200', 'tiles': f'{GRID}x{GRID}, Hungarian-matched', 'colourBins': {'L': L_EDGES.tolist(), 'C': C_EDGES.tolist(), 'hue': HUE_BINS},
                   'layout': 'DOM layout tree (capture.mjs), repeated siblings folded, Zhang-Shasha with unit costs, divided by the larger tree', 'reference': list(REFERENCE)},
        'screens': [{k: s[k] for k in ('id', 'system', 'brief', 'task', 'domain', 'sample')} | {'nodes': size(s['layout'])} for s in screens],
        'pairs': pairs, 'matrix': matrix, 'baselines': baselines, 'distanceFromCentre': centre_distance,
        'creativeRangePairs': range_pairs, 'creativeRange': creative_range, 'taskRangePairs': task_pairs, 'taskRange': task_range, 'noisePairs': noise_pairs, 'noiseFloor': noise}, indent=1) + '\n')

if __name__ == '__main__':
    main(*sys.argv[1:3])
