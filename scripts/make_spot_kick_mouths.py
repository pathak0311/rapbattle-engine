#!/usr/bin/env python3
"""Build lip-sync mouth variants for the SPOT KICK fighters.

Reads the posterized portraits public/assets/{messi,ronaldo}.svg (viewBox 768x768)
and writes public/assets/{messi,ronaldo}-m{0,1,2}.svg:
  m0 = closed, m1 = half open, m2 = open.

Each variant = full portrait + a skin-matched patch over the traced mouth + a
mouth drawn as filled polygons. Polygons (M x,y L x,y ... Z, fill-rule evenodd)
keep the file in the same path format scripts/../tmp preview tooling parses.
"""
import math
from pathlib import Path

A = Path(__file__).resolve().parent.parent / "public/assets"


def ellipse(cx, cy, rx, ry, n=48):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        pts.append((round(cx + rx * math.cos(a)), round(cy + ry * math.sin(a))))
    return poly(pts)


def poly(pts):
    head = f"M{pts[0][0]},{pts[0][1]}"
    body = "".join(f"L{x},{y}" for x, y in pts[1:])
    return head + body + "Z"


def path(fill, d):
    return f'  <path fill="{fill}" fill-rule="evenodd" d="{d}"/>\n'


def lens(x0, x1, yc, thick, n=24):
    """Thin lens-shaped lip line from x0 to x1 centred on yc."""
    top, bot = [], []
    for i in range(n + 1):
        t = i / n
        x = x0 + (x1 - x0) * t
        bulge = math.sin(math.pi * t)
        top.append((round(x), round(yc - thick * bulge)))
        bot.append((round(x), round(yc + thick * bulge)))
    return poly(top + bot[::-1])


# ---------- Messi: baked mouth ~ x 325-400, y 333-415 ----------
MESSI_PATCH = "#1B4D9C"   # sampled mid-blue around the mouth
MESSI_INK = "#07122B"     # sampled deep navy (beard / mouth cavity)
MESSI_TEETH = "#E9F6FF"   # sampled highlight
MESSI_TONGUE = "#2B6CB8"


def messi_variant(k):
    s = path(MESSI_PATCH, ellipse(362, 376, 42, 40))
    if k == 0:  # closed: thin dark lip line + soft lower lip
        s += path(MESSI_INK, lens(336, 390, 375, 9))
        s += path(MESSI_TONGUE, lens(346, 382, 383, 4))
        s += path(MESSI_INK, lens(350, 378, 383, 1))
    elif k == 1:  # half: cavity with upper teeth showing
        s += path(MESSI_INK, ellipse(364, 381, 27, 12))
        s += path(MESSI_TEETH, poly([(344, 371), (384, 371), (380, 376), (348, 376)]))
    else:  # open: big cavity, both tooth rows, tongue
        s += path(MESSI_INK, ellipse(364, 384, 26, 22))
        s += path(MESSI_TEETH, poly([(344, 366), (384, 366), (380, 375), (348, 375)]))
        s += path(MESSI_TEETH, poly([(346, 395), (382, 395), (378, 402), (350, 402)]))
        s += path(MESSI_TONGUE, ellipse(366, 395, 14, 6))
    return s


# ---------- Ronaldo: baked mouth ~ x 333-433, y 343-403 ----------
RON_SKIN = "#F5A623"     # sampled orange skin
RON_LIP = "#7A0E10"      # sampled dark-red lip / shadow
RON_INK = "#1A0606"      # sampled mouth cavity
RON_TEETH = "#FFF3C4"    # sampled cream teeth
RON_TONGUE = "#B3262B"


def ron_variant(k):
    s = path(RON_SKIN, ellipse(383, 372, 52, 34))
    if k == 0:  # closed: lip lens
        s += path(RON_LIP, lens(338, 430, 373, 11))
        s += path(RON_INK, lens(350, 418, 373, 2))
    elif k == 1:  # half: lip ring + cavity + teeth band
        s += path(RON_LIP, ellipse(384, 374, 47, 19))
        s += path(RON_INK, ellipse(384, 375, 38, 13))
        s += path(RON_TEETH, poly([(352, 366), (416, 366), (412, 372), (356, 372)]))
    else:  # open: lip ring, cavity, upper+lower teeth, tongue
        s += path(RON_LIP, ellipse(384, 372, 47, 31))
        s += path(RON_INK, ellipse(384, 370, 37, 23))
        s += path(RON_TEETH, poly([(354, 356), (414, 356), (410, 366), (358, 366)]))
        s += path(RON_TEETH, poly([(358, 384), (410, 384), (404, 392), (364, 392)]))
        s += path(RON_TONGUE, ellipse(384, 388, 16, 7))
    return s


def build(name, fn):
    base = (A / f"{name}.svg").read_text()
    if "</svg>" not in base:
        raise SystemExit(f"{name}.svg has no closing tag")
    head = base.rsplit("</svg>", 1)[0]
    for k in range(3):
        out = head + "  <!-- lip-sync mouth overlay: " + ["closed", "half", "open"][k] + " -->\n" + fn(k) + "</svg>\n"
        (A / f"{name}-m{k}.svg").write_text(out)


build("messi", messi_variant)
build("ronaldo", ron_variant)
print("ok", sorted(p.name for p in A.glob("*-m?.svg") if p.stem.startswith(("messi", "ronaldo"))))
