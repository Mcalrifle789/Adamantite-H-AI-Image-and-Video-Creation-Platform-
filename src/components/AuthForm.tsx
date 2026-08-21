"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface FieldError {
  path: string;
  message: string;
}

/**
 * Shared login / registration form.
 *
 * Field-level errors from the API's zod issues are surfaced next to the input
 * they belong to; anything else becomes a single form-level alert.
 */
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const isRegister = mode === "register";

  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  const errorFor = (path: string) =>
    fieldErrors.find((f) => f.path === path)?.message;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setFormError(null);
    setFieldErrors([]);

    const data = new FormData(e.currentTarget);
    const payload = isRegister
      ? {
          displayName: String(data.get("displayName") ?? ""),
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        }
      : {
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        };

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();

      if (!res.ok) {
        if (Array.isArray(body.fields)) setFieldErrors(body.fields);
        setFormError(body.error ?? "Something went wrong");
        setPending(false);
        return;
      }

      // Carry intent through the sign-in: a chosen plan resumes at checkout, a
      // typed prompt resumes in the studio.
      const plan = params.get("plan");
      const prompt = params.get("prompt");
      const next = plan
        ? `/pricing?plan=${plan}`
        : prompt
          ? `/studio?prompt=${encodeURIComponent(prompt)}`
          : "/studio";

      router.push(next);
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="hud w-full max-w-md p-8" noValidate>
      <h1 className="font-display text-chrome text-3xl">
        {isRegister ? "Create your account" : "Welcome back"}
      </h1>
      <p className="text-chrome-dim mt-2 text-sm">
        {isRegister
          ? "Free credits to start. No card needed until you pick a plan."
          : "Sign in to pick up where your projects left off."}
      </p>

      {formError ? (
        <p
          role="alert"
          className="border-crimson-500/60 bg-crimson-900/40 text-crimson-200 mt-5 rounded-md border px-3 py-2 text-sm"
        >
          {formError}
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        {isRegister ? (
          <Field
            label="Name"
            name="displayName"
            type="text"
            autoComplete="name"
            error={errorFor("displayName")}
            required
          />
        ) : null}

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          error={errorFor("email")}
          required
        />

        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          error={errorFor("password")}
          hint={isRegister ? "At least 10 characters." : undefined}
          required
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary mt-7 w-full rounded-md px-4 py-3 text-sm font-semibold"
      >
        {pending
          ? isRegister
            ? "Creating account…"
            : "Signing in…"
          : isRegister
            ? "Create account"
            : "Sign in"}
      </button>

      {/*
        Consent by registration rather than a checkbox: the terms are what a
        paid account is granted under, so they have to be reachable from the
        point of signing up rather than only from the footer.
      */}
      {isRegister ? (
        <p className="text-chrome-faint mt-4 text-center text-xs leading-relaxed">
          Creating an account means you accept the{" "}
          <Link
            href="/terms"
            className="text-chrome-dim hover:text-crimson-300 underline underline-offset-2"
          >
            Terms of Service
          </Link>{" "}
          and the{" "}
          <Link
            href="/privacy"
            className="text-chrome-dim hover:text-crimson-300 underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </p>
      ) : null}

      <p className="text-chrome-dim mt-5 text-center text-sm">
        {isRegister ? "Already have an account? " : "New here? "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="text-crimson-400 hover:text-crimson-300 font-semibold"
        >
          {isRegister ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  error,
  hint,
  required,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const id = `field-${name}`;
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label
        htmlFor={id}
        className="text-chrome-dim mb-1.5 block text-xs font-semibold tracking-wider font-label uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="field w-full rounded-md px-3 py-2.5 text-sm"
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-chrome-faint mt-1 text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-crimson-300 mt-1 text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
