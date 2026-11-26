#!/usr/bin/env python3
"""Build lip-sync fighter SVG variants (mouth closed/half/open) with mic aimed at mouth.
Usage: make_mouth_variants.py  -> writes public/assets/{trump,obama}-m{0,1,2}.svg
"""
import re
from pathlib import Path
A = Path(__file__).resolve().parent.parent / "public/assets"
base = (A / "trump.svg").read_text()

# strip existing mouth + mic (everything from mouth comment to </svg>)
body = base.split("<!-- Characteristic Expressive Mouth -->")[0]

def mic(skin, ring, sleeve):
    # mic head just below-left of mouth (300,422), aimed at it (45deg)
    return f'''
  <!-- Arm + hand gripping mic (aimed at mouth) -->
  <path d="M40 760l70-150q22-30 56-26l44 40-52 136z" fill="{sleeve}" stroke="#06080E" stroke-width="10" stroke-linejoin="round"/>
  <g transform="translate(236 480) rotate(45)">
    <rect x="-15" y="26" width="30" height="150" rx="14" fill="#475569" stroke="#06080E" stroke-width="8"/>
    <rect x="-17" y="30" width="34" height="14" rx="5" fill="{ring}" stroke="#06080E" stroke-width="5"/>
    <ellipse cx="0" cy="0" rx="31" ry="38" fill="#1E293B" stroke="{ring}" stroke-width="8"/>
    <path d="M-20 -14h40M-24 0h48M-20 14h40M-8 -30v58M8 -30v58" stroke="#94A3B8" stroke-width="4" stroke-linecap="round"/>
    <rect x="-27" y="78" width="54" height="56" rx="22" fill="{skin}" stroke="#06080E" stroke-width="8"/>
    <path d="M-27 92h54M-27 108h54M-27 122h50" stroke="#06080E" stroke-width="4" opacity="0.55"/>
  </g>
'''

def mouths(cx, cy, lip, inner, teeth=True):
    return {
     0: f'<g id="mouth"><path d="M{cx-38} {cy-4}q38-14 76 0-38 22-76 0z" fill="{lip}" stroke="#2A0606" stroke-width="8" stroke-linejoin="round"/></g>',
     1: f'<g id="mouth"><ellipse cx="{cx}" cy="{cy+2}" rx="32" ry="14" fill="{inner}" stroke="{lip}" stroke-width="8"/>' + (f'<path d="M{cx-20} {cy-9}h40v6h-40z" fill="#FFFFFF"/>' if teeth else '') + '</g>',
     2: f'<g id="mouth"><ellipse cx="{cx}" cy="{cy+4}" rx="34" ry="26" fill="{inner}" stroke="{lip}" stroke-width="9"/>' + (f'<path d="M{cx-24} {cy-14}h48v10h-48z" fill="#FFFFFF"/>' if teeth else '') + f'<path d="M{cx-20} {cy+16}q20-12 40 0-20 16-40 0z" fill="#F87171"/></g>',
    }

def write(name, svgbody, skin, ring, sleeve, lip, inner):
    for k, m in mouths(300, 420, lip, inner).items():
        (A / f"{name}-m{k}.svg").write_text(svgbody + "\n  " + m + "\n" + mic(skin, ring, sleeve) + "</svg>\n")


def cut(svg, start_comment):
    return re.sub(r"  <!-- " + re.escape(start_comment) + r" -->.*?(?=  <!-- )", "", svg, flags=re.S)

def reskin(prefix, colors, hair, extra_outfit="", strip=(), eyebrows=None, title=""):
    s = body.replace("trump-", prefix + "-")
    s = re.sub(r"<title>.*?</title>", "<title>" + title + "</title>", s)
    for c in strip: s = cut(s, c)
    for a, b in colors.items(): s = s.replace(a, b)
    s = re.sub(r"  <!-- Iconic Golden Swept Combover Hair -->.*?(?=  <!-- Pale Eye Rings)", hair, s, flags=re.S)
    if eyebrows: s = s.replace('<path d="M198 282l88 12M404 282l-88 12" stroke="#EAB308"', eyebrows)
    s = s.replace("  <!-- Ears -->", extra_outfit + "\n  <!-- Ears -->")
    return s


TEE = ("Crisp White Dress Shirt V-Neck", "White Shirt Collar Wings", "Signature Long Red Power Tie", "Suit Lapels & Flag Lapel Pin", "Gold & Flag Lapel Pin", "Chin Cleft / Double Chin Curve")

