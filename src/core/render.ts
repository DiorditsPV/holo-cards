import { isFloatingRank, RANK_LABELS, RANKS, tierOf, type HoloCardArt, type HoloCardData } from "./types";

export type RenderOptions = {
  /** Not yet earned: desaturated, no foil. */
  locked?: boolean;
  /**
   * The card can be pressed: the tilt element gets `role="button"` and keyboard focus.
   * A real <button> is not used because the card holds a heading and a paragraph.
   */
  pressable?: boolean;
};

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function hidden<T extends HTMLElement>(element: T): T {
  element.setAttribute("aria-hidden", "true");
  return element;
}

function renderArt(art: HoloCardArt, title: string): HTMLElement {
  if (art.image !== undefined) {
    const image = node("img", "hc-card__art hc-card__art--image");
    image.src = art.image;
    image.alt = art.alt ?? title;
    image.decoding = "async";
    image.draggable = false;
    return image;
  }
  return hidden(node("span", "hc-card__art hc-card__art--emoji", art.emoji));
}

function renderPips(tier: number): HTMLElement {
  const pips = node("span", "hc-card__pips");
  pips.setAttribute("role", "img");
  pips.setAttribute("aria-label", `Tier ${tier} of ${RANKS.length}`);
  for (let i = 1; i <= RANKS.length; i++) pips.append(node("i", i <= tier ? "is-on" : ""));
  return pips;
}

/**
 * Builds the card markup. The order of the tilt element's children is part of
 * the effect: everything after `.hc-card__glare` sits above the foil and is not
 * tinted by it. That is why floating art, the lettering and the gem come last.
 * The window stays in the face: the foil mask and the gem are aligned to it.
 */
export function renderCard(card: HoloCardData, options: RenderOptions = {}): HTMLElement {
  const floating = isFloatingRank(card.rank);
  const rankLabel = card.rankLabel ?? RANK_LABELS[card.rank];

  const root = node("div", options.locked ? "hc-card is-locked" : "hc-card");
  root.dataset.rank = card.rank;

  const tilt = node("div", "hc-card__tilt");
  if (options.pressable) {
    tilt.setAttribute("role", "button");
    tilt.tabIndex = 0;
    tilt.setAttribute("aria-label", `${rankLabel} card: ${card.title}`);
  }

  const face = node("div", "hc-card__face");
  const lettering = node("div", "hc-card__lettering");
  const top = node("div", "hc-card__top");
  top.append(node("span", "hc-card__kind", card.kind ?? ""), node("span", "hc-card__number", card.number ?? ""));

  const window = node("div", "hc-card__window");
  if (!floating) window.append(renderArt(card.art, card.title));

  const body = node("div", "hc-card__body");
  body.append(node("h2", "hc-card__title", card.title));
  if (card.description) body.append(node("p", "hc-card__text", card.description));

  const footer = node("div", "hc-card__footer");
  footer.append(node("span", "hc-card__rank", rankLabel), renderPips(tierOf(card.rank)));

  face.append(window);
  lettering.append(top, body, footer);

  const subject = floating ? node("div", "hc-card__subject") : null;
  subject?.append(renderArt(card.art, card.title));

  const jewel = hidden(node("div", "hc-card__jewel"));
  jewel.append(node("span", "hc-card__gem"));

  // The lettering goes above the floating art so a tall image never covers the title.
  tilt.append(
    face,
    hidden(node("div", "hc-card__grain")),
    hidden(node("div", "hc-card__foil")),
    hidden(node("div", "hc-card__glare")),
    ...(subject ? [subject] : []),
    lettering,
    jewel,
  );
  root.append(tilt);
  return root;
}
