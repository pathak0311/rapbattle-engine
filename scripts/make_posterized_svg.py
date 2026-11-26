#!/usr/bin/env python3
"""
Posterized vector portrait generator (fallback for vtracer, which segfaults on this arm64 build).
Quantizes a square PNG into K color clusters, traces each cluster's contours with OpenCV,
and writes an SVG with one filled path group per cluster, mapped onto a custom palette
(dark -> light) for a poster look.

Usage: python3 scripts/make_posterized_svg.py <input.png> <output.svg> <hex_dark,...,hex_light> [--k N] [--eps 1.2]
"""
import sys, argparse
import numpy as np
import cv2
from pathlib import Path


def contour_to_d(cnt, eps):
    approx = cv2.approxPolyDP(cnt, eps, True)
    pts = approx.reshape(-1, 2)
    if len(pts) < 3:
        return ""
    d = f"M{pts[0][0]},{pts[0][1]}"
    d += "".join(f"L{x},{y}" for x, y in pts[1:])
    return d + "Z"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("palette", help="comma-separated hex colors, dark to light")
    ap.add_argument("--k", type=int, default=None)
    ap.add_argument("--eps", type=float, default=1.2)
    ap.add_argument("--min-area", type=float, default=40.0)
    args = ap.parse_args()

    palette = [c.strip() for c in args.palette.split(",") if c.strip()]
    k = args.k or len(palette)

    img = cv2.imread(args.input, cv2.IMREAD_COLOR)
    if img is None:
        sys.exit(f"cannot read {args.input}")
    h, w = img.shape[:2]
    smooth = cv2.bilateralFilter(img, 9, 75, 75)

    # k-means color quantization
    pixels = smooth.reshape(-1, 3).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(pixels, k, None, crit, 3, cv2.KMEANS_PP_CENTERS)
    labels = labels.reshape(h, w)
    lum = centers @ np.array([0.114, 0.587, 0.299])  # BGR luminance
    order = np.argsort(lum)  # darkest first -> palette index

    layers = []
    for rank, idx in enumerate(order):
        mask = (labels == idx).astype(np.uint8) * 255
        mask = cv2.medianBlur(mask, 5)
        contours, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        ds = []
        for cnt in contours:
            if cv2.contourArea(cnt) < args.min_area:
                continue
            d = contour_to_d(cnt, args.eps)
            if d:
                ds.append(d)
        if not ds:
            continue
        color = palette[min(rank, len(palette) - 1)]
        area = int(np.count_nonzero(mask))
        layers.append((area, color, " ".join(ds)))

    # largest (background) first so detail stacks on top
    layers.sort(key=lambda t: -t[0])
    body = "\n".join(
        f'  <path fill="{c}" fill-rule="evenodd" d="{d}"/>' for _, c, d in layers
    )
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n'
        f"{body}\n</svg>\n"
    )
    Path(args.output).write_text(svg)
    print(f"✓ {args.input} → {args.output} ({len(layers)} layers, {k} clusters)")


if __name__ == "__main__":
    main()
