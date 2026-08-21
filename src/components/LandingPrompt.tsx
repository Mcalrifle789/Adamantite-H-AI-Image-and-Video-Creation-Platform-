"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The glowing prompt bar from the mockup.
 *
 * It does not generate here. Submitting carries the prompt into the studio,
 * or to registration first for signed-out visitors, with the prompt preserved
 * through the round trip so nothing typed is lost.
 */
export default function LandingPrompt({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = prompt.trim();
    const target = signedIn ? "/studio" : "/register";
    const query = trimmed ? `?prompt=${encodeURIComponent(trimmed)}` : "";
    router.push(`${target}${query}`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 w-full max-w-3xl">
      <label htmlFor="landing-prompt" className="sr-only">
        Describe what you want to create
      </label>
      <div className="hud flex items-center gap-3 p-2 pl-5">
        <input
          id="landing-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="let's create something..."
          autoComplete="off"
          className="font-sans text-chrome placeholder:text-chrome-faint min-w-0 flex-1 bg-transparent py-3 text-base italic outline-none"
        />
        <button
          type="submit"
          className="btn-primary shrink-0 rounded-md px-5 py-3 text-sm font-semibold"
        >
          {signedIn ? "Open studio" : "Start creating"}
        </button>
      </div>
    </form>
  );
}
