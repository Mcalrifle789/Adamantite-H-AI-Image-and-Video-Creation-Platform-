import type { ModelDef } from "../models";

/**
 * Provider-agnostic generation interface.
 *
 * Everything above this layer speaks in `SubmitRequest` / `JobState` and never
 * touches a vendor SDK, so swapping or adding a provider (fal.ai, Replicate)
 * means writing one more implementation of `GenerationProvider` rather than
 * touching the studio, the credit ledger or the API routes.
 */

export interface SubmitRequest {
  model: ModelDef;
  prompt: string;
  /** Public URLs of reference inputs, already uploaded to provider storage. */
  imageUrls?: string[];
  videoUrl?: string;
  aspectRatio?: string;
  resolution?: string;
  durationSec?: number;
  seed?: string;
  /** Absolute HTTPS URL the provider should notify on completion. */
  webhookUrl?: string;
}

export interface SubmitResult {
  /** Provider-side job identifier, persisted on the Generation row. */
  jobId: string;
  status: JobStatus;
}

export type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled"
  | "rejected";

export interface JobState {
  jobId: string;
  status: JobStatus;
  /** Present once the job succeeds. */
  outputUrl?: string;
  contentType?: string;
  error?: string;
}

export interface GenerationProvider {
  readonly id: string;
  submit(req: SubmitRequest): Promise<SubmitResult>;
  /** Authoritative status read. Never trust a webhook body over this. */
  getStatus(jobId: string): Promise<JobState>;
  cancel(jobId: string): Promise<void>;
}

/** Raised for provider faults so routes can map them to a 502 rather than a 500. */
export class ProviderError extends Error {
  status = 502;
  constructor(
    message: string,
    readonly providerStatus?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export class ProviderNotConfiguredError extends Error {
  status = 503;
  constructor(providerId: string) {
    super(`Provider "${providerId}" is missing credentials`);
    this.name = "ProviderNotConfiguredError";
  }
}
