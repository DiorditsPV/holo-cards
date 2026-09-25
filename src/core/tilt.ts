/**
 * Pointer and gyroscope tracking for a card.
 *
 * The tracker draws nothing. It writes six custom properties on the card root
 * and eases them towards the pointer; every visual layer in the stylesheet is
 * derived from these values with `calc()`.
 *
 *   --hc-px, --hc-py   pointer position inside the card, 0..1
 *   --hc-tilt-x        rotation around the X axis, deg
 *   --hc-tilt-y        rotation around the Y axis, deg
 *   --hc-active        0 at rest, 1 while the card is handled
 *   --hc-dist          pointer distance from the centre, 0..1
 */

export type TiltOptions = {
  /** Maximum rotation at the card edge, in degrees. Default 11. */
  maxTilt?: number;
  /** Follow the device orientation on phones. Default true. */
  gyroscope?: boolean;
};

type Channels = { px: number; py: number; active: number };

const REST: Readonly<Channels> = { px: 0.5, py: 0.5, active: 0 };

/** Share of the remaining distance covered per frame. */
const EASE_FOLLOW = 0.16;
const EASE_SETTLE = 0.075;
const EPSILON = 0.0005;

/** Phones are held tilted towards the face; this is the neutral pitch. */
const GYRO_NEUTRAL_PITCH = 40;
const GYRO_RANGE = { roll: 18, pitch: 20 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function bindTilt(card: HTMLElement, options: TiltOptions = {}): () => void {
  const maxTilt = options.maxTilt ?? 11;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return () => {};

  const goal: Channels = { ...REST };
  const now: Channels = { ...REST };
  let handled = false;
  let frame = 0;
  let gyroIdle: ReturnType<typeof setTimeout> | undefined;

  const write = () => {
    const dx = now.px - 0.5;
    const dy = now.py - 0.5;
    const style = card.style;
    style.setProperty("--hc-px", now.px.toFixed(4));
    style.setProperty("--hc-py", now.py.toFixed(4));
    style.setProperty("--hc-tilt-y", `${(-dx * 2 * maxTilt).toFixed(3)}deg`);
    style.setProperty("--hc-tilt-x", `${(dy * 2 * maxTilt).toFixed(3)}deg`);
    style.setProperty("--hc-active", now.active.toFixed(4));
    style.setProperty("--hc-dist", clamp01(Math.hypot(dx, dy) * 2).toFixed(4));
  };

  const step = () => {
    const ease = handled ? EASE_FOLLOW : EASE_SETTLE;
    let settled = true;
    for (const key of ["px", "py", "active"] as const) {
      now[key] += (goal[key] - now[key]) * ease;
      if (Math.abs(goal[key] - now[key]) > EPSILON) settled = false;
    }
    if (settled && !handled) {
      Object.assign(now, goal);
      write();
      frame = 0;
      return;
    }
    write();
    frame = requestAnimationFrame(step);
  };

  const wake = () => {
    if (!frame) frame = requestAnimationFrame(step);
  };

  const aim = (px: number, py: number) => {
    goal.px = clamp01(px);
    goal.py = clamp01(py);
    goal.active = 1;
    wake();
  };

  const onMove = (event: PointerEvent) => {
    const box = card.getBoundingClientRect();
    handled = true;
    card.classList.add("is-active");
    aim((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
  };

  const onLeave = () => {
    handled = false;
    card.classList.remove("is-active");
    Object.assign(goal, REST);
    wake();
  };

  const onOrientation = (event: DeviceOrientationEvent) => {
    if (event.gamma == null || event.beta == null) return;
    handled = true;
    aim(
      0.5 + event.gamma / (GYRO_RANGE.roll * 2),
      0.5 + (event.beta - GYRO_NEUTRAL_PITCH) / (GYRO_RANGE.pitch * 2),
    );
    // Orientation events stop while the phone is still: let the spring rest.
    clearTimeout(gyroIdle);
    gyroIdle = setTimeout(() => (handled = false), 200);
  };

  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerleave", onLeave);
  card.addEventListener("pointercancel", onLeave);
  if (options.gyroscope !== false) window.addEventListener("deviceorientation", onOrientation);
  write();

  return () => {
    card.removeEventListener("pointermove", onMove);
    card.removeEventListener("pointerleave", onLeave);
    card.removeEventListener("pointercancel", onLeave);
    window.removeEventListener("deviceorientation", onOrientation);
    cancelAnimationFrame(frame);
    clearTimeout(gyroIdle);
  };
}
