import type { HoloCardData } from "../core";

export type Preset = {
  card: HoloCardData;
  /** What this tier adds on top of the previous one. */
  adds: string;
};

/** Nine presets from the most common to the rarest. The emoji carries the meaning of the tier. */
export const presets: Preset[] = [
  {
    adds: "Matte stone, no foil",
    card: {
      rank: "common",
      kind: "Start",
      number: "AC-001",
      title: "First Step",
      description: "Your first card. Every collection starts here.",
      art: { emoji: "👣" },
    },
  },
  {
    adds: "+ satin gloss follows the pointer",
    card: {
      rank: "uncommon",
      kind: "Habit",
      number: "AC-014",
      title: "Seven Days",
      description: "A full week without a miss. The rhythm holds itself now.",
      art: { emoji: "🌿" },
    },
  },
  {
    adds: "+ silver foil with op-art geometry",
    card: {
      rank: "rare",
      kind: "Skill",
      number: "AC-027",
      title: "Sharp Eye",
      description: "Ten correct answers in a row, not a single slip.",
      art: { emoji: "🎯" },
    },
  },
  {
    adds: "+ cosmic foil over the whole card, art floats",
    card: {
      rank: "epic",
      kind: "Insight",
      number: "AC-038",
      title: "Foresight",
      description: "Saw the answer three steps ahead.",
      art: { emoji: "🔮" },
    },
  },
  {
    adds: "+ a porthole into a deep nebula",
    card: {
      rank: "nebula",
      kind: "Breakthrough",
      number: "AC-042",
      title: "Liftoff",
      description: "Finished the course twice as fast as planned.",
      art: { emoji: "🚀" },
    },
  },
  {
    adds: "+ rainbow hologram with scan lines",
    card: {
      rank: "legendary",
      kind: "Achievement",
      number: "AC-050",
      title: "Crown",
      description: "Every chapter done and the final exam passed.",
      art: { emoji: "👑" },
    },
  },
  {
    adds: "+ alive at rest: the glow breathes",
    card: {
      rank: "mythic",
      kind: "Relic",
      number: "AC-066",
      title: "Dragon",
      description: "One in a thousand gets it. It burns even unseen.",
      art: { emoji: "🐉" },
    },
  },
  {
    adds: "+ mirror reflection, rainbow depth",
    card: {
      rank: "obsidian",
      kind: "Artifact",
      number: "AC-071",
      title: "Eclipse",
      description: "Forged in the dark. Reflects everything, reveals nothing.",
      art: { emoji: "🌑" },
    },
  },
  {
    adds: "+ turning rainbow frame, drifting foil",
    card: {
      rank: "prismatic",
      kind: "One of a kind",
      number: "AC-077",
      title: "Prism",
      description: "One of one. Every colour at once.",
      art: { emoji: "💎" },
    },
  },
];
