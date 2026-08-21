import { IMAGE_CREDITS, VIDEO_CREDITS_PER_5S, type Tier } from "./plans";

/**
 * Model catalog, transcribed from the tier tables in the spec.
 *
 * The image table in the spec lists three visual tiers but the pricing table
 * quotes four allowances, so GPT Image 2 - flagged there as "higher cost than
 * the Soul / Nano Banana family" - is the entry in the `premium` band, with
 * Nano Banana Pro and Topaz sitting above it as `high`.
 */

export type Capability =
  | "text-to-image"
  | "image-to-image"
  | "text-to-video"
  | "image-to-video"
  | "video-to-video"
  | "upscale";

export interface ModelDef {
  id: string;
  name: string;
  kind: "IMAGE" | "VIDEO";
  tier: Tier;
  /** Provider-agnostic; resolved to a concrete endpoint by the adapter. */
  provider: "higgsfield";
  providerModel: string;
  capabilities: Capability[];
  /** Short "why this tier" line, shown in the model picker. */
  why: string;
  notes: string;
  top?: boolean;
  isNew?: boolean;
  /** Overrides the tier default credit cost when a model is an outlier. */
  creditsOverride?: number;
  maxDurationSec?: number;
}

export const IMAGE_MODELS: ModelDef[] = [
  {
    id: "soul-2",
    name: "Higgsfield Soul 2.0",
    kind: "IMAGE",
    tier: "budget",
    provider: "higgsfield",
    providerModel: "soul-2.0",
    capabilities: ["text-to-image", "image-to-image"],
    why: "Extremely low credit cost, native model, lots of free generations on plans.",
    notes: "Best for fashion, cinematic stills, character consistency (Soul ID).",
    top: true,
  },
  {
    id: "soul-cinema",
    name: "Higgsfield Soul Cinema",
    kind: "IMAGE",
    tier: "budget",
    provider: "higgsfield",
    providerModel: "soul-cinema",
    capabilities: ["text-to-image", "image-to-image"],
    why: "Same family, film-grade aesthetic.",
    notes: "Slightly more premium looking than base Soul.",
  },
  {
    id: "z-image",
    name: "Z-Image",
    kind: "IMAGE",
    tier: "budget",
    provider: "higgsfield",
    providerModel: "z-image",
    capabilities: ["text-to-image"],
    why: "Cheapest pure generation model.",
    notes: "Instant lifelike portraits, very low cost.",
  },
  {
    id: "nano-banana-2-lite",
    name: "Nano Banana 2 Lite",
    kind: "IMAGE",
    tier: "budget",
    provider: "higgsfield",
    providerModel: "nano-banana-2-lite",
    capabilities: ["text-to-image", "image-to-image"],
    why: "Lightweight, speed-focused version.",
    notes: "Fast, cheap, good enough for most volume work.",
  },
  {
    id: "seedream-5-pro",
    name: "Seedream 5.0 Pro",
    kind: "IMAGE",
    tier: "mid",
    provider: "higgsfield",
    providerModel: "seedream-5.0-pro",
    capabilities: ["text-to-image", "image-to-image"],
    why: "Strong visual reasoning, consistent images.",
    notes: "Good balance of quality and cost.",
  },
  {
    id: "recraft-v4-1",
    name: "Recraft V4.1",
    kind: "IMAGE",
    tier: "mid",
    provider: "higgsfield",
    providerModel: "recraft-v4.1",
    capabilities: ["text-to-image", "image-to-image"],
    why: "Photorealistic and expressive, good for design.",
    notes: "Solid mid-range.",
  },
  {
    id: "flux-2",
    name: "FLUX.2",
    kind: "IMAGE",
    tier: "mid",
    provider: "higgsfield",
    providerModel: "flux-2",
    capabilities: ["text-to-image", "image-to-image"],
    why: "Speed-optimised detail.",
    notes: "Reliable workhorse.",
  },
  {
    id: "grok-imagine",
    name: "Grok Imagine",
    kind: "IMAGE",
    tier: "mid",
    provider: "higgsfield",
    providerModel: "grok-imagine",
    capabilities: ["text-to-image"],
    why: "Versatile styles by xAI.",
    notes: "Good all-rounder.",
  },
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    kind: "IMAGE",
    tier: "premium",
    provider: "higgsfield",
    providerModel: "gpt-image-2",
    capabilities: ["text-to-image", "image-to-image"],
    why: "Excellent text rendering, near-perfect typography.",
    notes: "Higher cost than the Soul / Nano Banana family.",
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    kind: "IMAGE",
    tier: "high",
    provider: "higgsfield",
    providerModel: "nano-banana-pro",
    capabilities: ["text-to-image", "image-to-image"],
    why: "One of the strongest overall image models: reasoning, consistency, text, faces.",
    notes: "Best quality on the roster for most people.",
    top: true,
  },
  {
    id: "topaz",
    name: "Topaz",
    kind: "IMAGE",
    tier: "high",
    provider: "higgsfield",
    providerModel: "topaz",
    capabilities: ["upscale"],
    why: "High-resolution upscaler.",
    notes: "A utility rather than a generator, but priced as premium.",
  },
];

