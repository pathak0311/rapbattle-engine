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

write("trump", body, "#E9A066", "#F59E0B", "#0F172A", "#991B1B", "#450A0A")

# ---- Obama: re-skin Trump template ----
ob = body.replace("trump-", "obama-")
ob = re.sub(r"<title>.*?</title>", "<title>Stylized Barack Obama in charcoal suit, blue tie, short greying hair and microphone</title>", ob)
rep = {
 '"#1E1304"': '"#04101F"', '"#2D1B06"': '"#0B2447"', '"#0C0702"': '"#020814"',
 '"#1E3A8A"/>\n      <stop offset="55%" stop-color="#0F172A"': '"#3F4A5C"/>\n      <stop offset="55%" stop-color="#1F2937"',
 '"#FFB878"': '"#B97A4A"', '"#E08B4B"': '"#8A5533"',
 '"#EF4444"/>\n      <stop offset="100%" stop-color="#B91C1C"': '"#3B82F6"/>\n      <stop offset="100%" stop-color="#1D4ED8"',
 'stroke="#F59E0B" stroke-opacity': 'stroke="#3B82F6" stroke-opacity',
 '#B45309': '#5C3519', '#EAB308': '#1C1917', '#FFDAB3': '#C98E5E', '"#172554"': '"#111827"',
 'fill="#1E3A8A"/>': 'fill="#3B2412"/>',
}
for a, b in rep.items(): ob = ob.replace(a, b)
ob = ob.replace('stroke="#F59E0B" stroke-width="4" stroke-opacity', 'stroke="#3B82F6" stroke-width="4" stroke-opacity')
# bigger ears
ob = ob.replace('cx="156" cy="318" rx="40" ry="58"', 'cx="160" cy="316" rx="46" ry="64"').replace('cx="444" cy="318" rx="40" ry="58"', 'cx="440" cy="316" rx="46" ry="64"')
# replace combover hair with short cropped greying hair
ob = re.sub(r"<!-- Iconic Golden Swept Combover Hair -->.*?(?=<!-- Pale Eye Rings)", '''<!-- Short Cropped Greying Hair -->
  <path d="M168 236c-10-96 46-152 132-152s142 56 132 152c-18-46-64-78-132-78s-114 32-132 78z" fill="#27272A" stroke="#06080E" stroke-width="10" stroke-linejoin="round"/>
  <path d="M196 170c30-40 72-58 104-58M310 112c40 2 80 22 104 58" fill="none" stroke="#71717A" stroke-width="8" stroke-linecap="round" opacity="0.8"/>
  <path d="M170 236q2-30 14-46M430 236q-2-30-14-46" fill="none" stroke="#A1A1AA" stroke-width="8" stroke-linecap="round"/>

  ''', ob, flags=re.S)
# friendlier eyebrows + smile lines, remove chin cleft
ob = ob.replace('<path d="M198 282l88 12M404 282l-88 12"', '<path d="M204 286q40-16 80-2M396 286q-40-16-80-2"')
ob = re.sub(r'<!-- Chin Cleft.*?\n.*?\n', '', ob)
write("obama", ob, "#A86B3E", "#3B82F6", "#1F2937", "#5B1A12", "#2A0A06")
# emblem: simple presidential star-in-circle
(A / "obama-emblem.svg").write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#0B2447" stroke="#3B82F6" stroke-width="7"/><path d="M50 18l9 20 22 2-17 14 5 22-19-12-19 12 5-22-17-14 22-2z" fill="#F8FAFC" stroke="#06080E" stroke-width="3"/><path d="M26 80h48" stroke="#EF4444" stroke-width="6"/></svg>''')
# keep legacy single-file assets consistent (closed = idle, open = talk)
for n in ("obama", "trump"):
    (A / f"{n}.svg").write_text((A / f"{n}-m0.svg").read_text()) if n == "obama" else None
    (A / f"{n}-talk.svg").write_text((A / f"{n}-m2.svg").read_text()) if n == "obama" else None
print("ok", sorted(p.name for p in A.glob("*-m?.svg")))



# ---------------- Generic re-skin helpers (Elon, Zuck) ----------------
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