conf_g = {
 '"#1E1304"':'"#1A0507"','"#2D1B06"':'"#4A0D14"','"#0C0702"':'"#080203"',
 '"#1E3A8A"/>\n      <stop offset="55%" stop-color="#0F172A"':'"#E23744"/>\n      <stop offset="55%" stop-color="#9B1C28"',
 '"#FFB878"':'"#E8B48C"','"#E08B4B"':'"#C98F66"',
 'stroke="#F59E0B" stroke-opacity':'stroke="#E23744" stroke-opacity',
 'stroke="#F59E0B" stroke-width="4" stroke-opacity':'stroke="#E23744" stroke-width="4" stroke-opacity',
 '#B45309':'#9A5B3A','#FFDAB3':'#F0C9A6','fill="#1E3A8A"/>':'fill="#B91C2C"/>',
}
goyal = reskin("goyal", conf_g,
 hair='''  <!-- Bald head with short stubble -->
  <path d="M180 236c-6-80 40-120 120-120s126 40 120 120c-14-30-50-48-120-48s-106 18-120 48z" fill="#3B2A22" stroke="#06080E" stroke-width="10" stroke-linejoin="round" opacity="0.55"/>
  <path d="M236 470q64 40 128 0" fill="none" stroke="#3B2A22" stroke-width="10" stroke-linecap="round" opacity="0.6"/>

''',
 extra_outfit='''  <!-- Red Zomato tee -->
  <path d="M232 442q68 56 136 0l18 26q-86 66-172 0z" fill="#E23744" stroke="#06080E" stroke-width="8"/>
  <text x="300" y="650" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="56" fill="#FFFFFF" stroke="#06080E" stroke-width="3">zomato</text>
''',
 strip=TEE,
 eyebrows='<path d="M204 288q40-14 82-2M396 288q-40-14-82-2" stroke="#2A1A12"',
 title="Stylized Deepinder Goyal in red Zomato tee with microphone")
write("goyal", goyal, "#E8B48C", "#E23744", "#B91C2C", "#9A4A4A", "#3A1010")
conf_a = dict(conf_g)
conf_a.update({'"#1A0507"':'"#04140A"','"#4A0D14"':'"#0B3B1C"','"#080203"':'"#020A05"',
 '"#E23744"/>\n      <stop offset="55%" stop-color="#9B1C28"':'"#1F2937"/>\n      <stop offset="55%" stop-color="#0B1220"'})
conf_a = {k:v for k,v in conf_a.items()}
conf_a['stroke="#E23744" stroke-opacity']='stroke="#22C55E" stroke-opacity'
conf_a['stroke="#E23744" stroke-width="4" stroke-opacity']='stroke="#22C55E" stroke-width="4" stroke-opacity'
conf_a['"#E8B48C"']='"#D9A073"'; conf_a['"#C98F66"']='"#B87F55"'; conf_a['fill="#B91C2C"/>']='fill="#111827"/>'
conf_a['"#1A0507"']='"#04140A"'
# build from the original palette instead (base keys), not chained
base_keys = {
 '"#1E1304"':'"#04140A"','"#2D1B06"':'"#0B3B1C"','"#0C0702"':'"#020A05"',
 '"#1E3A8A"/>\n      <stop offset="55%" stop-color="#0F172A"':'"#1F2937"/>\n      <stop offset="55%" stop-color="#0B1220"',
 '"#FFB878"':'"#D9A073"','"#E08B4B"':'"#B87F55"',
 'stroke="#F59E0B" stroke-opacity':'stroke="#22C55E" stroke-opacity',
 'stroke="#F59E0B" stroke-width="4" stroke-opacity':'stroke="#22C55E" stroke-width="4" stroke-opacity',
 '#B45309':'#8A5A3A','#FFDAB3':'#E6B88F','fill="#1E3A8A"/>':'fill="#111827"/>',
}
grover = reskin("grover", base_keys,
 hair='''  <!-- Slicked-back black hair -->
  <path d="M164 250c-12-112 50-176 140-176 92 0 150 60 134 176-16-50-50-86-96-96-50 10-122 24-178 96z" fill="#0B0B0F" stroke="#06080E" stroke-width="10" stroke-linejoin="round"/>
  <path d="M206 150c40-34 96-46 156-28M222 184c44-24 104-28 164-4" fill="none" stroke="#3F3F46" stroke-width="9" stroke-linecap="round"/>

''',
 extra_outfit='''  <!-- Black blazer over green shirt -->
  <path d="M232 442q68 56 136 0l18 26q-86 66-172 0z" fill="#16A34A" stroke="#06080E" stroke-width="8"/>
  <path d="M168 470l70-30 24 70-60 40zM432 470l-70-30-24 70 60 40z" fill="#111827" stroke="#06080E" stroke-width="8"/>
  <text x="300" y="650" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="46" fill="#22C55E" stroke="#06080E" stroke-width="3">DOGLAPAN</text>
''',
 strip=TEE,
 eyebrows='<path d="M196 276l90 18M404 276l-90 18" stroke="#0B0B0F"',
 title="Stylized Ashneer Grover in black blazer, slicked-back hair and microphone")
write("grover", grover, "#D9A073", "#22C55E", "#111827", "#8B3A3A", "#3A0D0D")
A=A
(A/"goyal-emblem.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#4A0D14" stroke="#E23744" stroke-width="7"/><path d="M50 22c-6 10-18 16-18 30a18 18 0 0 0 36 0c0-14-12-20-18-30z" fill="#FFFFFF" stroke="#06080E" stroke-width="4"/><path d="M38 56h24" stroke="#E23744" stroke-width="6" stroke-linecap="round"/></svg>')
(A/"grover-emblem.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#0B3B1C" stroke="#22C55E" stroke-width="7"/><path d="M18 58c14-30 40-34 64-14-12-2-18 2-22 8l14 18-22-8-12 12-2-16z" fill="#E5E7EB" stroke="#06080E" stroke-width="4" stroke-linejoin="round"/><circle cx="68" cy="46" r="3" fill="#06080E"/></svg>')
print("fighters ok")
