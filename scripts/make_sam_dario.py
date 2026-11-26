#!/usr/bin/env python3
"""Flat-vector stylized bust SVGs (transparent bg, 600x760) with 3 mouth states + mic, plus emblems.
Writes public/assets/{sam,dario}-m{0,1,2}.svg and {sam,dario}-emblem.svg"""
from pathlib import Path
A = Path(__file__).resolve().parent.parent / "public/assets"
INK = "#0B0E14"

def mouth(state, lip, inner):
    cx, cy = 300, 428
    if state == 0:
        return f'<path d="M{cx-34} {cy-2}q34 18 68 -4" fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>'
    if state == 1:
        return (f'<ellipse cx="{cx}" cy="{cy+4}" rx="30" ry="13" fill="{inner}" stroke="{INK}" stroke-width="8"/>'
                f'<path d="M{cx-20} {cy-4}h40v7h-40z" fill="#fff"/>')
    return (f'<ellipse cx="{cx}" cy="{cy+8}" rx="34" ry="27" fill="{inner}" stroke="{INK}" stroke-width="9"/>'
            f'<path d="M{cx-25} {cy-10}h50v11h-50z" fill="#fff"/>'
            f'<path d="M{cx-20} {cy+18}q20 -14 40 0 -20 14 -40 0z" fill="#F4727F"/>')

def mic(skin, ring, sleeve):
    return f'''
  <path d="M30 760l60-150q22-34 62-28l46 40-54 138z" fill="{sleeve}" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>
  <g transform="translate(232 486) rotate(45)">
    <rect x="-14" y="26" width="28" height="140" rx="13" fill="#475569" stroke="{INK}" stroke-width="7"/>
    <rect x="-16" y="30" width="32" height="13" rx="5" fill="{ring}" stroke="{INK}" stroke-width="5"/>
    <ellipse cx="0" cy="0" rx="30" ry="37" fill="#1E293B" stroke="{ring}" stroke-width="8"/>
    <path d="M-19 -13h38M-23 0h46M-19 13h38M-8 -29v56M8 -29v56" stroke="#94A3B8" stroke-width="4" stroke-linecap="round"/>
    <rect x="-26" y="76" width="52" height="54" rx="21" fill="{skin}" stroke="{INK}" stroke-width="7"/>
    <path d="M-26 90h52M-26 105h52M-26 119h48" stroke="{INK}" stroke-width="4" opacity=".5"/>
  </g>'''

def face(skin, shade, eye_extra="", brow="#3a2a20", nose_dx=0):
    return f'''
  <rect x="258" y="440" width="84" height="130" fill="{shade}"/>
  <ellipse cx="166" cy="340" rx="22" ry="34" fill="{skin}" stroke="{INK}" stroke-width="8"/>
  <ellipse cx="434" cy="340" rx="22" ry="34" fill="{skin}" stroke="{INK}" stroke-width="8"/>
  <path d="M164 300 Q160 470 300 506 Q440 470 436 300 Q436 150 300 150 Q164 150 164 300Z" fill="{skin}" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M164 380 Q176 470 300 506 Q424 470 436 380 Q420 450 300 462 Q180 450 164 380Z" fill="{shade}" opacity=".55"/>
  <ellipse cx="240" cy="304" rx="27" ry="21" fill="#fff" stroke="{INK}" stroke-width="6"/>
  <ellipse cx="360" cy="304" rx="27" ry="21" fill="#fff" stroke="{INK}" stroke-width="6"/>
  <circle cx="246" cy="306" r="11" fill="#2b1b12"/><circle cx="366" cy="306" r="11" fill="#2b1b12"/>
  <circle cx="250" cy="301" r="4" fill="#fff"/><circle cx="370" cy="301" r="4" fill="#fff"/>
  <path d="M204 266 Q240 246 276 266" fill="none" stroke="{brow}" stroke-width="12" stroke-linecap="round"/>
  <path d="M324 266 Q360 246 396 266" fill="none" stroke="{brow}" stroke-width="12" stroke-linecap="round"/>
  <path d="M{296+nose_dx} 318 q-18 44 6 52 q16 -2 14 -10" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round" opacity=".7"/>{eye_extra}'''

