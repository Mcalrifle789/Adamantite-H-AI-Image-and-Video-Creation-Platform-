import { NextResponse } from "next/server";
import { clientIp, HttpError, route } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { track } from "@/lib/analytics";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const POST = route(async (req: Request) => {
  const { displayName, email, password } = registerSchema.parse(
    await req.json(),
  );

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    throw new HttpError(409, "An account with that email already exists");
  }

  /*
   * The first account to register becomes the owner. The spec gives the owner a
   * console listing every account, and there is no other bootstrap path into
   * that role; subsequent accounts are ordinary users. Seeding OWNER_EMAIL also
   * grants the role, which is what a real deployment should use.
   */
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const userCount = await db.user.count();
  const isOwner = userCount === 0 || (!!ownerEmail && ownerEmail === email);

  const user = await db.user.create({
    data: {
      email,
      displayName,
      passwordHash: await hashPassword(password),
      role: isOwner ? "OWNER" : "USER",
    },
    select: { id: true, email: true, displayName: true, role: true },
  });

  await createSession(user.id, {
    userAgent: req.headers.get("user-agent"),
    ip: clientIp(req),
  });

  await track("signup", { userId: user.id, meta: { method: "password" } });

  return NextResponse.json({ user }, { status: 201 });
});
