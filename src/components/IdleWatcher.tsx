"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Client half of the one-hour idle logout.
 *
 * The server is what actually enforces the timeout - `getCurrentUser` revokes
 * any session whose `lastSeenAt` is over an hour old, so a tampered client
 * gains nothing. This exists so an idle tab does not sit there looking signed
 * in: it notices the deadline locally and, just as importantly, revalidates
 * with the server whenever the tab is refocused after being away.
 */

const IDLE_LIMIT_MS = 60 * 60 * 1000;

/** Re-arm on real interaction only; scroll and mousemove would never expire. */
const ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "pointerdown",
  "submit",
] as const satisfies readonly (keyof DocumentEventMap)[];

export default function IdleWatcher() {
  const router = useRouter();
  // Seeded inside the effect: reading the clock during render is impure and
  // would differ between the server and client passes.
  const lastActive = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    lastActive.current = Date.now();

    const expire = async () => {
      await fetch("/api/auth/logout", { method: "POST" }).catch(
        () => undefined,
      );
      router.push("/login?reason=idle");
      router.refresh();
    };

    const arm = () => {
      clearTimeout(timer);
      const remaining = IDLE_LIMIT_MS - (Date.now() - lastActive.current);
      timer = setTimeout(expire, Math.max(remaining, 0));
    };

    const onActivity = () => {
      lastActive.current = Date.now();
      arm();
    };

    /*
     * Timers do not fire reliably in a backgrounded tab, and the machine may
     * have been asleep, so returning to the tab compares wall-clock time and
     * then asks the server whether the session survived.
     */
    const onVisible = async () => {
      if (document.hidden) return;
      if (Date.now() - lastActive.current >= IDLE_LIMIT_MS) {
        await expire();
        return;
      }
      const res = await fetch("/api/auth/session").catch(() => null);
      const body = await res?.json().catch(() => null);
      if (res?.ok && body && body.user === null) {
        router.push("/login?reason=idle");
        router.refresh();
      }
      arm();
    };

    for (const evt of ACTIVITY_EVENTS) {
      document.addEventListener(evt, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisible);
    arm();

    return () => {
      clearTimeout(timer);
      for (const evt of ACTIVITY_EVENTS) {
        document.removeEventListener(evt, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