def sam(state):
    skin, shade = "#F2C7A5", "#D9A57F"
    hair = '''
  <path d="M158 318 C142 196 214 128 312 132 C410 130 466 200 444 320 C432 252 398 212 336 214 C268 206 196 232 158 318Z" fill="#6B4328" stroke="#0B0E14" stroke-width="9" stroke-linejoin="round"/>
  <path d="M214 196 C262 150 350 140 408 190 C352 176 280 180 214 196Z" fill="#8A5A38"/>'''
    body = f'''
  <path d="M40 760 Q40 590 190 552 L410 552 Q560 590 560 760Z" fill="#26323F" stroke="{INK}" stroke-width="9"/>
  <path d="M214 552 Q300 640 386 552 L360 548 Q300 600 240 548Z" fill="#10D9A0" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M120 640q60 40 120 20M480 640q-60 40 -120 20" stroke="#0f1722" stroke-width="6" fill="none" opacity=".6"/>'''
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 760" role="img"><title>Stylized Sam</title>'
            + body + face(skin, shade, brow="#4a2f1c") + hair + mouth(state, "#C0504D", "#4A0E14")
            + mic(skin, "#10D9A0", "#26323F") + '</svg>')

def dario(state):
    skin, shade = "#E6B590", "#C99370"
    back = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#2A1A12" stroke="{INK}" stroke-width="7"/>'
                   for x, y, r in [(170,270,40),(186,205,44),(238,166,46),(306,150,48),(372,160,46),(426,196,44),(444,262,40),(436,318,30),(164,326,30)])
    front = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#35211a" stroke="{INK}" stroke-width="6"/>'
                    for x, y, r in [(208,212,28),(262,194,32),(322,190,32),(378,204,30),(420,232,24),(184,246,22)])
    stubble = "".join(f'<circle cx="{200 + (i*37)%200}" cy="{420 + (i*53)%70}" r="3" fill="#3b2a21" opacity=".5"/>' for i in range(34))
    body = f'''
  <path d="M40 760 Q40 590 190 552 L410 552 Q560 590 560 760Z" fill="#1B2A4A" stroke="{INK}" stroke-width="9"/>
  <path d="M214 552 Q300 626 386 552 L420 560 Q300 690 180 560Z" fill="#FF7A45" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'''
    glasses = '''
  <circle cx="240" cy="304" r="38" fill="#ffffff" fill-opacity=".14" stroke="#FF7A45" stroke-width="8"/>
  <circle cx="360" cy="304" r="38" fill="#ffffff" fill-opacity=".14" stroke="#FF7A45" stroke-width="8"/>
  <path d="M278 300 Q300 288 322 300" fill="none" stroke="#FF7A45" stroke-width="8"/>
  <path d="M202 296 L168 286M398 296 L432 286" stroke="#FF7A45" stroke-width="8" stroke-linecap="round"/>'''
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 760" role="img"><title>Stylized Dario</title>'
            + body + back + face(skin, shade, brow="#2A1A12") + front + stubble + glasses
            + mouth(state, "#B84A3E", "#40100F") + mic(skin, "#FF7A45", "#1B2A4A") + '</svg>')

def emblem(color, kind):
    if kind == "sam":
        inner = f'<path d="M100 40 L150 70 L150 130 L100 160 L50 130 L50 70Z" fill="none" stroke="{color}" stroke-width="12" stroke-linejoin="round"/><path d="M108 70 L82 108 H104 L92 140 L122 98 H100Z" fill="{color}"/>'
    else:
        inner = "".join(f'<path d="M100 100 L{100+70*__import__("math").cos(a):.1f} {100+70*__import__("math").sin(a):.1f}" stroke="{color}" stroke-width="14" stroke-linecap="round"/>' for a in [i*3.14159/4 for i in range(8)])
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="#0B0E14" stroke="{color}" stroke-width="8"/>{inner}</svg>'

for name, fn in (("sam", sam), ("dario", dario)):
    for s in range(3):
        (A / f"{name}-m{s}.svg").write_text(fn(s))
(A / "sam-emblem.svg").write_text(emblem("#10D9A0", "sam"))
(A / "dario-emblem.svg").write_text(emblem("#FF7A45", "dario"))
print("ok")
