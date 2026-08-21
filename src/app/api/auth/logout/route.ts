import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { destroyCurrentSession } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = route(async () => {
  await destroyCurrentSession();
  return NextResponse.json({ ok: true });
});
