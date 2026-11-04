#!/usr/bin/env python3
"""Verity Pixel Motion v1.4 — dependency-free 128px pixel sprite PNG generator."""
from pathlib import Path
import math, struct, zlib, sys

if len(sys.argv)!=2: raise SystemExit('Usage: python3 generate_verity_sprites.py /path/to/VerityMac')
ROOT=Path(sys.argv[1]); OUT=ROOT/'Sprites'; OUT.mkdir(parents=True,exist_ok=True)
N=128; CX=64; CY=63; R=52
PALETTE=['874009','a75a05','bd7006','d4860c','e99e0d','f5b419',
         'ffc72c','ffda37','ffe950','fff36b','fff88b','fffcb3']
DITHER=((0,8,2,10),(12,4,14,6),(3,11,1,9),(15,7,13,5))
BLACK='#23160a'

def rgba(c):
    if isinstance(c,tuple): return c
    h=c.lstrip('#');return tuple(bytes.fromhex(h))+((255,) if len(h)==6 else ())

def png(path,w,h,buf):
    def chunk(k,b):return struct.pack('>I',len(b))+k+b+struct.pack('>I',zlib.crc32(k+b)&0xffffffff)
    rows=b''.join(b'\x00'+buf[y*w*4:(y+1)*w*4] for y in range(h))
    out=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))
    out+=chunk(b'IDAT',zlib.compress(rows,9))+chunk(b'IEND',b'')
    path.write_bytes(out)