# Elon: black tee + dark bomber, swept dark-brown hair, light skin, red arena
elon = reskin("elon", {
    '"#1E1304"': '"#1A0507"', '"#2D1B06"': '"#3B0A0F"', '"#0C0702"': '"#080203"',
    '"#1E3A8A"/>\n      <stop offset="55%" stop-color="#0F172A"': '"#27272A"/>\n      <stop offset="55%" stop-color="#18181B"',
    '"#FFB878"': '"#F6CBA8"', '"#E08B4B"': '"#D9A07A"',
    'stroke="#F59E0B" stroke-opacity': 'stroke="#EF4444" stroke-opacity',
    'stroke="#F59E0B" stroke-width="4" stroke-opacity': 'stroke="#EF4444" stroke-width="4" stroke-opacity',
    '#B45309': '#9A5B3A', '#FFDAB3': '#F3D2B8', 'fill="#1E3A8A"/>': 'fill="#4B5563"/>',
  },
  hair='''  <!-- Swept-back dark hair -->
  <path d="M160 250c-14-110 50-176 150-176 92 0 150 58 132 168-14-40-40-70-80-80-46 26-130 30-202 88z" fill="#3F2A1D" stroke="#06080E" stroke-width="10" stroke-linejoin="round"/>
  <path d="M206 150c40-36 100-48 160-30M220 182c46-26 110-30 170-6" fill="none" stroke="#6B4A33" stroke-width="9" stroke-linecap="round"/>

''',
  extra_outfit='''  <!-- Black tee crew neck + bomber collar -->
  <path d="M236 444q64 52 128 0l22 30q-86 70-172 0z" fill="#0A0A0A" stroke="#06080E" stroke-width="8"/>
  <path d="M168 470l70-30 24 70-60 40zM432 470l-70-30-24 70 60 40z" fill="#3F3F46" stroke="#06080E" stroke-width="8"/>
  <text x="300" y="640" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="64" fill="#EF4444" stroke="#06080E" stroke-width="3">X</text>
''',
  strip=TEE,
  eyebrows='<path d="M200 288q44-18 86 0M400 288q-44-18-86 0" stroke="#3F2A1D"',
  title="Stylized Elon Musk in black bomber, swept dark hair and microphone")
# black tee: make the suit torso black-ish already via gradient; slightly squarer jaw
write("elon2", elon, "#F2C6A2", "#EF4444", "#18181B", "#8B3A3A", "#3A0D0D")

# Zuck: grey tee, short curly cropped hair, pale skin, blue arena
zuck = reskin("zuck", {
    '"#1E1304"': '"#04112A"', '"#2D1B06"': '"#0A2A5E"', '"#0C0702"': '"#020617"',
    '"#1E3A8A"/>\n      <stop offset="55%" stop-color="#0F172A"': '"#9CA3AF"/>\n      <stop offset="55%" stop-color="#6B7280"',
    '"#FFB878"': '"#FAD9C1"', '"#E08B4B"': '"#E7B596"',
    'stroke="#F59E0B" stroke-opacity': 'stroke="#3B82F6" stroke-opacity',
    'stroke="#F59E0B" stroke-width="4" stroke-opacity': 'stroke="#3B82F6" stroke-width="4" stroke-opacity',
    '#B45309': '#B07A5A', '#FFDAB3': '#FBE3D2', 'fill="#1E3A8A"/>': 'fill="#1E3A5F"/>',
  },
  hair='''  <!-- Short curly cropped hair -->
  <path d="M166 232c-8-100 48-150 134-150s142 50 134 150c-10-30-30-56-58-66-30 8-118 8-152 0-28 10-48 36-58 66z" fill="#4A3426" stroke="#06080E" stroke-width="10" stroke-linejoin="round"/>
  ''' + "".join(f'<circle cx="{180+i*30}" cy="{150 - (abs(i-4.5)*-4) + (i%2)*10}" r="17" fill="#5C4233" stroke="#06080E" stroke-width="5"/>' for i in range(9)) + '''

''',
  extra_outfit='''  <!-- Grey crew-neck tee -->
  <path d="M232 442q68 56 136 0l18 26q-86 66-172 0z" fill="#4B5563" stroke="#06080E" stroke-width="8"/>
''',
  strip=TEE,
  eyebrows='<path d="M206 290q38-10 78-2M394 290q-38-10-78-2" stroke="#4A3426"',
  title="Stylized Mark Zuckerberg in grey tee, short curly hair and microphone")
