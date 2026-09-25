import { mountHoloCard, RANK_LABELS, tierOf } from "../core";
import "../styles/index.css";
import { presets } from "./cards";
import "./demo.css";

const ladder = document.querySelector<HTMLElement>("#ladder")!;

for (const { card, adds } of presets) {
  const step = document.createElement("figure");
  step.className = "ladder-step";
  mountHoloCard(step, card, { openOnClick: true });

  const caption = document.createElement("figcaption");
  const tier = document.createElement("b");
  tier.textContent = `${tierOf(card.rank)} · ${card.rankLabel ?? RANK_LABELS[card.rank]}`;
  caption.append(tier, document.createTextNode(adds));
  step.append(caption);
  ladder.append(step);
}
