"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PaidPlanId } from "@/lib/plans";

/**
 * Starts a Stripe Checkout session. Signed-out visitors are sent to register
 * first, with the chosen plan carried through so they land back on checkout.
 */
export default function CheckoutButton({
  plan,
  planName,
  signedIn,
  isCurrent,
}: {
  plan: PaidPlanId;
  planName: string;
  signedIn: boolean;
  isCurrent: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!signedIn) {
      router.push(`/register?plan=${plan}`);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setPending(false);
    }
  }

  if (isCurrent) {
    return (
      <p className="border-crimson-500/50 text-crimson-300 rounded-md border px-4 py-2.5 text-center text-sm font-semibold">
        Your current plan
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="btn-primary w-full rounded-md px-4 py-2.5 text-sm font-semibold"
      >
        {pending ? "Opening checkout…" : `Choose ${planName}`}
      </button>
      {error ? (
        <p role="alert" className="text-crimson-300 mt-2 text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
