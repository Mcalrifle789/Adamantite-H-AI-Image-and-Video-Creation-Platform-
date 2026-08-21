"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    startTransition(() => {
      router.push("/");
      // The header is a server component, so the cache has to be dropped for
      // the signed-out state to render.
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="btn-ghost rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
