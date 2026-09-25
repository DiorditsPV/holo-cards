/**
 * Records README GIFs: a pair of cards tilting along a looping path.
 *
 * Needs the dev server (`npm run dev`), Google Chrome and ffmpeg.
 *   node scripts/record-demo.mjs [url] [pair ...]
 *   node scripts/record-demo.mjs http://localhost:5173 nebula,mythic epic,prismatic
 *
 * Each pair is two ranks separated by a comma and becomes media/<a>-<b>.gif.
 * Card data comes from the demo presets (src/demo/cards.ts).
 *
 * The pointer path is periodic and exactly one period is recorded, so the GIF
 * loops without a jump. A screenshot takes longer than a frame, so the page runs
 * in slow motion (CSS animations and the pointer path both SLOW times slower) and
 * the frames are played back at normal speed.
 *
 * Sharpness: frames are taken at device scale 2 and written at that full size,
 * without downscaling. One 256-colour palette is built from all frames and
 * applied with a fine ordered dither: gradients stay smooth, and the dither
 * pattern is the same from frame to frame, so unchanged areas compress well.
 * A palette per frame looks marginally better but makes the file three times
 * larger (about 45 MB for a pair) because the dither noise changes every frame.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [url = "http://localhost:5173", ...pairArgs] = process.argv.slice(2);
const pairs = (pairArgs.length ? pairArgs : ["epic,prismatic"]).map((p) => p.split(","));
const chrome = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PERIOD_MS = 5000;
const FPS = 15;
const SCALE = 2;
const WIDTH = 600;
const HEIGHT = 440;
const CARD_WIDTH = 250;
const SLOW = 4;

async function record(ranks) {
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--hide-scrollbars"] });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE });
  await page.goto(url, { waitUntil: "networkidle0" });
  const cdp = await page.createCDPSession();
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 / SLOW });

  await page.evaluate(
    async (ranks, cardWidth) => {
      const { mountHoloCard } = await import("/src/core/index.ts");
      const { presets } = await import("/src/demo/cards.ts");
      document.body.innerHTML = "";
      document.body.style.cssText =
        "margin:0;height:100vh;display:flex;align-items:center;justify-content:center;gap:40px;background:#0e0b12";
      for (const rank of ranks) {
        const preset = presets.find((p) => p.card.rank === rank);
        if (!preset) throw new Error(`no demo preset for rank "${rank}"`);
        const slot = document.createElement("div");
        slot.style.width = `${cardWidth}px`;
        document.body.append(slot);
        mountHoloCard(slot, preset.card);
      }
    },
    ranks,
    CARD_WIDTH,
  );
  await page.evaluate(() => document.fonts.ready);

  // Drive both cards along a Lissajous path, the second one half a period behind.
  await page.evaluate((period) => {
    const els = [...document.querySelectorAll(".hc-card")];
    const start = performance.now();
    const loop = (now) => {
      const t = ((now - start) % period) / period;
      els.forEach((el, i) => {
        const a = (t + i * 0.5) * Math.PI * 2;
        const box = el.getBoundingClientRect();
        const x = 0.5 + 0.38 * Math.sin(a);
        const y = 0.5 + 0.34 * Math.sin(a * 2);
        el.dispatchEvent(
          new PointerEvent("pointermove", { clientX: box.left + box.width * x, clientY: box.top + box.height * y }),
        );
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, PERIOD_MS * SLOW);

  // Warm up so the spring has caught the path before recording.
  await new Promise((r) => setTimeout(r, 2000));

  const tmp = resolve(root, "media", ".frames");
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  // Screenshots in real time: the frame index comes from the clock, not the count.
  const frames = Math.round((PERIOD_MS / 1000) * FPS);
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const due = t0 + (i * 1000 * SLOW) / FPS;
    const wait = due - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    await page.screenshot({ path: resolve(tmp, `f${String(i).padStart(4, "0")}.png`) });
  }
  await browser.close();

  const out = resolve(root, "media", `${ranks.join("-")}.gif`);
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    "-framerate", String(FPS),
    "-i", resolve(tmp, "f%04d.png"),
    "-filter_complex",
    "split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
    "-loop", "0",
    out,
  ]);
  if (!process.env.KEEP_FRAMES) rmSync(tmp, { recursive: true, force: true });
  console.log(`wrote ${out} (${(statSync(out).size / 1024 / 1024).toFixed(1)} MB)`);
}

for (const ranks of pairs) await record(ranks);
