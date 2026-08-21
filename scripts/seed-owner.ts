/**
 * Creates or promotes the owner account.
 *
 * Registration bootstraps the owner automatically, but only for whoever happens
 * to sign up first. This makes it deliberate, and works against production too:
 *
 *   npm run seed:owner -- --email you@example.com
 *   npm run seed:owner -- --email you@example.com --password 'correct horse'
 *
 * With no --password a strong one is generated and printed once. Re-running is
 * safe: an existing account is promoted to OWNER and only has its password
 * changed if --password was actually supplied.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

/** Readable but high-entropy: ~93 bits over this alphabet at 16 characters. */
function generatePassword(): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function main() {
  const email = (arg("email") ?? process.env.OWNER_EMAIL ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    console.error(
      "Need an email. Pass --email you@example.com or set OWNER_EMAIL.",
    );
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const explicitPassword = arg("password");
  const displayName = arg("name") ?? email.split("@")[0]!;

  try {
    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true, role: true, passwordHash: true },
    });

    if (existing) {
      const password = explicitPassword;
      await db.user.update({
        where: { id: existing.id },
        data: {
          role: "OWNER",
          ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
        },
      });
      console.log(`Promoted existing account ${email} to OWNER.`);
      if (password) console.log("Password updated.");
      else if (!existing.passwordHash) {
        console.log(
          "Note: this account has no password and can only sign in through Google or Microsoft.",
        );
      }
      return;
    }

    const password = explicitPassword ?? generatePassword();
    await db.user.create({
      data: {
        email,
        displayName,
        passwordHash: await bcrypt.hash(password, 12),
        role: "OWNER",
      },
    });

    console.log(`Created OWNER account.`);
    console.log(`  email:    ${email}`);
    console.log(`  password: ${password}`);
    if (!explicitPassword) {
      console.log("\nThis is the only time that password is shown. Save it.");
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
