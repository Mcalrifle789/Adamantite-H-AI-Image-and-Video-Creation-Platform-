import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "./auth";
import { InsufficientCreditsError } from "./credits";
import { ProviderError, ProviderNotConfiguredError } from "./providers/types";

/**
 * Single place where thrown errors become HTTP responses, so routes can just
 * `throw` and stay readable. Anything unrecognised is logged server-side and
 * returned as a bare 500 rather than leaking a stack trace to the client.
 */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid request",
        fields: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }

  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  if (err instanceof InsufficientCreditsError) {
    return NextResponse.json(
      {
        error: "Not enough credits for that generation",
        required: err.required,
        remaining: err.remaining,
      },
      { status: 402 },
    );
  }

  if (err instanceof ProviderNotConfiguredError) {
    return NextResponse.json(
      { error: "Generation is not configured on this deployment" },
      { status: 503 },
    );
  }

  if (err instanceof ProviderError) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  console.error("Unhandled API error:", err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Wraps a route handler so every throw funnels through toErrorResponse. */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** Best-effort client IP, for the session audit trail only. */
export function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip");
}
