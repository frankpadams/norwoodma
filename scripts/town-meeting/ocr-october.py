from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import binary_opening,binary_dilation
import subprocess,os,sys
root=Path(sys.argv[1]).resolve()/'october-2024'
for p in sorted(root.glob('raw-*.jpg')):
 n=int(p.stem.split('-')[-1]);im=Image.open(p).convert('L').rotate(270,expand=True)
 small=im.copy();small.thumbnail((1100,1100));scores=[]
 for a in np.arange(-1.6,1.61,.1):
  b=np.asarray(small.rotate(float(a),fillcolor=255))<150;scores.append((float(np.sum(b.sum(axis=1)**2)),float(a)))
 angle=max(scores)[1];im=im.rotate(angle,fillcolor=255);ink=np.asarray(im)<170
 horizontal=binary_opening(ink,structure=np.ones((1,110)));vertical=binary_opening(ink,structure=np.ones((100,1)))
 lines=binary_dilation(horizontal|vertical,structure=np.ones((3,3)));clean=ink&~lines
 out=root/('clean-'+str(n));Image.fromarray(np.where(clean,0,255).astype('uint8')).save(str(out)+'.png')
 subprocess.run(['tesseract',str(out)+'.png',str(out),'--psm','6','tsv','txt'],env={**os.environ,'OMP_THREAD_LIMIT':'1'},capture_output=True,check=True)
 print(n,'angle',round(angle,2),'text',len(out.with_suffix('.txt').read_text()),flush=True)