export const VIDEO_MODELS: ModelDef[] = [
  {
    id: "hailuo-2-3",
    name: "Minimax Hailuo 2.3",
    kind: "VIDEO",
    tier: "budget",
    provider: "higgsfield",
    providerModel: "hailuo-2.3",
    capabilities: ["text-to-video", "image-to-video"],
    why: "Lowest credit cost among capable models, fast and high-dynamic.",
    notes: "Great for short-form, UGC and testing.",
    maxDurationSec: 10,
  },
  {
    id: "wan-2-7",
    name: "Wan 2.7",
    kind: "VIDEO",
    tier: "budget",
    provider: "higgsfield",
    providerModel: "wan-2.7",
    capabilities: ["text-to-video", "image-to-video"],
    why: "Low-to-mid cost, excellent first and end frame control.",
    notes: "Very efficient.",
    maxDurationSec: 10,
  },
  {
    id: "grok-imagine-1-5",
    name: "Grok Imagine 1.5",
    kind: "VIDEO",
    tier: "budget",
    provider: "higgsfield",
    providerModel: "grok-imagine-1.5",
    capabilities: ["text-to-video", "image-to-video"],
    why: "Low-to-mid cost, cinematic with synchronised audio.",
    notes: "Strong value.",
    maxDurationSec: 10,
  },
  {
    id: "kling-motion-control",
    name: "Kling Motion Control",
    kind: "VIDEO",
    tier: "budget",
    provider: "higgsfield",
    providerModel: "kling-motion-control",
    capabilities: ["video-to-video", "image-to-video"],
    why: "Motion transfer from a driving video onto an image or character.",
    notes: "Specialised, relatively cheap.",
    maxDurationSec: 10,
  },
  {
    id: "higgsfield-dop",
    name: "Higgsfield DOP",
    kind: "VIDEO",
    tier: "budget",
    provider: "higgsfield",
    providerModel: "dop",
    capabilities: ["image-to-video", "text-to-video"],
    why: "VFX and camera control.",
    notes: "Native tool, efficient for directed shots.",
    maxDurationSec: 10,
  },
  {
    id: "kling-3",
    name: "Kling 3.0",
    kind: "VIDEO",
    tier: "mid",
    provider: "higgsfield",
    providerModel: "kling-3.0",
    capabilities: ["text-to-video", "image-to-video"],
    why: "Excellent quality-to-credit ratio, up to 4K, multi-shot, native audio.",
    notes: "Currently the best value-for-credits model on the platform.",
    top: true,
    maxDurationSec: 15,
  },
  {
    id: "kling-3-omni-edit",
    name: "Kling 3.0 Omni Edit",
    kind: "VIDEO",
    tier: "mid",
    provider: "higgsfield",
    providerModel: "kling-3.0-omni-edit",
    capabilities: ["video-to-video"],
    why: "Edits existing videos from text prompts.",
    notes: "Same family as Kling 3.0.",
    maxDurationSec: 15,
  },
  {
    id: "gemini-omni-flash",
    name: "Gemini Omni Flash",
    kind: "VIDEO",
    tier: "mid",
    provider: "higgsfield",
    providerModel: "gemini-omni-flash",
    capabilities: ["text-to-video", "image-to-video", "video-to-video"],
    why: "Generate and edit from any input.",
    notes: "Fast multimodal.",
    maxDurationSec: 10,
  },
  {
    id: "happyhorse",
    name: "HappyHorse",
    kind: "VIDEO",
    tier: "mid",
    provider: "higgsfield",
    providerModel: "happyhorse",
    capabilities: ["text-to-video", "image-to-video"],
    why: "Alibaba strong ranked model.",
    notes: "Solid mid-high.",
    maxDurationSec: 10,
  },
  {
    id: "flux-3-video",
    name: "FLUX.3 Video",
    kind: "VIDEO",
    tier: "mid",
    provider: "higgsfield",
    providerModel: "flux-3-video",
    capabilities: ["text-to-video", "image-to-video", "video-to-video"],
    why: "Text, image or video in, with synchronised audio.",
    notes: "Newer, competitive mid-high.",
    isNew: true,
    maxDurationSec: 10,
  },
  {
    id: "seedance-2-4k",
    name: "Seedance 2.0 4K",
    kind: "VIDEO",
    tier: "premium",
    provider: "higgsfield",
    providerModel: "seedance-2.0-4k",
    capabilities: ["text-to-video", "image-to-video"],
    why: "Native 4K, cinematic.",
    notes: "Higher credit burn.",
    top: true,
    maxDurationSec: 15,
  },
  {
    id: "seedance-2-5",
    name: "Seedance 2.5",
    kind: "VIDEO",
    tier: "premium",
    provider: "higgsfield",
    providerModel: "seedance-2.5",
    capabilities: ["text-to-video", "image-to-video"],
    why: "Latest Seedance, up to 30s cinematic.",
    notes: "Flagship ByteDance model - top quality, higher cost.",
    isNew: true,
    maxDurationSec: 30,
  },
  {
    id: "minimax-h3",
    name: "MiniMax H3",
    kind: "VIDEO",
    tier: "premium",
    provider: "higgsfield",
    providerModel: "minimax-h3",
    capabilities: ["text-to-video", "image-to-video"],
    why: "2K from text, keyframes or multimodal input; very strong arena rankings.",
    notes: "Premium new model.",
    isNew: true,
    maxDurationSec: 10,
  },
  {
    id: "veo-3-1",
    name: "Google Veo 3.1",
    kind: "VIDEO",
    tier: "premium",
    provider: "higgsfield",
    providerModel: "veo-3.1",
    capabilities: ["text-to-video", "image-to-video"],
    why: "Crystal-clear, advanced AI video with sound.",
    notes: "Premium Google model, higher credits.",
    maxDurationSec: 10,
  },
  {
    id: "sora-2",
    name: "Sora 2",
    kind: "VIDEO",
    tier: "premium",
    provider: "higgsfield",
    providerModel: "sora-2",
    capabilities: ["text-to-video", "image-to-video"],
    why: "OpenAI most advanced: deep physics and world simulation.",
    notes: "Highest prestige and usually the highest credit cost.",
    maxDurationSec: 15,
  },
];

export const ALL_MODELS: ModelDef[] = [...IMAGE_MODELS, ...VIDEO_MODELS];

const BY_ID = new Map(ALL_MODELS.map((m) => [m.id, m]));

export function getModel(id: string): ModelDef | undefined {
  return BY_ID.get(id);
}

export const TIER_LABEL: Record<Tier, string> = {
  budget: "Budget",
  mid: "Mid-tier",
  premium: "Premium",
  high: "High-end",
};

/** Featured on the landing page prompt bar, matching the mockup. */
export const FEATURED_MODEL_IDS = [
  "nano-banana-pro",
  "gpt-image-2",
  "seedance-2-5",
  "kling-3",
];

/**
 * Credit cost of one run. Video cost scales in whole 5-second blocks; an
 * explicit `creditsOverride` on a model wins over its tier default.
 */
export function creditsForModel(model: ModelDef, seconds?: number): number {
  if (model.creditsOverride !== undefined) return model.creditsOverride;
  if (model.kind === "IMAGE") return IMAGE_CREDITS[model.tier];
  const blocks = Math.max(1, Math.ceil((seconds ?? 5) / 5));
  return VIDEO_CREDITS_PER_5S[model.tier] * blocks;
}
