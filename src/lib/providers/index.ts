import "server-only";

import type { ModelDef } from "../models";
import { higgsfield } from "./higgsfield";
import type { GenerationProvider } from "./types";

const REGISTRY: Record<string, GenerationProvider> = {
  higgsfield,
};

export function providerFor(model: ModelDef): GenerationProvider {
  const provider = REGISTRY[model.provider];
  if (!provider) {
    throw new Error(`No adapter registered for provider "${model.provider}"`);
  }
  return provider;
}

export function providerById(id: string): GenerationProvider | undefined {
  return REGISTRY[id];
}

export * from "./types";
