"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/initFirebase";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function LoginPage() {
  const router = useRouter();
  const [user, loadingAuth] = useAuthState(auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const emailValid = EMAIL_RE.test(email.trim());
  const [showPw, setShowPw] = useState(false);

  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // If already signed in, send to Home (marketing/overview) first
  useEffect(() => {
    if (!loadingAuth && user) router.replace("/home");
  }, [user, loadingAuth, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!emailValid) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/home");
    } catch (err: any) {
      setError(err?.message || "Failed to sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.replace("/home");
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed.");
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingAuth)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        Loading…
      </div>
    );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-[95%] max-w-md rounded-3xl bg-white p-8 shadow-2xl"
      >
        <h1 className="mb-2 text-center text-3xl font-extrabold text-gray-800">
          Welcome Back 👋
        </h1>
        <p className="mb-6 text-center text-gray-500">
          Login to access your AI Testcase Dashboard
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-center text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-600">
              <FaEnvelope className="mr-2 inline-block" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value.replace(/\s/g, "")) // strip spaces
              }
              placeholder="name@example.com"
              className={`w-full rounded-md border p-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                email && !emailValid
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-indigo-300"
              }`}
              required
            />
            {email && !emailValid && (
              <p className="mt-1 text-xs text-red-600">
                Enter a valid email address.
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label className="text-sm font-bold text-gray-600">
                <FaLock className="mr-2 inline-block" />
                Password
              </label>
              <Link
                href="/forgot"
                className="text-xs text-indigo-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-gray-300 p-2.5 pr-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !emailValid}
            className={`w-full rounded-md py-2.5 font-semibold text-white transition-all ${
              isLoading || !emailValid
                ? "cursor-not-allowed bg-indigo-300"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isLoading ? "Signing In…" : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center justify-center gap-2">
          <div className="h-px w-1/3 bg-gray-300" />
          <span className="text-sm text-gray-500">OR</span>
          <div className="h-px w-1/3 bg-gray-300" />
        </div>

        {/* Google Sign-in */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 py-2.5 hover:bg-gray-50 transition-all disabled:opacity-60"
        >
          <FcGoogle className="text-xl" />
          <span className="font-medium text-gray-700">Continue with Google</span>
        </button>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don’t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-indigo-600 hover:underline"
          >
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
