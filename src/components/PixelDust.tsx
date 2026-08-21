"use client";

import { useEffect, useRef } from "react";

/**
 * The pixel-dust field from the mockups.
 *
 * Canvas rather than DOM nodes or a GIF: a few thousand independently twinkling
 * squares would be thousands of composited layers as divs, and a video loop
 * cannot adapt to the viewport. Hue is a function of horizontal position -
 * green at the left edge, crimson through the middle, blue at the right - and
 * density falls off toward the centre so the logotype stays legible.
 *
 * The loop stops entirely when the tab is hidden or when the visitor has asked
 * for reduced motion, in which case a single static frame is painted instead.
 */

interface Mote {
  x: number;
  y: number;
  size: number;
  /** Phase and speed of the twinkle, so motes do not blink in lockstep. */
  phase: number;
  speed: number;
  drift: number;
  baseAlpha: number;
}

const DENSITY = 0.00022; // motes per css pixel of area
const MAX_MOTES = 2600;

function hueAt(t: number): [number, number, number] {
  // t is 0 at the left edge, 1 at the right.
  const green: [number, number, number] = [18, 179, 74];
  const crimson: [number, number, number] = [225, 18, 31];
  const blue: [number, number, number] = [27, 47, 203];

  const [from, to, local] =
    t < 0.5
      ? [green, crimson, t / 0.5]
      : [crimson, blue, (t - 0.5) / 0.5];

  // Ease so the crimson core occupies more of the width than a linear ramp.
  const e = local * local * (3 - 2 * local);
  return [
    Math.round(from[0] + (to[0] - from[0]) * e),
    Math.round(from[1] + (to[1] - from[1]) * e),
    Math.round(from[2] + (to[2] - from[2]) * e),
  ];
}

export default function PixelDust({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let motes: Mote[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let running = true;

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(MAX_MOTES, Math.floor(width * height * DENSITY));
      motes = Array.from({ length: count }, () => {
        const x = Math.random();
        // Bias toward the edges: the mockup is dense at the rim, sparse mid-frame.
        const edgeBias = Math.abs(x - 0.5) * 2;
        return {
          x: x * width,
          y: Math.random() * height,
          size: 1 + Math.random() * (edgeBias > 0.6 ? 5 : 3),
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.1,
          drift: (Math.random() - 0.5) * 0.06,
          baseAlpha: 0.08 + edgeBias * 0.5 + Math.random() * 0.22,
        };
      });
    };

    const paint = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      for (const m of motes) {
        const twinkle = reduceMotion
          ? 0.7
          : 0.45 + 0.55 * Math.sin(m.phase + (time / 1000) * m.speed);
        const alpha = Math.max(0, m.baseAlpha * twinkle);
        if (alpha < 0.01) continue;

        const [r, g, b] = hueAt(m.x / Math.max(width, 1));
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        // Whole-pixel coordinates keep the squares crisp instead of blurred.
        ctx.fillRect(Math.round(m.x), Math.round(m.y), m.size, m.size);
      }
    };

    const frame = (time: number) => {
      if (!running) return;
      for (const m of motes) {
        m.y += m.drift;
        if (m.y < -6) m.y = height + 6;
        else if (m.y > height + 6) m.y = -6;
      }
      paint(time);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (reduceMotion) {
        paint(0);
        return;
      }
      running = true;
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onResize = () => {
      stop();
      build();
      start();
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    build();
    start();

    const observer = new ResizeObserver(onResize);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? "pointer-events-none absolute inset-0 h-full w-full"}
    />
  );
}
