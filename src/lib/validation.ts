import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email("Enter a valid email address");

/**
 * Length is the only hard rule. Composition rules (a digit, a symbol) push
 * people toward predictable substitutions without adding real entropy, so the
 * floor is raised to 10 characters instead.
 */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(200, "That password is too long");

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter your name")
    .max(60, "That name is too long"),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name the project").max(80).default("Untitled"),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  trashed: z.boolean().optional(),
});

export const generateSchema = z.object({
  projectId: z.string().min(1),
  modelId: z.string().min(1),
  prompt: z.string().trim().min(1, "Write a prompt").max(4000),
  aspectRatio: z
    .enum(["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"])
    .default("1:1"),
  resolution: z.enum(["480p", "720p", "1080p", "4k"]).default("720p"),
  durationSec: z.number().int().min(1).max(30).optional(),
  seed: z.string().max(64).optional(),
  /** Set when this run edits an existing generation from the chat. */
  parentId: z.string().optional(),
});

export const checkoutSchema = z.object({
  plan: z.enum(["PORT", "STANDARD", "PRO", "MAX"]),
});
