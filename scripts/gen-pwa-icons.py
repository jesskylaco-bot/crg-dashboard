#!/usr/bin/env python3
"""Generate the master PWA icon (512x512) for the CRG Dashboard.

Pure-stdlib PNG encoder (zlib only) so it runs with no extra deps. Draws a
simple house mark (Cobb Realty Group) in cream on a black field, kept inside
the central safe zone so the same art works for both "any" and "maskable".
Other sizes are produced from this master with `sips`.
"""
import struct
import zlib

SIZE = 512
BG = (0, 0, 0)          # black, matches theme_color
FG = (245, 240, 230)    # warm cream

# RGBA buffer
px = bytearray(SIZE * SIZE * 4)


def put(x, y, rgb):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        i = (y * SIZE + x) * 4
        px[i], px[i + 1], px[i + 2], px[i + 3] = rgb[0], rgb[1], rgb[2], 255


# fill background
for y in range(SIZE):
    for x in range(SIZE):
        put(x, y, BG)


def fill_rect(x0, y0, x1, y1, rgb):
    for y in range(y0, y1):
        for x in range(x0, x1):
            put(x, y, rgb)


# --- House mark, centered, within the central ~55% safe zone ---
# Roof: filled triangle, apex at top-center.
apex_x, apex_y = 256, 150
base_y = 250
left_x, right_x = 150, 362
for y in range(apex_y, base_y + 1):
    t = (y - apex_y) / (base_y - apex_y)
    xl = int(apex_x + (left_x - apex_x) * t)
    xr = int(apex_x + (right_x - apex_x) * t)
    for x in range(xl, xr + 1):
        put(x, y, FG)

# Body: square below the roof.
fill_rect(180, 250, 332, 372, FG)

# Door: punch out (back to background) for contrast.
fill_rect(232, 300, 280, 372, BG)


def write_png(path):
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0)  # 8-bit RGBA
    raw = bytearray()
    stride = SIZE * 4
    for y in range(SIZE):
        raw.append(0)  # filter type 0 (none)
        raw += px[y * stride:(y + 1) * stride]
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", idat))
        f.write(chunk(b"IEND", b""))


if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "public/icon-512.png"
    write_png(out)
    print("wrote", out)
