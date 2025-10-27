"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase/initFirebase";
import {
  FiZap,
  FiFileText,
  FiGitBranch,
  FiDownloadCloud,
  FiShield,
  FiCpu,
} from "react-icons/fi";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();

  // redirect safely (not in render)
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => {
    if (!loading && !user) {
      setRedirecting(true);
      router.replace("/login");
    }
  }, [loading, user, router]);

  const logout = async () => {
    await auth.signOut();
    // no router.replace() here; the effect above will navigate
  };

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`px-3 py-2 rounded-md text-sm font-medium ${
          active
            ? "text-emerald-700 bg-emerald-50"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`}
      >
        {label}
      </Link>
    );
  };

  // keep UI calm while auth is resolving or redirecting
  if (loading || redirecting) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-slate-600">
        Loading…
      </div>
    );
  }
  // if unauthenticated and redirect not finished yet, render nothing
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-slate-800">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-14 items-center gap-3">
            <Link href="/home" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-emerald-600 text-white grid place-items-center text-sm font-bold">
                O
              </div>
              <span className="font-semibold text-slate-900">Orbit AI</span>
            </Link>

            <div className="ml-6 hidden md:flex items-center gap-1">
              <NavLink href="/home" label="Home" />
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/profile" label="Profile" />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span className="hidden sm:block text-sm text-slate-600">
                Signed in as{" "}
                <span className="font-medium text-slate-800">{user.email}</span>
              </span>
              <Link
                href="/dashboard"
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Go to Dashboard
              </Link>
              <button
                onClick={logout}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO (bright) */}
      <header className="mx-auto max-w-7xl px-4 pt-12 pb-10">
        <div className="grid gap-8 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-white/95 ring-1 ring-slate-200 shadow-xl p-8">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                AI-driven Test Case Generation for Healthcare Teams
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                Turn requirements into comprehensive, traceable test cases.
                Upload documents, generate from free text, export JSON/CSV, and
                push to Jira or Azure DevOps — all in a few clicks.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-emerald-600 px-5 py-3 text-white font-medium shadow-sm hover:bg-emerald-700"
                >
                  Try the Generator
                </Link>
                <a
                  href="#how-it-works"
                  className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-slate-700 hover:bg-slate-50"
                >
                  How it works
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-xl p-6">
              <div className="text-sm text-slate-600 mb-3 font-medium">
                What you’ll get
              </div>
              <div className="grid gap-3">
                <PreviewRow
                  icon={<FiZap />}
                  title="Generate from text"
                  desc="Paste a requirement; get structured steps & expected results."
                />
                <PreviewRow
                  icon={<FiFileText />}
                  title="Upload documents"
                  desc="PDF, DOCX, TXT, Markdown supported."
                />
                <PreviewRow
                  icon={<FiGitBranch />}
                  title="Traceability"
                  desc="REQ ↔ TEST links and severity metadata."
                />
                <PreviewRow
                  icon={<FiDownloadCloud />}
                  title="Push & Export"
                  desc="Send to Jira/Azure or export JSON/CSV."
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-xl font-semibold">Why Orbit AI?</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            icon={<FiCpu />}
            title="LLM-powered analysis"
            text="Purpose-built prompts and heuristics turn ambiguous requirements into actionable steps and expected results."
          />
          <InfoCard
            icon={<FiShield />}
            title="Security-minded by design"
            text="No PHI in inputs. Data boundaries and minimized retention. Export locally if preferred."
          />
          <InfoCard
            icon={<FiGitBranch />}
            title="Integrates with your stack"
            text="Jira and Azure DevOps out-of-the-box. Export/import easily."
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-xl font-semibold">How it works</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
          {[
            ["1. Add requirements", "Paste text or upload a requirements document."],
            ["2. Analyze & generate", "We produce steps, expected results and severity."],
            ["3. Review & refine", "Open details, tweak, and add traceability links if needed."],
            ["4. Push or export", "Create issues in Jira/Azure or export JSON/CSV."],
          ].map(([title, desc]) => (
            <li key={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="font-medium text-slate-900">{title}</div>
              <div className="mt-1 text-slate-600">{desc}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">
                Ready to generate your first test suite?
              </div>
              <div className="text-sm opacity-90">
                It only takes a minute to go from requirement to executable
                cases.
              </div>
            </div>
            <Link
              href="/dashboard"
              className="rounded-md bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-700"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-slate-500">
        © Orbit AI — PoC
      </footer>
    </div>
  );
}

/* ---------- small presentational components ---------- */

function PreviewRow({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="grid size-9 place-items-center rounded-md bg-emerald-600/10 text-emerald-700">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-600">{desc}</div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-slate-100 text-slate-700">
          {icon}
        </div>
        <div className="font-medium text-slate-900">{title}</div>
      </div>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </div>
  );
}
