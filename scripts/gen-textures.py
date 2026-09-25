"""Generates the card textures: grain, brushed metal, op-art geometry, nebula,
star and cosmos layers, and obsidian flecks.

Every texture is deterministic (fixed seed), so a rerun produces the same files.
Star and cosmos layers are drawn on black: in screen blending black is transparent.

Run: python3 scripts/gen-textures.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "src" / "textures"
rng = np.random.default_rng(20260925)


def save(img: Image.Image, name: str, quality: int = 82) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / name, "WEBP", quality=quality, method=6)
    print(f"{name}: {img.size[0]}x{img.size[1]}, {(OUT / name).stat().st_size // 1024} KB")


def tileable_noise(size: int, blur: float) -> np.ndarray:
    """Noise that tiles seamlessly: blurred with wrap-around across the edges."""
    base = rng.normal(0.5, 0.18, (size, size))
    tiled = np.tile(base, (3, 3))
    img = Image.fromarray(np.clip(tiled * 255, 0, 255).astype(np.uint8))
    img = img.filter(ImageFilter.GaussianBlur(blur))
    arr = np.asarray(img, dtype=np.float32)[size : 2 * size, size : 2 * size] / 255
    return arr


def grain() -> None:
    fine = tileable_noise(256, 0.6)
    coarse = tileable_noise(256, 2.2)
    arr = 0.5 + (fine - fine.mean()) * 1.6 + (coarse - coarse.mean()) * 1.1
    save(Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8)).convert("RGB"), "grain.webp")


def brushed_metal() -> None:
    w, h = 512, 512
    rows = rng.normal(0.5, 0.22, (h, 1)).repeat(w, axis=1)
    streaks = rng.normal(0, 0.12, (h, w))
    img = Image.fromarray(np.clip((rows + streaks) * 255, 0, 255).astype(np.uint8))
    # Blurring along the rows only gives the typical streaks of brushed metal.
    img = img.resize((w // 16, h), Image.BILINEAR).resize((w, h), Image.BICUBIC)
    arr = np.asarray(img, dtype=np.float32) / 255
    arr = 0.5 + (arr - arr.mean()) * 1.4
    save(Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8)).convert("RGB"), "brushed.webp")


def cloud(w: int, h: int, cell: int, blur: float) -> np.ndarray:
    """Smooth 0..1 field: a sparse grid of random values, stretched and blurred."""
    field = rng.random((h // cell + 3, w // cell + 3))
    img = Image.fromarray((field * 255).astype(np.uint8)).resize(
        ((w // cell + 3) * cell, (h // cell + 3) * cell), Image.BICUBIC
    )
    img = img.crop((cell, cell, cell + w, cell + h)).filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(img, dtype=np.float32) / 255


def nebula() -> None:
    w, h = 720, 1000
    # Cloud shape: large masses broken up by medium and fine noise.
    shape = cloud(w, h, 260, 40) * 0.6 + cloud(w, h, 110, 18) * 0.28 + cloud(w, h, 40, 6) * 0.12
    density = np.clip((shape - 0.48) * 3.2, 0, 1) ** 1.7
    # Colour drifts from violet to blue to pink along a separate field.
    hue = cloud(w, h, 320, 50)
    violet, blue, pink = np.array([0.55, 0.22, 1.0]), np.array([0.12, 0.42, 1.0]), np.array([1.0, 0.28, 0.7])
    t = hue[..., None]
    color = np.where(t < 0.5, violet * (1 - t * 2) + blue * (t * 2), blue * (2 - t * 2) + pink * (t * 2 - 1))
    glow = cloud(w, h, 60, 10)
    canvas = density[..., None] * color * (0.75 + 0.5 * glow[..., None])
    save(Image.fromarray((np.clip(canvas, 0, 1) * 255).astype(np.uint8)), "nebula.webp", quality=78)


def star(draw: ImageDraw.ImageDraw, x: float, y: float, r: float, color: tuple, cross: bool) -> None:
    draw.ellipse((x - r, y - r, x + r, y + r), fill=color)
    if cross:
        a = r * 4.5
        draw.line((x - a, y, x + a, y), fill=color, width=max(1, int(r / 2)))
        draw.line((x, y - a, x, y + a), fill=color, width=max(1, int(r / 2)))


def stars(name: str, count: int, radius: tuple, cross_share: float, bokeh: int, blur: float) -> None:
    w, h = 720, 1000
    img = Image.new("RGB", (w, h), "black")
    draw = ImageDraw.Draw(img)
    tints = [(255, 255, 255), (200, 225, 255), (255, 214, 240), (214, 255, 245), (255, 240, 200)]
    for _ in range(count):
        x, y = rng.random() * w, rng.random() * h
        r = radius[0] + (radius[1] - radius[0]) * rng.random() ** 3
        tint = tints[rng.integers(len(tints))]
        k = 0.45 + 0.55 * rng.random()
        star(draw, x, y, r, tuple(int(c * k) for c in tint), rng.random() < cross_share)
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur))
    if bokeh:
        layer = Image.new("RGB", (w, h), "black")
        bd = ImageDraw.Draw(layer)
        for _ in range(bokeh):
            x, y = rng.random() * w, rng.random() * h
            r = 6 + rng.random() * 16
            tint = tints[rng.integers(len(tints))]
            bd.ellipse((x - r, y - r, x + r, y + r), fill=tuple(int(c * 0.35) for c in tint))
        layer = layer.filter(ImageFilter.GaussianBlur(5))
        img = Image.fromarray(np.clip(np.asarray(img, np.int16) + np.asarray(layer, np.int16), 0, 255).astype(np.uint8))
    save(img, name, quality=80)


def flecks() -> None:
    """Flecks in volcanic glass: small uneven grey specks, no rays or glints."""
    w, h = 720, 1000
    img = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(img)
    for _ in range(900):
        x, y = rng.random() * w, rng.random() * h
        r = 0.4 + 1.1 * rng.random() ** 4
        # Slightly stretched specks read as mineral rather than as stars.
        stretch = 1 + rng.random() * 1.2
        draw.ellipse((x - r * stretch, y - r, x + r * stretch, y + r), fill=int(90 + 140 * rng.random()))
    img = img.filter(ImageFilter.GaussianBlur(0.45))
    save(img.convert("RGB"), "flecks.webp", quality=80)


def geometry() -> None:
    """Op-art for the metal foil: a triangle grid where each triangle is hatched
    parallel to one of its sides, the direction changing from triangle to
    triangle. White stripes on black."""
    side = 64
    h_tri = side * 3 ** 0.5 / 2
    cols, rows = 8, 8
    w, h = int(side * cols), int(round(h_tri * rows))
    scale = 3
    img = Image.new("L", (w * scale, h * scale), 0)
    draw = ImageDraw.Draw(img)
    stripe = 7 * scale

    def hatch(tri, direction):
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).polygon([(x * scale, y * scale) for x, y in tri], fill=255)
        lines = Image.new("L", img.size, 0)
        ld = ImageDraw.Draw(lines)
        (ax, ay), (bx, by) = direction
        dx, dy = bx - ax, by - ay
        length = (dx * dx + dy * dy) ** 0.5
        ux, uy = dx / length, dy / length
        nx, ny = -uy, ux
        cx = sum(p[0] for p in tri) / 3 * scale
        cy = sum(p[1] for p in tri) / 3 * scale
        for k in range(-12, 13):
            ox, oy = cx + nx * k * stripe, cy + ny * k * stripe
            ld.line((ox - ux * 400, oy - uy * 400, ox + ux * 400, oy + uy * 400), fill=255, width=int(stripe * 0.45))
        img.paste(lines, (0, 0), Image.composite(mask, Image.new("L", img.size, 0), mask))

    for r in range(rows):
        for c in range(-1, cols * 2 + 1):
            x0 = c * side / 2
            y0, y1 = r * h_tri, (r + 1) * h_tri
            up = (c + r) % 2 == 0
            if up:
                tri = [(x0, y1), (x0 + side / 2, y0), (x0 + side, y1)]
            else:
                tri = [(x0, y0), (x0 + side / 2, y1), (x0 + side, y0)]
            # Hatch parallel to one of the three sides, cycling through them.
            edges = [(tri[0], tri[1]), (tri[1], tri[2]), (tri[2], tri[0])]
            hatch(tri, edges[(c + 2 * r) % 3])
    img = img.resize((w, h), Image.LANCZOS)
    save(img.convert("RGB"), "geometry.webp", quality=85)


def galaxy(draw: ImageDraw.ImageDraw, x: float, y: float, size: float, tint: tuple) -> None:
    """A small spiral galaxy made of dots."""
    arms = 2
    for arm in range(arms):
        for i in range(60):
            t = i / 60
            angle = arm * np.pi + t * 3.2 * np.pi
            r = t * size
            px, py = x + np.cos(angle) * r, y + np.sin(angle) * r * 0.55
            k = 1 - t * 0.7
            dot = 0.6 + (1 - t) * 1.2
            draw.ellipse((px - dot, py - dot, px + dot, py + dot), fill=tuple(int(c * k) for c in tint))


def sparkle(draw: ImageDraw.ImageDraw, x: float, y: float, r: float, color: tuple) -> None:
    """A four-pointed diamond sparkle."""
    draw.polygon([(x, y - r), (x + r * 0.28, y), (x, y + r), (x - r * 0.28, y)], fill=color)
    draw.polygon([(x - r, y), (x, y - r * 0.28), (x + r, y), (x, y + r * 0.28)], fill=color)


def cosmos(name: str, dots: int, planets: int, sparkles: int, galaxies: int, lines: int, white: bool) -> None:
    """Colourful cosmos: dots of many tints and sizes, planets, sparkles,
    galaxies and dotted constellations. `white` keeps to white and pale tints
    for the top layer."""
    w, h = 720, 1000
    img = Image.new("RGB", (w, h), "black")
    draw = ImageDraw.Draw(img)
    palette = [(255, 179, 230), (201, 168, 255), (143, 208, 255), (255, 203, 164), (160, 255, 220), (255, 255, 255)]
    if white:
        palette = [(255, 255, 255), (230, 238, 255), (255, 236, 250)]
    pick = lambda: palette[rng.integers(len(palette))]
    shade = lambda c, k: tuple(int(v * k) for v in c)

    # Planets: large soft discs with a lit side.
    for _ in range(planets):
        x, y, r = rng.random() * w, rng.random() * h, 8 + rng.random() * 26
        c = pick()
        for i in range(int(r), 0, -1):
            k = 0.25 + 0.5 * (1 - i / r)
            draw.ellipse((x - i + r * 0.15, y - i + r * 0.15, x + i + r * 0.15, y + i + r * 0.15), fill=shade(c, k))
    # Dotted constellation lines between random points.
    for _ in range(lines):
        x, y = rng.random() * w, rng.random() * h
        for _ in range(3 + rng.integers(3)):
            nx, ny = x + (rng.random() - 0.5) * 140, y + (rng.random() - 0.5) * 140
            steps = int(np.hypot(nx - x, ny - y) / 6)
            for s_ in range(steps):
                t = s_ / max(steps, 1)
                px, py = x + (nx - x) * t, y + (ny - y) * t
                draw.ellipse((px - 0.6, py - 0.6, px + 0.6, py + 0.6), fill=(150, 150, 190))
            x, y = nx, ny
    for _ in range(galaxies):
        galaxy(draw, rng.random() * w, rng.random() * h, 12 + rng.random() * 18, pick())
    for _ in range(dots):
        x, y = rng.random() * w, rng.random() * h
        r = 0.6 + 3.2 * rng.random() ** 4
        draw.ellipse((x - r, y - r, x + r, y + r), fill=shade(pick(), 0.5 + 0.5 * rng.random()))
    for _ in range(sparkles):
        sparkle(draw, rng.random() * w, rng.random() * h, 4 + rng.random() * 9, shade(pick(), 0.7 + 0.3 * rng.random()))
    img = img.filter(ImageFilter.GaussianBlur(0.35))
    save(img, name, quality=82)


if __name__ == "__main__":
    grain()
    brushed_metal()
    nebula()
    stars("stars-far.webp", count=2600, radius=(0.5, 1.4), cross_share=0.0, bokeh=0, blur=0.3)
    stars("stars-mid.webp", count=420, radius=(1.0, 2.6), cross_share=0.12, bokeh=0, blur=0.4)
    flecks()
    stars("stars-near.webp", count=70, radius=(1.6, 3.6), cross_share=0.6, bokeh=0, blur=0.5)
    # Newer textures are generated last so the random sequence, and with it the
    # existing files, stays the same.
    geometry()
    cosmos("cosmos-far.webp", dots=1800, planets=10, sparkles=40, galaxies=6, lines=8, white=False)
    cosmos("cosmos-mid.webp", dots=500, planets=7, sparkles=45, galaxies=4, lines=4, white=False)
    cosmos("cosmos-near.webp", dots=120, planets=0, sparkles=40, galaxies=5, lines=0, white=True)