class Paint:
    def __init__(self,w=128,h=128):self.w=w;self.h=h;self.p=bytearray(w*h*4)
    def pixel(self,x,y,color):
        x,y=int(x),int(y)
        if 0<=x<self.w and 0<=y<self.h:
            self.p[(y*self.w+x)*4:(y*self.w+x+1)*4]=bytes(rgba(color))
    def rect(self,x0,y0,x1,y1,c):
        for y in range(int(y0),int(y1)+1):
            for x in range(int(x0),int(x1)+1):self.pixel(x,y,c)
    def disk(self,x0,y0,x1,y1,c):
        a=(x1-x0)/2;b=(y1-y0)/2
        if a<=0 or b<=0:return
        cx=(x0+x1)/2;cy=(y0+y1)/2
        for y in range(int(y0),int(y1)+1):
            for x in range(int(x0),int(x1)+1):
                if ((x-cx)/a)**2+((y-cy)/b)**2<=1:self.pixel(x,y,c)
    def line(self,points,c,width=1):
        for (x0,y0),(x1,y1) in zip(points,points[1:]):
            x0,y0,x1,y1=map(int,(x0,y0,x1,y1))
            n=max(abs(x1-x0),abs(y1-y0),1)
            for k in range(n+1):
                x=round(x0+(x1-x0)*k/n);y=round(y0+(y1-y0)*k/n)
                for xx in range(x-width//2,x+(width-1)//2+1):
                    for yy in range(y-width//2,y+(width-1)//2+1):self.pixel(xx,yy,c)
    def polygon(self,pts,c):
        for y in range(min(p[1] for p in pts),max(p[1] for p in pts)+1):
            crossing=[]
            for (x0,y0),(x1,y1) in zip(pts,pts[1:]+pts[:1]):
                if (y0<=y<y1) or (y1<=y<y0):crossing.append(x0+(y-y0)*(x1-x0)/(y1-y0))
            crossing.sort()
            for i in range(0,len(crossing)-1,2):
                self.rect(math.ceil(crossing[i]),y,math.floor(crossing[i+1]),y,c)

def draw(kind):
    p=Paint();colors=[rgba('#'+x) for x in PALETTE]
    for y in range(6,120):
        for x in range(6,121):
            dx=(x-CX)/R;dy=(y-CY)/R;d2=dx*dx+dy*dy
            if d2>1:continue
            z=math.sqrt(max(0,1-d2));v=6.05+3*(-.42*dx-.56*dy+.73*z)-.4*dx
            v+=1.3*math.exp(-(((x-43)/23)**2+((y-35)/19)**2))
            v-=.65*max(0,dy+.3);v-=1.3*max(0,(math.sqrt(d2)-.89)/.11)
            v=max(0,min(11,v));ci=int(v)
            ci=min(11,ci+int((v-ci)>(DITHER[y%4][x%4]+.5)/16))
            if math.sqrt(d2)>.966:ci=min(ci,5 if y<60 else 2 if x>82 else 3)
            p.pixel(x,y,colors[ci])
    for a,b in [((36,21,50,22),'#fffeba'),((31,23,43,25),'#fffca7'),
                ((29,27,39,28),'#fffb99'),((26,31,31,34),'#fff789'),
                ((52,18,58,18),'#fffca4'),((23,41,24,46),'#fff187')]:
        p.rect(*a,b)
    for ex in (48,81):
        if kind in ('blink','sleepy'):
            p.line([(ex-4,59),(ex-2,60),(ex+2,60),(ex+5,58)],BLACK,2)
        elif kind=='blink_half':
            p.disk(ex-4,55,ex+4,60,BLACK);p.rect(ex-3,53,ex+3,56,'#ffda37')
        elif kind in ('happy','grin_eyes'):
            p.line([(ex-5,60),(ex-3,57),(ex,54),(ex+3,56),(ex+5,59)],BLACK,2)
        elif kind=='wink' and ex>64:
            p.line([(ex-4,58),(ex+4,58)],BLACK,3)
        else:
            shift=2 if kind=='look_right' else -2 if kind=='look_left' else 0
            p.disk(ex-4+shift,49,ex+4+shift,63,BLACK)
            p.rect(ex-3+shift,51,ex-2+shift,53,'#75521b')
            if kind in ('listening','excited'):p.pixel(ex-2+shift,51,'#fff7cc')
    if kind=='thinking':
        p.line([(42,44),(52,41)],'#62360b',2)
        p.line([(44,84),(48,86),(54,87),(62,88),(72,86),(80,82)],BLACK,2)
    elif kind=='surprised':
        p.disk(58,77,71,92,BLACK);p.rect(62,88,67,90,'#d15b51')
        p.line([(42,43),(52,41)],'#73400c',2)
    elif kind in ('talk1','talk2','talk3','talk4','talk5','laugh'):
        mouths={'talk1':(54,78,75,87),'talk2':(50,77,79,94),'talk3':(55,77,73,97),
                'talk4':(50,81,79,90),'talk5':(48,76,81,101),'laugh':(45,74,85,100)}
        x0,y0,x1,y1=mouths[kind];p.disk(x0,y0,x1,y1,BLACK)
        if kind!='talk1':p.disk(x0+6,y1-9,x1-5,y1-3,'#bd5652')
        if kind in ('talk2','talk5','laugh'):p.rect(x0+6,y0+4,x1-6,y0+7,'#fff2b6')
    elif kind in ('grin','grin_eyes'):
        outer=[(27,75),(33,78),(44,86),(51,90),(64,93),(76,91),(86,86),(96,77),(102,74),
               (99,88),(92,94),(84,101),(74,104),(60,105),(48,102),(37,96),(30,88)]
        p.polygon(outer,BLACK)
        teeth=[(34,79),(41,83),(48,86),(56,88),(65,89),(74,88),(82,85),(92,80),
               (96,79),(94,85),(89,91),(81,95),(73,98),(63,99),(54,98),(45,94),(38,87)]
        p.polygon(teeth,'#fff9e5')
        for x,a,b in ((41,82,87),(49,86,95),(57,89,99),(65,89,100),
                      (73,88,99),(81,86,96),(89,82,90)):
            p.line([(x,a),(x+1,b)],'#69553b')
    else:
        if kind=='sleepy': pts=[(42,83),(51,86),(63,87),(75,85),(85,82)]
        elif kind=='smirk': pts=[(38,81),(44,87),(52,90),(64,91),(77,88),(86,83)]
        else:pts=[(x,77+round(16*(1-((x-65)/29)**2))) for x in range(36,95)]
        p.line(pts,BLACK,3)
        if kind not in ('sleepy','smirk'):
            p.line([(35,77),(39,82)],BLACK,3);p.line([(92,82),(96,76)],BLACK,3)
    if kind in ('excited','laugh','happy'):
        for xx in (30,92):
            for dy in range(3):
                for dx in range(6):
                    if (dx+dy)%3==0:p.pixel(xx+dx,72+dy,'#f9ad2b')
    return p

names=['idle','blink','blink_half','look_left','look_right','thinking','listening',
       'happy','excited','surprised','sleepy','smirk','wink','laugh','grin','grin_eyes',
       'talk1','talk2','talk3','talk4','talk5']
for name in names:
    face=draw(name);png(OUT/(name+'.png'),128,128,face.p)

icon=Paint(1024,1024);face=draw('idle').p
for y in range(128):
    for x in range(128):
        c=tuple(face[(y*128+x)*4:(y*128+x+1)*4])
        if c[3]==0:continue
        for yy in range(8):
            start=((y*8+yy)*1024+x*8)*4
            icon.p[start:start+32]=bytes(c)*8
(ROOT/'Artwork').mkdir(parents=True,exist_ok=True)
png(ROOT/'Artwork'/'AppIcon.png',1024,1024,icon.p)
print(f'[Verity Mascot] Generated {len(names)} original 128px pixel sprite frames and app icon.')
