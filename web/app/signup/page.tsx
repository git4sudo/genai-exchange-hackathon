"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/initFirebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
// ≥8, one lower, one upper, one number, one special
const PASS_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const emailValid = EMAIL_RE.test(email.trim());
  const passValid = PASS_RE.test(password);
  const confirmValid = confirmPassword === password && password.length > 0;

  const formValid = useMemo(
    () => emailValid && passValid && confirmValid && !loading,
    [emailValid, passValid, confirmValid, loading]
  );

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailTouched(true);
    setPasswordTouched(true);
    setConfirmTouched(true);

    if (!formValid) return;

    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  // convenience for the checklist UI
  const rule = {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  return (
    <div className="flex h-screen bg-gradient-to-r from-green-50 to-green-100">
      {/* Left Section - Branding */}
      <div className="hidden lg:flex w-1/2 bg-green-600 text-white flex-col justify-center items-center p-10">
        <h1 className="text-4xl font-extrabold mb-4">Orbit AI</h1>
        <p className="text-lg text-green-100 text-center max-w-md">
          Empower your healthcare testing with AI-driven test case generation,
          integrated directly with Jira and Azure.
        </p>
      </div>

      {/* Right Section - Signup Form */}
      <div className="flex flex-1 justify-center items-center">
        <div className="bg-white shadow-lg rounded-2xl p-10 w-full max-w-md">
          <h2 className="text-3xl font-semibold text-center text-gray-800 mb-6">
            Create an Account
          </h2>

          {error && (
            <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`w-full rounded-md p-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  emailTouched && !emailValid
                    ? "border border-red-500 focus:ring-red-500"
                    : "border border-black focus:ring-black"
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))}
                onBlur={() => setEmailTouched(true)}
                aria-invalid={emailTouched && !emailValid}
                aria-describedby="email-help"
                required
              />
              {emailTouched && !emailValid && (
                <p id="email-help" className="mt-1 text-xs text-red-600">
                  Enter a valid email like <span className="font-medium">name@example.com</span>.
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}"
                title="Min 8 chars, 1 lowercase, 1 uppercase, 1 number, 1 special"
                className={`w-full rounded-md p-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  passwordTouched && !passValid
                    ? "border border-red-500 focus:ring-red-500"
                    : "border border-black focus:ring-black"
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                aria-invalid={passwordTouched && !passValid}
                aria-describedby="password-rules"
                required
              />
              {/* Password rules checklist */}
              <ul id="password-rules" className="mt-2 space-y-1 text-xs">
                <li className={rule.length ? "text-green-600" : "text-gray-500"}>
                  • At least 8 characters
                </li>
                <li className={rule.lower ? "text-green-600" : "text-gray-500"}>
                  • At least one lowercase letter
                </li>
                <li className={rule.upper ? "text-green-600" : "text-gray-500"}>
                  • At least one uppercase letter
                </li>
                <li className={rule.number ? "text-green-600" : "text-gray-500"}>
                  • At least one number
                </li>
                <li className={rule.special ? "text-green-600" : "text-gray-500"}>
                  • At least one special character
                </li>
              </ul>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                className={`w-full rounded-md p-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  confirmTouched && !confirmValid
                    ? "border border-red-500 focus:ring-red-500"
                    : "border border-black focus:ring-black"
                }`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setConfirmTouched(true)}
                aria-invalid={confirmTouched && !confirmValid}
              />
              {confirmTouched && !confirmValid && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!formValid}
              className={`w-full py-2 rounded-md text-white font-medium transition-all ${
                !formValid
                  ? "bg-green-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          <p className="text-sm text-gray-600 text-center mt-4">
            Already have an account?{" "}
            <a href="/login" className="text-green-600 font-medium hover:underline">
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
