import sys
from PIL import Image
names=sys.argv[2].split(','); themes=sys.argv[3].split(',') if len(sys.argv)>3 else ['daylight','nightfall']
rows=[[Image.open(f'shot-{n}-{t}.png') for t in themes] for n in names]
W=sum(im.width for im in rows[0]); H=sum(max(im.height for im in r) for r in rows)
out=Image.new('RGB',(W,H),'white'); y=0
for r in rows:
  x=0
  for im in r: out.paste(im,(x,y)); x+=im.width
  y+=max(im.height for im in r)
out.save(sys.argv[1]); print(out.size)
