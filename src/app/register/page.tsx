import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import OAuthButtons from "@/components/OAuthButtons";
import Logo from "@/components/Logo";
import PixelDust from "@/components/PixelDust";
import SiteFooter from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Register",
  description: "Create an Adamantite H account and start generating.",
};

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/studio");

  return (
    <>
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16">
        <PixelDust className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(5,5,7,0.94)_0%,rgba(5,5,7,0.6)_50%,transparent_80%)]"
        />

        <div className="mb-10">
          <Logo size="lg" />
        </div>

        <Suspense fallback={<div className="hud h-96 w-full max-w-md" />}>
          <AuthForm
            mode="register"
            providers={<OAuthButtons mode="register" />}
          />
        </Suspense>
      </main>

      <SiteFooter />
    </>
  );
}
