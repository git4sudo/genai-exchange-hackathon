"use client";

import { useState, useMemo } from "react";
import { pushToAzure, UITestCase, UITestStep } from "@/lib/utils/alm";

type RawStep = string | { action?: string; expected?: string; step?: string };
type RawTestCase = {
  test_id?: string;
  title: string;
  expected_result?: string;
  steps?: RawStep[];
  severity?: string;
  source_excerpt?: string;
  project_id?: string;
  description?: string;
  priority?: number;
  tags?: string[];
};

type Props = {
  // Pass the test cases you show in the right-side "Results" pane.
  // If you don't have selection yet, pass all currently visible cases.
  testCases: RawTestCase[];
};

function normalizeSteps(raw?: RawStep[]): UITestStep[] | undefined {
  if (!raw || !Array.isArray(raw)) return undefined;
  return raw.map((s) => {
    if (typeof s === "string") return { action: s, expected: "" };
    if (s?.action || s?.expected) return { action: s.action ?? "", expected: s.expected ?? "" };
    if (s?.step) return { action: s.step, expected: "" };
    return { action: "", expected: "" };
  });
}

function toUITestCase(tc: RawTestCase): UITestCase {
  return {
    title: tc.title ?? "(untitled)",
    description: tc.description ?? tc.source_excerpt ?? tc.expected_result ?? "",
    steps: normalizeSteps(tc.steps),
    priority: typeof tc.priority === "number" ? tc.priority : 2,
    tags: tc.tags ?? ["orbit-ai"],
  };
}

export default function ALMIntegration({ testCases }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const items: UITestCase[] = useMemo(
    () => (testCases ?? []).map(toUITestCase),
    [testCases]
  );

  async function onPushAzure() {
    setResult("");
    setLoading(true);
    try {
      if (!items.length) throw new Error("No test cases available to push.");
      const res = await pushToAzure(items);
      const ok = res.items.filter((i) => !i.error);
      const bad = res.items.filter((i) => i.error);
      setResult(
        `Azure: created ${ok.length}/${res.items.length}` +
          (ok.length ? ` | IDs: ${ok.map((i) => i.id).filter(Boolean).join(", ")}` : "") +
          (bad.length ? ` | Errors: ${bad.map((i) => i.error).join(" | ")}` : "")
      );
    } catch (e: any) {
      setResult(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-4 shadow-sm bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">ALM Integration</h3>
      </div>

      <p className="mt-2 text-xs text-slate-600">
        Push the test cases shown in “Results” into Azure DevOps as <em>Test Case</em> work items.
      </p>

      <button
        onClick={onPushAzure}
        disabled={loading}
        className="mt-3 w-full rounded-xl px-3 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Pushing…" : `Push ${items.length} to Azure`}
      </button>

      {result ? (
        <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-700 break-words">
          {result}
        </div>
      ) : null}
    </div>
  );
}
