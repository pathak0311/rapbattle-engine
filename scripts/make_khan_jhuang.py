#!/usr/bin/env python3
"""Stylized busts (transparent bg, 600x760, 3 mouth states + mic) for Genghis Khan and Jensen Huang, plus emblems."""
import math
from pathlib import Path
A = Path(__file__).resolve().parent.parent / "public/assets"
INK = "#0B0E14"

def mouth(state, inner, smile=False):
    cx, cy = 300, 432
    if state == 0:
        d = f"M{cx-38} {cy-6}q38 {26 if smile else 14} 76 -2"
        return f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>'
    if state == 1:
        return (f'<ellipse cx="{cx}" cy="{cy+4}" rx="30" ry="13" fill="{inner}" stroke="{INK}" stroke-width="8"/>'
                f'<path d="M{cx-20} {cy-4}h40v7h-40z" fill="#fff"/>')
    return (f'<ellipse cx="{cx}" cy="{cy+8}" rx="34" ry="27" fill="{inner}" stroke="{INK}" stroke-width="9"/>'
            f'<path d="M{cx-25} {cy-10}h50v11h-50z" fill="#fff"/>'
            f'<path d="M{cx-20} {cy+18}q20 -14 40 0 -20 14 -40 0z" fill="#F4727F"/>')

def mic(skin, ring, sleeve):
    return f'''
  <path d="M30 760l60-150q22-34 62-28l46 40-54 138z" fill="{sleeve}" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>
  <g transform="translate(232 490) rotate(45)">
    <rect x="-14" y="26" width="28" height="140" rx="13" fill="#475569" stroke="{INK}" stroke-width="7"/>
    <rect x="-16" y="30" width="32" height="13" rx="5" fill="{ring}" stroke="{INK}" stroke-width="5"/>
    <ellipse cx="0" cy="0" rx="30" ry="37" fill="#1E293B" stroke="{ring}" stroke-width="8"/>
    <path d="M-19 -13h38M-23 0h46M-19 13h38M-8 -29v56M8 -29v56" stroke="#94A3B8" stroke-width="4" stroke-linecap="round"/>
    <rect x="-26" y="76" width="52" height="54" rx="21" fill="{skin}" stroke="{INK}" stroke-width="7"/>
    <path d="M-26 90h52M-26 105h52M-26 119h48" stroke="{INK}" stroke-width="4" opacity=".5"/>
  </g>'''

def face(skin, shade, brow, eye_ry, brows_path, nose_op=.7):
    return f'''
  <rect x="258" y="440" width="84" height="130" fill="{shade}"/>
  <ellipse cx="164" cy="344" rx="22" ry="34" fill="{skin}" stroke="{INK}" stroke-width="8"/>
  <ellipse cx="436" cy="344" rx="22" ry="34" fill="{skin}" stroke="{INK}" stroke-width="8"/>
  <path d="M162 300 Q158 470 300 508 Q442 470 438 300 Q438 150 300 150 Q162 150 162 300Z" fill="{skin}" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M162 380 Q176 470 300 508 Q424 470 438 380 Q420 452 300 464 Q180 452 162 380Z" fill="{shade}" opacity=".55"/>
  <ellipse cx="240" cy="304" rx="27" ry="{eye_ry}" fill="#fff" stroke="{INK}" stroke-width="6"/>
  <ellipse cx="360" cy="304" rx="27" ry="{eye_ry}" fill="#fff" stroke="{INK}" stroke-width="6"/>
  <circle cx="246" cy="305" r="{min(11, eye_ry-3)}" fill="#24150d"/><circle cx="366" cy="305" r="{min(11, eye_ry-3)}" fill="#24150d"/>
  <circle cx="250" cy="301" r="3.5" fill="#fff"/><circle cx="370" cy="301" r="3.5" fill="#fff"/>
  {brows_path.format(c=brow)}
  <path d="M296 320 q-18 44 6 52 q16 -2 14 -10" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round" opacity="{nose_op}"/>'''

