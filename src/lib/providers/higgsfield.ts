import "server-only";

import {
  ProviderError,
  ProviderNotConfiguredError,
  type GenerationProvider,
  type JobState,
  type JobStatus,
  type SubmitRequest,
  type SubmitResult,
} from "./types";

/**
 * Higgsfield platform adapter.
 *
 * Contract (docs.higgsfield.ai):
 *   POST {base}/{endpoint}          -> { status, request_id, status_url, cancel_url }
 *   GET  {base}/requests/{id}/status-> { status, images:[{url}] | video:{url}, error }
 *   POST {base}/requests/{id}/cancel
 *   Auth header: `Key <keyId>:<keySecret>`
 *
 * Terminal statuses are completed | failed | nsfw | canceled.
 */

const DEFAULT_BASE_URL = "https://platform.higgsfield.ai";

/**
 * Maps catalog model ids to platform endpoint paths.
 *
 * Only `higgsfield-ai/soul/standard` is confirmed against the public docs; the
 * rest follow the same `owner/model/variant` convention and should be checked
 * against the model list in Higgsfield Cloud for your account before launch.
 * Any entry can be overridden without a redeploy via HIGGSFIELD_ENDPOINT_MAP,
 * a JSON object of { modelId: "owner/model/variant" }.
 */
const ENDPOINTS: Record<string, string> = {
  // Images
  "soul-2": "higgsfield-ai/soul/standard",
  "soul-cinema": "higgsfield-ai/soul-cinema/standard",
  "z-image": "higgsfield-ai/z-image/standard",
  "nano-banana-2-lite": "google/nano-banana-2/lite",
  "seedream-5-pro": "bytedance/seedream-5/pro",
  "recraft-v4-1": "recraft/recraft-v4/standard",
  "flux-2": "black-forest-labs/flux-2/standard",
  "grok-imagine": "xai/grok-imagine/standard",
  "gpt-image-2": "openai/gpt-image-2/standard",
  "nano-banana-pro": "google/nano-banana-2/pro",
  topaz: "topaz/upscale/standard",

  // Video
  "hailuo-2-3": "minimax/hailuo-2.3/standard",
  "wan-2-7": "alibaba/wan-2.7/standard",
  "grok-imagine-1-5": "xai/grok-imagine-1.5/standard",
  "kling-motion-control": "kling/motion-control/standard",
  "higgsfield-dop": "higgsfield-ai/dop/standard",
  "kling-3": "kling/kling-3.0/standard",
  "kling-3-omni-edit": "kling/kling-3.0/omni-edit",
  "gemini-omni-flash": "google/gemini-omni/flash",
  happyhorse: "alibaba/happyhorse/standard",
  "flux-3-video": "black-forest-labs/flux-3-video/standard",
  "seedance-2-4k": "bytedance/seedance-2.0/4k",
  "seedance-2-5": "bytedance/seedance-2.5/standard",
  "minimax-h3": "minimax/h3/standard",
  "veo-3-1": "google/veo-3.1/standard",
  "sora-2": "openai/sora-2/standard",
};

function endpointOverrides(): Record<string, string> {
  const raw = process.env.HIGGSFIELD_ENDPOINT_MAP;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // A malformed override should not take the whole studio down.
    console.warn("HIGGSFIELD_ENDPOINT_MAP is not valid JSON, ignoring it");
  }
  return {};
}

function endpointFor(modelId: string): string {
  const endpoint = endpointOverrides()[modelId] ?? ENDPOINTS[modelId];
  if (!endpoint) {
    throw new ProviderError(`No Higgsfield endpoint mapped for "${modelId}"`);
  }
  return endpoint;
}

/** Higgsfield terminal states, normalised onto the provider-agnostic set. */
function normaliseStatus(raw: string): JobStatus {
  switch (raw) {
    case "queued":
      return "queued";
    case "in_progress":
    case "processing":
    case "running":
      return "running";
    case "completed":
      return "succeeded";
    case "failed":
      return "failed";
    case "canceled":
    case "cancelled":
      return "canceled";
    case "nsfw":
      // Distinct from a fault: the request ran but the output was withheld.
      return "rejected";
    default:
      return "running";
  }
}

interface HiggsfieldSubmitResponse {
  status?: string;
  request_id?: string;
}