write("zuck", zuck, "#F5D0B5", "#3B82F6", "#6B7280", "#9F4A4A", "#3A1010")
(A / "rocket-emblem.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#1A0507" stroke="#EF4444" stroke-width="7"/><path d="M50 16c14 12 18 30 14 48H36c-4-18 0-36 14-48z" fill="#F8FAFC" stroke="#06080E" stroke-width="4"/><circle cx="50" cy="40" r="7" fill="#3B82F6" stroke="#06080E" stroke-width="3"/><path d="M36 64l-10 12 14-2zM64 64l10 12-14-2z" fill="#EF4444" stroke="#06080E" stroke-width="3"/><path d="M42 66q8 20 16 0" fill="#F59E0B" stroke="#06080E" stroke-width="3"/></svg>')
(A / "meta-emblem.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#04112A" stroke="#3B82F6" stroke-width="7"/><path d="M22 62c0-26 14-36 22-20l12 22c8 14 22 12 22-6 0-20-14-26-24-6l-8 14c-10 16-24 14-24-4z" fill="none" stroke="#F8FAFC" stroke-width="8" stroke-linecap="round"/></svg>')
print("elon2/zuck ok")



# ---------------- Pizza & Burger Characters ----------------
def make_pizza_burger():
    # DON PIZZA: triangle pepperoni pizza slice head with dripping cheese, golden crust crown, sunglasses/eyes, gold chain, red track jacket, mic aimed at mouth (300, 420)
    pizza_base = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 760" role="img">
  <title>Don Pizza - Streetwear Pepperoni Pizza Slice Rapper with Mic</title>
  <defs>
    <linearGradient id="pizza-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#220507"/>
      <stop offset="50%" stop-color="#450A0A"/>
      <stop offset="100%" stop-color="#090203"/>
    </linearGradient>
    <linearGradient id="pizza-crust" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="50%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#92400E"/>
    </linearGradient>
    <linearGradient id="pizza-cheese" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="55%" stop-color="#FACC15"/>
      <stop offset="100%" stop-color="#EAB308"/>
    </linearGradient>
    <linearGradient id="pizza-jacket" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#DC2626"/>
      <stop offset="60%" stop-color="#991B1B"/>
      <stop offset="100%" stop-color="#450A0A"/>
    </linearGradient>
  </defs>
  <rect width="600" height="760" fill="url(#pizza-bg)"/>
  <g stroke="#EF4444" stroke-opacity="0.18" stroke-width="2">
    <line x1="0" y1="120" x2="600" y2="120"/><line x1="0" y1="240" x2="600" y2="240"/><line x1="0" y1="360" x2="600" y2="360"/><line x1="0" y1="480" x2="600" y2="480"/>
    <line x1="150" y1="0" x2="150" y2="760"/><line x1="300" y1="0" x2="300" y2="760"/><line x1="450" y1="0" x2="450" y2="760"/>
  </g>
  <circle cx="300" cy="300" r="245" fill="none" stroke="#EF4444" stroke-width="4" stroke-opacity="0.35"/>

  <!-- Red & Green Italian Streetwear Track Jacket Torso -->
  <path d="M58 760V646c0-130 88-206 214-218h56c126 12 214 88 214 218v114" fill="url(#pizza-jacket)" stroke="#06080E" stroke-width="12"/>
  <path d="M120 480l-30 280M480 480l30 280" stroke="#16A34A" stroke-width="18"/>
  <path d="M136 475l-30 285M464 475l30 285" stroke="#FFFFFF" stroke-width="8"/>
  <!-- Heavy Gold Chain -->
  <path d="M210 475q90 95 180 0" fill="none" stroke="#FACC15" stroke-width="22" stroke-linecap="round"/>
  <path d="M210 475q90 95 180 0" fill="none" stroke="#06080E" stroke-width="22" stroke-dasharray="12 16" stroke-linecap="round" opacity="0.35"/>

  <!-- Pizza Slice Triangular Head (Pointing down to chin at y=495) -->
  <!-- Golden Stuffed Crust Top Rim -->
  <path d="M105 140c65-55 325-55 390 0 24 20 8 68-25 62-110-28-230-28-340 0-33 6-49-42-25-62z" fill="url(#pizza-crust)" stroke="#06080E" stroke-width="11" stroke-linejoin="round"/>
  <!-- Marinara Sauce Trim under crust -->
  <path d="M128 184q172-36 344 0l-18 40q-154-26-308 0z" fill="#B91C1C" stroke="#06080E" stroke-width="8"/>
  <!-- Melted Cheese Slice Face -->
  <path d="M132 186q168-30 336 0L348 470c-18 36-78 36-96 0z" fill="url(#pizza-cheese)" stroke="#06080E" stroke-width="11" stroke-linejoin="round"/>
  <!-- Cheese Drips on sides -->
  <path d="M150 245q-18 35-8 55 12 18 22-12M450 255q18 40 6 60-12 18-22-14" fill="url(#pizza-cheese)" stroke="#06080E" stroke-width="8" stroke-linecap="round"/>

  <!-- Pepperoni Slices on Forehead & Cheeks -->
  <circle cx="220" cy="215" r="28" fill="#DC2626" stroke="#7F1D1D" stroke-width="7"/>
  <circle cx="212" cy="208" r="4" fill="#FCA5A5"/><circle cx="228" cy="222" r="3" fill="#FCA5A5"/>
  <circle cx="305" cy="200" r="26" fill="#DC2626" stroke="#7F1D1D" stroke-width="7"/>
  <circle cx="300" cy="194" r="4" fill="#FCA5A5"/><circle cx="314" cy="205" r="3" fill="#FCA5A5"/>
  <circle cx="385" cy="218" r="28" fill="#DC2626" stroke="#7F1D1D" stroke-width="7"/>
  <circle cx="378" cy="212" r="4" fill="#FCA5A5"/><circle cx="392" cy="224" r="3" fill="#FCA5A5"/>
  <circle cx="205" cy="355" r="22" fill="#DC2626" stroke="#7F1D1D" stroke-width="6"/>
  <circle cx="395" cy="355" r="22" fill="#DC2626" stroke="#7F1D1D" stroke-width="6"/>
  <!-- Basil Leaf Accent -->
  <path d="M255 225q18-18 36 0-18 18-36 0z" fill="#16A34A" stroke="#06080E" stroke-width="5"/>

  <!-- Fierce Rap Battle Eyes & Eyebrows -->
  <path d="M196 266l86 18M404 266l-86 18" stroke="#450A0A" stroke-width="14" stroke-linecap="round"/>
  <path d="M210 302q32-20 64 0-32 22-64 0zM326 302q32-20 64 0-32 22-64 0z" fill="#FFFFFF" stroke="#06080E" stroke-width="7"/>
  <circle cx="244" cy="302" r="10" fill="#111827"/>
  <circle cx="356" cy="302" r="10" fill="#111827"/>
  <circle cx="241" cy="299" r="3" fill="#FFFFFF"/>
  <circle cx="353" cy="299" r="3" fill="#FFFFFF"/>
'''

    # BOSS BURGER: double-stack smash burger head with sesame bun crown, lettuce, melted cheddar, double beef patties, bottom bun jaw, gold grillz vibe, yellow/brown bomber jacket
    burger_base = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 760" role="img">
  <title>Boss Burger - Double Smash Burger Titan Rapper with Mic</title>
  <defs>
    <linearGradient id="burger-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1E1304"/>
      <stop offset="50%" stop-color="#3B2306"/>
      <stop offset="100%" stop-color="#0C0702"/>
    </linearGradient>
    <linearGradient id="burger-bun" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="#FBBF24"/>
      <stop offset="55%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#92400E"/>
    </linearGradient>
    <linearGradient id="burger-patty" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5C2D16"/>
      <stop offset="50%" stop-color="#3E1D0D"/>
      <stop offset="100%" stop-color="#230F06"/>
    </linearGradient>
    <linearGradient id="burger-jacket" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="60%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <rect width="600" height="760" fill="url(#burger-bg)"/>
  <g stroke="#F59E0B" stroke-opacity="0.18" stroke-width="2">
    <line x1="0" y1="120" x2="600" y2="120"/><line x1="0" y1="240" x2="600" y2="240"/><line x1="0" y1="360" x2="600" y2="360"/><line x1="0" y1="480" x2="600" y2="480"/>
    <line x1="150" y1="0" x2="150" y2="760"/><line x1="300" y1="0" x2="300" y2="760"/><line x1="450" y1="0" x2="450" y2="760"/>
  </g>
  <circle cx="300" cy="300" r="245" fill="none" stroke="#F59E0B" stroke-width="4" stroke-opacity="0.35"/>

  <!-- Bomber Jacket & Gold Collar Trim -->
  <path d="M58 760V646c0-130 88-206 214-218h56c126 12 214 88 214 218v114" fill="url(#burger-jacket)" stroke="#06080E" stroke-width="12"/>
  <path d="M180 465l120 115 120-115" fill="none" stroke="#F59E0B" stroke-width="16" stroke-linecap="round"/>
  <!-- Heavy Gold Cuban Link Chain -->
  <path d="M205 495q95 90 190 0" fill="none" stroke="#FACC15" stroke-width="24" stroke-linecap="round"/>

  <!-- Top Sesame Seed Bun (Head Dome & Eyes) -->
  <path d="M135 280c-10-130 65-188 165-188s175 58 165 188z" fill="url(#burger-bun)" stroke="#06080E" stroke-width="11" stroke-linejoin="round"/>
  <!-- Sesame Seeds -->
  <g fill="#FEF3C7" stroke="#78350F" stroke-width="3">
    <ellipse cx="220" cy="145" rx="10" ry="5" transform="rotate(-20 220 145)"/>
    <ellipse cx="275" cy="130" rx="10" ry="5" transform="rotate(10 275 130)"/>
    <ellipse cx="330" cy="135" rx="10" ry="5" transform="rotate(-8 330 135)"/>
    <ellipse cx="385" cy="152" rx="10" ry="5" transform="rotate(22 385 152)"/>
    <ellipse cx="250" cy="170" rx="10" ry="5" transform="rotate(14 250 170)"/>
    <ellipse cx="355" cy="172" rx="10" ry="5" transform="rotate(-15 355 172)"/>
    <ellipse cx="302" cy="158" rx="10" ry="5"/>
  </g>

  <!-- Crisp Lettuce Ruffles -->
  <path d="M120 282q25-24 50 0t50 0 50 0 50 0 50 0 50 0 60 0q10 25-20 28H140q-30-3-20-28z" fill="#22C55E" stroke="#06080E" stroke-width="9"/>
  <!-- Tomato Slice Peek -->
  <rect x="155" y="298" width="290" height="22" rx="10" fill="#EF4444" stroke="#06080E" stroke-width="7"/>

  <!-- Melted Cheddar Cheese Triangles hanging over patty -->
  <path d="M140 315h320l-45 48-55-32-60 44-60-44-55 32z" fill="#FACC15" stroke="#06080E" stroke-width="8" stroke-linejoin="round"/>

  <!-- Double Flame-Broiled Smash Patties (Cheeks & Mid-face) -->
  <rect x="130" y="325" width="340" height="62" rx="30" fill="url(#burger-patty)" stroke="#06080E" stroke-width="11"/>
  <rect x="138" y="378" width="324" height="56" rx="28" fill="url(#burger-patty)" stroke="#06080E" stroke-width="11"/>
  <!-- Bottom Bun Chin -->
  <path d="M150 426h300c8 45-38 72-150 72s-158-27-150-72z" fill="url(#burger-bun)" stroke="#06080E" stroke-width="11" stroke-linejoin="round"/>

  <!-- Boss Sunglasses / Intense Eyes on Top Bun -->
  <path d="M188 205l90 16M412 205l-90 16" stroke="#451A03" stroke-width="15" stroke-linecap="round"/>
  <path d="M204 238q34-20 68 0-34 22-68 0zM328 238q34-20 68 0-34 22-68 0z" fill="#FFFFFF" stroke="#06080E" stroke-width="7"/>
  <circle cx="240" cy="238" r="11" fill="#78350F"/>
  <circle cx="360" cy="238" r="11" fill="#78350F"/>
  <circle cx="237" cy="235" r="3.5" fill="#FFFFFF"/>
  <circle cx="357" cy="235" r="3.5" fill="#FFFFFF"/>
'''
    write("pizza", pizza_base, "#FACC15", "#EF4444", "#991B1B", "#7F1D1D", "#3A0606")
    write("burger", burger_base, "#D97706", "#F59E0B", "#1E293B", "#78350F", "#2A0A04")
    (A / "pizza-emblem.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#220507" stroke="#EF4444" stroke-width="7"/><path d="M26 24q24-12 48 0L50 82z" fill="#FACC15" stroke="#06080E" stroke-width="5" stroke-linejoin="round"/><path d="M23 22q27-14 54 0" fill="none" stroke="#D97706" stroke-width="9" stroke-linecap="round"/><circle cx="46" cy="40" r="6" fill="#DC2626"/><circle cx="57" cy="48" r="5" fill="#DC2626"/><circle cx="48" cy="60" r="5" fill="#DC2626"/></svg>')
    (A / "burger-emblem.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#1E1304" stroke="#F59E0B" stroke-width="7"/><path d="M24 44c0-18 52-18 52 0z" fill="#F59E0B" stroke="#06080E" stroke-width="4"/><rect x="22" y="45" width="56" height="8" rx="4" fill="#22C55E" stroke="#06080E" stroke-width="3"/><rect x="22" y="53" width="56" height="12" rx="6" fill="#5C2D16" stroke="#06080E" stroke-width="4"/><path d="M25 65h50c0 10-50 10-50 0z" fill="#F59E0B" stroke="#06080E" stroke-width="4"/></svg>')
    print("pizza/burger ok")

make_pizza_burger()

