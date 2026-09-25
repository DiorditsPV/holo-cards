/** Ranks from the most common to the rarest. The order drives the tier pips. */
export const RANKS = ["common", "uncommon", "rare", "epic", "nebula", "legendary", "mythic", "obsidian", "prismatic"] as const;

export type Rank = (typeof RANKS)[number];

/** Default rank names. Pass `rankLabel` on a card to localise. */
export const RANK_LABELS: Readonly<Record<Rank, string>> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  nebula: "Nebula",
  legendary: "Legendary",
  mythic: "Mythic",
  obsidian: "Obsidian",
  prismatic: "Prismatic",
};

export type HoloCardArt =
  /** An emoji or any short text glyph. */
  | { emoji: string; image?: never }
  /** An image URL. Transparent cut-outs look best on the floating ranks. */
  | { image: string; emoji?: never; alt?: string };

export type HoloCardData = {
  rank: Rank;
  title: string;
  description?: string;
  /** Small caption in the top-left corner, e.g. the card category. */
  kind?: string;
  /** Small caption in the top-right corner, e.g. the collection number. */
  number?: string;
  /** Overrides the default rank name shown in the footer. */
  rankLabel?: string;
  art: HoloCardArt;
};

/** 1-based position of the rank on the rarity ladder. */
export function tierOf(rank: Rank): number {
  return RANKS.indexOf(rank) + 1;
}

/** From `epic` up the art leaves the window and floats above the foil. */
export function isFloatingRank(rank: Rank): boolean {
  return tierOf(rank) >= tierOf("epic");
}
