import type { Tier } from "@/lib/plans";
import type { MediaKind } from "@/lib/types";

/** Trimmed model shape sent to the browser - no provider or endpoint details. */
export interface ModelOption {
  id: string;
  name: string;
  kind: MediaKind;
  tier: Tier;
  why: string;
  top: boolean;
  isNew: boolean;
  maxDurationSec: number | null;
}

export const ASPECT_RATIOS = [
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "21:9",
] as const;

export const RESOLUTIONS = ["480p", "720p", "1080p", "4k"] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number];
export type Resolution = (typeof RESOLUTIONS)[number];
