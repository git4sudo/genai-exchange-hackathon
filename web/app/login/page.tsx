"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/initFirebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";
import { FaEnvelope, FaLock } from "react-icons/fa";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        Loading...
      </div>
    );

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white shadow-2xl rounded-3xl p-10 w-[95%] max-w-md"
      >
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-6">
          Welcome Back 👋
        </h1>
        <p className="text-center text-gray-500 mb-6">
          Login to access your AI Testcase Dashboard
        </p>

        {error && (
          <div className="bg-red-100 text-red-600 p-2 rounded-md text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-600 text-sm font-bold mb-2">
              <FaEnvelope className="mr-2 inline-block" />
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full border border-black rounded-md p-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-black focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-600 text-sm font-bold mb-2">
              <FaLock className="mr-2 inline-block"/>Password</label>
              <input
              type="password"
              placeholder="••••••••"
              className="w-full border border-black rounded-md p-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-black focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 rounded-md text-white font-semibold transition-all duration-200 ${
              isLoading
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="my-6 flex items-center justify-center gap-2">
          <div className="h-px w-1/3 bg-gray-300"></div>
          <span className="text-gray-500 text-sm">OR</span>
          <div className="h-px w-1/3 bg-gray-300"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 py-2.5 rounded-md hover:bg-gray-50 transition-all"
        >
          <FcGoogle className="text-xl" />
          <span className="text-gray-700 font-medium">
            Continue with Google
          </span>
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don’t have an account?{" "}
          <a
            href="/signup"
            className="text-indigo-600 font-semibold hover:underline"
          >
            Create one
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default LoginPage;
