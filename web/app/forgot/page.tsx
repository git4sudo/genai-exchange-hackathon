"use client";

import { useState } from "react";
import Link from "next/link";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function policy(pw: string) {
  return {
    ok:
      pw.length >= 8 &&
      /[a-z]/.test(pw) &&
      /[A-Z]/.test(pw) &&
      /[0-9]/.test(pw) &&
      /[!@#$%^&*()[\]{}\-_=+,.?;:<>|/~`]/.test(pw),
    rules: [
      { ok: pw.length >= 8, label: "At least 8 characters" },
      { ok: /[a-z]/.test(pw), label: "At least one lowercase letter" },
      { ok: /[A-Z]/.test(pw), label: "At least one uppercase letter" },
      { ok: /[0-9]/.test(pw), label: "At least one number" },
      { ok: /[!@#$%^&*()[\]{}\-_=+,.?;:<>|/~`]/.test(pw), label: "At least one special character" },
    ],
  };
}

export default function ForgotPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const emailValid = EMAIL_RE.test(email.trim());

  const [token, setToken] = useState("");
  const [otp, setOtp] = useState("");

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const pol = policy(pw1);
  const canSave = pol.ok && pw1 === pw2;

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const sendCode = async () => {
    try {
      setBusy(true);
      setMsg("");
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error === "not_found" ? "No account exists with that email." : "Could not send code.");
        return;
      }
      setToken(data.token);
      setMsg("We sent a 6-digit code to your email. It expires in 10 minutes.");
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    try {
      setBusy(true);
      setMsg("");
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error === "expired" ? "Code expired. Request a new one." : "Invalid code. Try again.");
        return;
      }
      setStep(3);
      setMsg("");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    try {
      setBusy(true);
      setMsg("");
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: email.trim().toLowerCase(),
          newPassword: pw1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(
          data?.error === "weak_password"
            ? "Please satisfy all password requirements."
            : "Could not change password."
        );
        return;
      }
      setMsg("Password changed. You can now sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        {/* Darker, more legible heading */}
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
          Reset your password
        </h1>

        {/* Slightly darker body text */}
        <p className="text-sm text-slate-700 mb-6">
          Enter your account email, verify the code, then set a new password.
        </p>

        {step === 1 && (
          <div className="space-y-4">
            {/* Darker label */}
            <label className="block text-sm font-medium text-gray-800">Email</label>

            {/* Input with visible text color & placeholder */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))}
              placeholder="you@example.com"
              className={`w-full rounded-md p-2.5 border text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                email && !emailValid
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:ring-indigo-300"
              }`}
            />

            <button
              onClick={sendCode}
              disabled={!emailValid || busy}
              className="w-full rounded-md bg-indigo-600 text-white py-2 font-semibold disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-sm text-slate-700">
              Enter the 6-digit code we emailed to <b className="text-gray-900">{email}</b>.
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full rounded-md border border-slate-300 p-2.5 text-center tracking-widest text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              onClick={verify}
              disabled={otp.length < 6 || busy}
              className="w-full rounded-md bg-indigo-600 text-white py-2 font-semibold disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Verify code"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800">
                New password
              </label>
              <input
                type="password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-slate-300 p-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800">
                Confirm password
              </label>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-slate-300 p-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {pw2 && pw1 !== pw2 && (
                <div className="mt-1 text-xs text-red-600">Passwords do not match.</div>
              )}
            </div>

            <ul className="text-xs space-y-1">
              {policy(pw1).rules.map((r) => (
                <li key={r.label} className={r.ok ? "text-emerald-700" : "text-slate-600"}>
                  {r.ok ? "✓" : "•"} {r.label}
                </li>
              ))}
            </ul>

            <button
              onClick={resetPassword}
              disabled={!canSave || busy}
              className="w-full rounded-md bg-indigo-600 text-white py-2 font-semibold disabled:opacity-60"
            >
              {busy ? "Saving…" : "Change password"}
            </button>
          </div>
        )}

        {msg && <div className="mt-4 text-sm text-slate-800">{msg}</div>}

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="text-indigo-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
