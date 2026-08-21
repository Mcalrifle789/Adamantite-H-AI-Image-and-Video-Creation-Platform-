import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getCreditState } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lets client components re-check the session after the idle timeout fires.
export const GET = route(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null, credits: null });
  const credits = await getCreditState(user.id);
  return NextResponse.json({ user, credits });
});
