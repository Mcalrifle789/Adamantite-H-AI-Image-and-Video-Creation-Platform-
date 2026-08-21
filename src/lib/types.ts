/**
 * Wire types shared by the API routes and the client components.
 *
 * Deliberately hand-written rather than re-exported from the Prisma client:
 * importing generated model types into a client component would pull the query
 * engine into the browser bundle. Dates cross the wire as ISO strings.
 */

export type MediaKind = "IMAGE" | "VIDEO";

export type GenerationStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  trashedAt: string | null;
  generationCount: number;
}

export interface GenerationDTO {
  id: string;
  kind: MediaKind;
  modelId: string;
  prompt: string;
  status: GenerationStatus;
  outputUrl: string | null;
  error: string | null;
  creditsCharged: number;
  createdAt: string;
  parentId: string | null;
}

export interface CreditsDTO {
  plan: string;
  granted: number;
  spent: number;
  remaining: number;
}

export function isPending(status: GenerationStatus): boolean {
  return status === "QUEUED" || status === "RUNNING";
}
