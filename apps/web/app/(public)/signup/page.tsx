import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthFrame } from "@/components/auth-frame";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <AuthFrame>
      <Suspense><AuthForm mode="signup" /></Suspense>
    </AuthFrame>
  );
}
