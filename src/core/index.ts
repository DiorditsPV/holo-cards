import { renderCard, type RenderOptions } from "./render";
import { bindTilt, type TiltOptions } from "./tilt";
import type { HoloCardData } from "./types";
import { openViewer, type ViewerOptions } from "./viewer";

export { renderCard, type RenderOptions } from "./render";
export { bindTilt, type TiltOptions } from "./tilt";
export { isFloatingRank, RANK_LABELS, RANKS, tierOf, type HoloCardArt, type HoloCardData, type Rank } from "./types";
export { openViewer, type ViewerHandle, type ViewerOptions } from "./viewer";

export type MountOptions = RenderOptions & {
  tilt?: TiltOptions;
  /** Open the full-screen viewer when the card is clicked or activated with the keyboard. */
  openOnClick?: boolean | Omit<ViewerOptions, "from">;
};

export type HoloCardHandle = {
  element: HTMLElement;
  /** Shows this card in the full-screen viewer. */
  open: (options?: Omit<ViewerOptions, "from">) => void;
  /** Removes the card and all its listeners. */
  destroy: () => void;
};

/** Renders a card into `container`, makes it follow the pointer and, optionally, open full screen. */
export function mountHoloCard(container: HTMLElement, card: HoloCardData, options: MountOptions = {}): HoloCardHandle {
  const openable = Boolean(options.openOnClick) && !options.locked;
  const element = renderCard(card, { locked: options.locked, pressable: options.pressable ?? openable });
  container.append(element);
  const unbind = options.locked ? () => {} : bindTilt(element, options.tilt);

  const open = (viewer: Omit<ViewerOptions, "from"> = {}) => {
    openViewer(card, { tilt: options.tilt, ...viewer, from: element });
  };

  const tilt = element.querySelector<HTMLElement>(".hc-card__tilt")!;
  const viewerOptions = typeof options.openOnClick === "object" ? options.openOnClick : {};
  const onClick = () => open(viewerOptions);
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open(viewerOptions);
    }
  };
  if (openable) {
    tilt.addEventListener("click", onClick);
    tilt.addEventListener("keydown", onKey);
  }

  return {
    element,
    open,
    destroy: () => {
      unbind();
      tilt.removeEventListener("click", onClick);
      tilt.removeEventListener("keydown", onKey);
      element.remove();
    },
  };
}
