import { renderCard } from "./render";
import { bindTilt, type TiltOptions } from "./tilt";
import type { HoloCardData } from "./types";

export type ViewerOptions = {
  /** The card on the page the viewer flies out of and back into. */
  from?: HTMLElement;
  /** Text under the card. Pass an empty string to hide it. */
  hint?: string;
  tilt?: TiltOptions;
  onClose?: () => void;
};

export type ViewerHandle = {
  /** Plays the return flight and resolves once the viewer is gone. */
  close: () => Promise<void>;
};

/**
 * Shows a card large, centred over a dimmed page.
 *
 * With `from`, a copy of the card starts at the position and size of the
 * original and flies to the centre; the original is hidden meanwhile so the
 * page never shows two identical cards. Closing plays the flight in reverse.
 */
export function openViewer(card: HoloCardData, options: ViewerOptions = {}): ViewerHandle {
  const { from } = options;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const overlay = document.createElement("div");
  overlay.className = "hc-viewer";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", card.title);
  overlay.tabIndex = -1;

  const stage = document.createElement("div");
  stage.className = "hc-viewer__stage";
  const flyer = document.createElement("div");
  flyer.className = "hc-viewer__card";
  const element = renderCard(card);
  flyer.append(element);
  stage.append(flyer);
  overlay.append(stage);

  const hint = options.hint ?? "Click outside or press Esc to close";
  if (hint) {
    const caption = document.createElement("p");
    caption.className = "hc-viewer__hint";
    caption.textContent = hint;
    overlay.append(caption);
  }

  document.body.append(overlay);
  document.documentElement.classList.add("hc-viewer-open");
  if (from) from.style.visibility = "hidden";

  // Offset from the stage centre to the original card and their width ratio.
  const aimFlight = () => {
    if (!from) return;
    const a = from.getBoundingClientRect();
    const b = stage.getBoundingClientRect();
    flyer.style.setProperty("--hc-fly-x", `${a.left + a.width / 2 - (b.left + b.width / 2)}px`);
    flyer.style.setProperty("--hc-fly-y", `${a.top + a.height / 2 - (b.top + b.height / 2)}px`);
    flyer.style.setProperty("--hc-fly-scale", `${a.width / b.width}`);
  };
  aimFlight();
  flyer.classList.add(from ? "is-flying-in" : "is-popping-in");

  const unbind = bindTilt(element, options.tilt);
  overlay.focus();

  let closing: Promise<void> | null = null;

  const close = () => {
    if (closing) return closing;
    closing = new Promise<void>((resolve) => {
      document.removeEventListener("keydown", onKey);
      unbind();

      const finish = () => {
        overlay.remove();
        document.documentElement.classList.remove("hc-viewer-open");
        if (from) from.style.visibility = "";
        returnFocus?.focus({ preventScroll: true });
        options.onClose?.();
        resolve();
      };

      if (reduced) return finish();

      aimFlight();
      flyer.classList.remove("is-flying-in", "is-popping-in");
      // Reading layout commits the class removal so the next animation restarts.
      void flyer.offsetWidth;
      flyer.classList.add(from ? "is-flying-out" : "is-popping-out");
      overlay.classList.add("is-closing");
      // animationend also bubbles up from animations inside the card.
      const onEnd = (event: AnimationEvent) => {
        if (event.target !== flyer) return;
        flyer.removeEventListener("animationend", onEnd);
        finish();
      };
      flyer.addEventListener("animationend", onEnd);
    });
    return closing;
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") void close();
  };
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", () => void close());
  stage.addEventListener("click", (event) => event.stopPropagation());

  return { close };
}
