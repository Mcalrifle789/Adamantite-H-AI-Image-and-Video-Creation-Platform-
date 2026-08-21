"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

/**
 * Page-view beacon.
 *
 * Fires on every App Router navigation, not just the first load, because a
 * client-side route change never hits the server and would otherwise be
 * invisible. The closing beacon uses sendBeacon so time-on-page survives the
 * tab being closed, which a fetch would not.
 *
 * The only client-side identifier is a random id in sessionStorage. It dies
 * with the tab, is never sent cross-site and is not a cookie - so this adds
 * nothing that needs a consent banner.
 */

const CLIENT_ID_KEY = "adm_aid";

function clientId(): string {
  try {
    const existing = sessionStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const fresh =
      globalThis.crypto?.randomUUID?.() ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(CLIENT_ID_KEY, fresh);
    return fresh;
  } catch {
    // Private mode with storage disabled: still count the view, just without
    // being able to tie it to the rest of the visit.
    return "ephemeral";
  }
}

function Beacon() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Guards against React 18+ double-invoking effects in development.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const key = `${pathname}?${searchParams?.toString() ?? ""}`;
    if (lastSent.current === key) return;
    lastSent.current = key;

    const id = clientId();
    const openedAt = Date.now();
    let viewId: string | null = null;
    let closed = false;

    void fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        query: searchParams?.toString() ?? "",
        referrer: document.referrer || null,
        clientId: id,
      }),
      keepalive: true,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { viewId?: string } | null) => {
        viewId = data?.viewId ?? null;
      })
      .catch(() => {
        // A blocked or failed beacon must never surface to the visitor.
      });

    const close = () => {
      if (closed || !viewId) return;
      closed = true;
      const payload = JSON.stringify({
        path: pathname,
        clientId: id,
        viewId,
        durationMs: Date.now() - openedAt,
      });
      try {
        navigator.sendBeacon?.(
          "/api/analytics/collect",
          new Blob([payload], { type: "application/json" }),
        );
      } catch {
        /* nothing useful to do if the browser refuses */
      }
    };

    // pagehide covers the bfcache and mobile Safari, where unload never fires.
    const onHide = () => {
      if (document.visibilityState === "hidden") close();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", close);

    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", close);
      close();
    };
  }, [pathname, searchParams]);

  return null;
}

export default function Analytics() {
  // useSearchParams needs a Suspense boundary or it opts whole routes out of
  // static rendering.
  return (
    <Suspense fallback={null}>
      <Beacon />
    </Suspense>
  );
}