def khan(state):
    skin, shade = "#D9A06B", "#B97F4F"
    body = f'''
  <path d="M30 760 Q30 590 180 548 L420 548 Q570 590 570 760Z" fill="#9E2A2B" stroke="{INK}" stroke-width="9"/>
  <path d="M190 548 L300 700 L410 548 L440 556 L300 760 L160 556Z" fill="#E0A526" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M96 600 q50 -60 130 -52 l-10 48 q-60 -6 -120 22z M504 600 q-50 -60 -130 -52 l10 48 q60 -6 120 22z" fill="#2B1B12" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>'''
    brows = '<path d="M204 272 Q236 258 278 282" fill="none" stroke="{c}" stroke-width="14" stroke-linecap="round"/><path d="M322 282 Q364 258 396 272" fill="none" stroke="{c}" stroke-width="14" stroke-linecap="round"/>'
    hat = f'''
  <path d="M170 252 Q168 112 300 98 Q432 112 430 252Z" fill="#8F1D1D" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M220 130 Q300 108 380 130" fill="none" stroke="#E0A526" stroke-width="8" stroke-linecap="round"/>
  <circle cx="300" cy="92" r="15" fill="#E0A526" stroke="{INK}" stroke-width="6"/>
  <ellipse cx="300" cy="248" rx="150" ry="34" fill="#2B1B12" stroke="{INK}" stroke-width="9"/>
  {"".join(f'<circle cx="{x}" cy="{264 + (6 if i % 2 else 0)}" r="17" fill="#3a251a" stroke="{INK}" stroke-width="5"/>' for i, x in enumerate(range(168, 440, 32)))}'''
    braids = "".join(f'<g><path d="M{x} 380 q{d} 80 {d//2} 190" fill="none" stroke="#1b1210" stroke-width="24" stroke-linecap="round"/>'
                     f'<path d="M{x} 380 q{d} 80 {d//2} 190" fill="none" stroke="{INK}" stroke-width="3" stroke-dasharray="3 14" stroke-linecap="round"/></g>'
                     for x, d in ((150, -12), (450, 12)))
    must = f'<path d="M232 404 Q266 388 300 406 Q334 388 368 404 Q338 420 300 410 Q262 420 232 404Z" fill="#1b1210" stroke="{INK}" stroke-width="4"/><path d="M232 404 q-10 40 -4 70 M368 404 q10 40 4 70" fill="none" stroke="#1b1210" stroke-width="11" stroke-linecap="round"/>'
    goatee = '<path d="M272 468 Q300 540 328 468 Q300 490 272 468Z" fill="#1b1210"/>'
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 760" role="img"><title>Stylized Genghis Khan</title>'
            + body + face(skin, shade, "#1b1210", 15, brows) + hat + braids + mouth(state, "#4A0E14") + must + goatee
            + mic(skin, "#E0A526", "#9E2A2B") + '</svg>')

def jhuang(state):
    skin, shade = "#EBC8A4", "#CFA67E"
    body = f'''
  <path d="M30 760 Q30 590 180 548 L420 548 Q570 590 570 760Z" fill="#14161B" stroke="{INK}" stroke-width="9"/>
  <path d="M214 548 L300 560 L386 548 L300 700Z" fill="#F2F4F7" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M180 548 L270 560 L224 760 L120 760Z M420 548 L330 560 L376 760 L480 760Z" fill="#23262D" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M300 640 V760" stroke="#5a606b" stroke-width="6"/>
  <path d="M150 640 q40 -30 90 -20 M450 640 q-40 -30 -90 -20" stroke="#4b515c" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="396" cy="610" r="13" fill="#76B900" stroke="{INK}" stroke-width="5"/>'''
    brows = '<path d="M200 270 Q238 246 280 268" fill="none" stroke="{c}" stroke-width="17" stroke-linecap="round"/><path d="M320 268 Q362 246 400 270" fill="none" stroke="{c}" stroke-width="17" stroke-linecap="round"/>'
    hair = f'''
  <path d="M158 322 C140 190 214 120 312 124 C412 122 468 196 442 324 C440 252 410 214 340 206 C262 196 188 232 158 322Z" fill="#2C2E36" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M206 192 C262 138 366 134 420 196 C360 170 270 168 206 192Z" fill="#585C69"/>
  <path d="M170 300 C174 252 210 226 262 214" fill="none" stroke="#8A8F9C" stroke-width="6" stroke-linecap="round"/>'''
    cheeks = '<ellipse cx="214" cy="392" rx="26" ry="14" fill="#E39A8A" opacity=".35"/><ellipse cx="386" cy="392" rx="26" ry="14" fill="#E39A8A" opacity=".35"/>'
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 760" role="img"><title>Stylized Jensen Huang</title>'
            + body + face(skin, shade, "#16130f", 21, brows) + cheeks + hair + mouth(state, "#4A0E14", smile=True)
            + mic(skin, "#76B900", "#14161B") + '</svg>')

def emblem(color, kind):
    if kind == "khan":
        inner = ''.join(f'<path d="M{70+i*30} 150 L{100} 50" stroke="{color}" stroke-width="9" stroke-linecap="round"/>' for i in range(3))
        inner += f'<path d="M45 120 Q100 50 155 120" fill="none" stroke="{color}" stroke-width="10" stroke-linecap="round"/>'
    else:
        inner = (f'<rect x="58" y="58" width="84" height="84" rx="10" fill="none" stroke="{color}" stroke-width="10"/>'
                 f'<rect x="80" y="80" width="40" height="40" fill="{color}"/>' +
                 ''.join(f'<path d="M{x} 46 v12 M{x} 142 v12 M46 {x} h12 M142 {x} h12" stroke="{color}" stroke-width="7"/>' for x in (80, 100, 120)))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="#0B0E14" stroke="{color}" stroke-width="8"/>{inner}</svg>'

for name, fn in (("khan", khan), ("jhuang", jhuang)):
    for s in range(3):
        (A / f"{name}-m{s}.svg").write_text(fn(s))
(A / "khan-emblem.svg").write_text(emblem("#E0A526", "khan"))
(A / "jhuang-emblem.svg").write_text(emblem("#76B900", "jhuang"))
print("ok")
