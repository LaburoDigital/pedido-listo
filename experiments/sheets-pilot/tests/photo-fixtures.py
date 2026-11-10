"""Genera imágenes de prueba para tests/photo-browser.cjs. Requiere Pillow. Uso: python3 photo-fixtures.py <dir>"""
import os, sys
from PIL import Image, ImageDraw
d=sys.argv[1] if len(sys.argv)>1 else '.'; os.makedirs(d,exist_ok=True); P=lambda n: os.path.join(d,n)
noise=lambda w,h: Image.frombytes('RGB',(w,h),os.urandom(w*h*3))
noise(4032,3024).save(P('paisaje-grande.jpg'),quality=95)
im=Image.new('RGB',(4032,3024),(40,120,200)); ImageDraw.Draw(im).rectangle([0,0,800,600],fill=(255,0,0))
ex=Image.Exif(); ex[0x0112]=6; im.save(P('vertical-exif6.jpg'),quality=90,exif=ex)
noise(2500,2500).save(P('png-grande.png'),compress_level=1)
noise(3100,3100).save(P('png-26mb.png'),compress_level=0)
open(P('foto.heic'),'wb').write(b'\x00\x00\x00\x18ftypheic\x00\x00\x00\x00mif1heic'+os.urandom(80000))
Image.new('RGB',(8000,8000),(200,200,200)).save(P('64mp.jpg'),quality=50)
t=Image.new('RGBA',(1000,800),(0,0,0,0)); ImageDraw.Draw(t).ellipse([100,100,900,700],fill=(0,150,0,255)); t.save(P('transparente.png'))
