#!/usr/bin/env python3
"""
Vectorize fighter portraits to SVG using vtracer.
Center-crop to 512x512, vtracer colormode='color', color_precision=4, filter_speckle=12, mode='spline'.
Usage: python3 scripts/make_fighter_svg.py <input.jpg> <output.svg>
"""
import sys
from pathlib import Path
from PIL import Image
import vtracer
import numpy as np

def center_crop_512(input_path: Path, output_path: Path) -> None:
    with Image.open(input_path) as im:
        w, h = im.size
        size = min(w, h)
        left = (w - size) // 2
        top = (h - size) // 2
        cropped = im.crop((left, top, left + size, top + size))
        cropped = cropped.resize((512, 512), Image.LANCZOS)
        cropped.save(output_path.with_suffix('.png'), 'PNG', optimize=True)

def trace_to_svg(png_path: Path, svg_path: Path) -> None:
    with Image.open(png_path) as im:
        arr = np.array(im)
    # vtracer.convert_pixels_to_svg expects: width, height, pixels (flat RGBA), options
    h, w = arr.shape[:2]
    # flatten to RGBA (add alpha if RGB)
    if arr.shape[2] == 3:
        alpha = np.full((h, w, 1), 255, dtype=np.uint8)
        arr = np.concatenate([arr, alpha], axis=2)
    pixels = arr.flatten().tolist()
    svg_str = vtracer.convert_pixels_to_svg(
        w, h, pixels,
        colormode='color',
        color_precision=4,
        filter_speckle=12,
        mode='spline',
        layer_difference=16,
        corner_threshold=60,
        length_threshold=4.0,
        max_iterations=10,
        splice_threshold=45,
        path_precision=8,
    )
    svg_path.write_text(svg_str)

def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.jpg> <output.svg>", file=sys.stderr)
        sys.exit(1)
    input_jpg = Path(sys.argv[1])
    output_svg = Path(sys.argv[2])
    png_temp = output_svg.with_suffix('.png')
    center_crop_512(input_jpg, output_svg)
    trace_to_svg(png_temp, output_svg)
    png_temp.unlink(missing_ok=True)
    print(f"✓ Vectorized {input_jpg.name} → {output_svg}")

if __name__ == '__main__':
    main()