interface HiggsfieldStatusResponse {
  status?: string;
  request_id?: string;
  error?: string | null;
  images?: Array<{ url?: string; content_type?: string }>;
  video?: { url?: string; content_type?: string };
  audio?: { url?: string; content_type?: string };
  payload?: {
    images?: Array<{ url?: string; content_type?: string }>;
    video?: { url?: string; content_type?: string };
  } | null;
}

/** Output lives in either the top level or a `payload` envelope. */
function extractOutput(body: HiggsfieldStatusResponse): {
  url?: string;
  contentType?: string;
} {
  const images = body.payload?.images ?? body.images;
  const video = body.payload?.video ?? body.video;
  if (video?.url) return { url: video.url, contentType: video.content_type };
  const first = images?.[0];
  if (first?.url) return { url: first.url, contentType: first.content_type };
  if (body.audio?.url) {
    return { url: body.audio.url, contentType: body.audio.content_type };
  }
  return {};
}

class HiggsfieldProvider implements GenerationProvider {
  readonly id = "higgsfield";

  private get baseUrl(): string {
    return (process.env.HIGGSFIELD_BASE_URL || DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    );
  }

  private authHeader(): string {
    const id = process.env.HIGGSFIELD_API_KEY_ID;
    const secret = process.env.HIGGSFIELD_API_KEY_SECRET;
    if (!id || !secret) throw new ProviderNotConfiguredError(this.id);
    return `Key ${id}:${secret}`;
  }

  private async call<T>(
    path: string,
    init: RequestInit & { timeoutMs?: number } = {},
  ): Promise<T> {
    const { timeoutMs = 30_000, ...rest } = init;

    // Resolved before the try block so a missing key surfaces as "not
    // configured" (503) rather than being caught and reported as a network
    // fault against Higgsfield (502).
    const authorization = this.authHeader();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/${path.replace(/^\/+/, "")}`, {
        ...rest,
        signal: controller.signal,
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(rest.headers ?? {}),
        },
        cache: "no-store",
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderError("Higgsfield request timed out");
      }
      throw new ProviderError(
        `Could not reach Higgsfield: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new ProviderError(
        `Higgsfield returned ${res.status}: ${detail.slice(0, 300)}`,
        res.status,
      );
    }

    // Cancel returns 2xx with an empty body.
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  async submit(req: SubmitRequest): Promise<SubmitResult> {
    const endpoint = endpointFor(req.model.id);

    const body: Record<string, unknown> = { prompt: req.prompt };
    if (req.aspectRatio) body.aspect_ratio = req.aspectRatio;
    if (req.resolution) body.resolution = req.resolution;
    if (req.durationSec) body.duration = req.durationSec;
    if (req.seed) body.seed = req.seed;
    if (req.imageUrls?.length) {
      // Single-reference models take a scalar; multi-reference take the array.
      body.image_url = req.imageUrls[0];
      if (req.imageUrls.length > 1) body.image_urls = req.imageUrls;
    }
    if (req.videoUrl) body.video_url = req.videoUrl;

    const url = req.webhookUrl
      ? `${endpoint}?hf_webhook=${encodeURIComponent(req.webhookUrl)}`
      : endpoint;

    const json = await this.call<HiggsfieldSubmitResponse>(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!json.request_id) {
      throw new ProviderError("Higgsfield did not return a request_id");
    }

    return {
      jobId: json.request_id,
      status: normaliseStatus(json.status ?? "queued"),
    };
  }

  async getStatus(jobId: string): Promise<JobState> {
    const json = await this.call<HiggsfieldStatusResponse>(
      `requests/${encodeURIComponent(jobId)}/status`,
      { method: "GET" },
    );

    const status = normaliseStatus(json.status ?? "running");
    const { url, contentType } = extractOutput(json);

    return {
      jobId,
      status,
      outputUrl: status === "succeeded" ? url : undefined,
      contentType,
      error:
        json.error ??
        (status === "rejected"
          ? "Output was withheld by the safety filter"
          : undefined),
    };
  }

  async cancel(jobId: string): Promise<void> {
    await this.call(`requests/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
    });
  }
}

export const higgsfield = new HiggsfieldProvider();

export function isHiggsfieldConfigured(): boolean {
  return Boolean(
    process.env.HIGGSFIELD_API_KEY_ID && process.env.HIGGSFIELD_API_KEY_SECRET,
  );
}
