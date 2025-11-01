"use client";

import { useState } from "react";
import { SeverityBadge } from "./SeverityBadge";
import { auth, db } from "@/lib/firebase/initFirebase";
import { doc, getDoc } from "firebase/firestore";

interface TestCase {
  req_id: string;
  test_id: string;
  title: string;
  severity: string;
  expected_result: string;
  steps: string[];
  trace_link?: string;
  createdAt?: string | number | Date;
}

interface JiraResponse {
  external_url: string;
  external_key?: string;
  detail?: string;
}

interface Props {
  tc: TestCase;
  post: <T,>(url: string, payload?: object) => Promise<T>;
  apiBase: string;
  jira_project_key?: string | null;
}

export function ResultItem({ tc, post, apiBase, jira_project_key }: Props) {
  const [open, setOpen] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [jiraLink, setJiraLink] = useState<string>("");

  const user = auth.currentUser;

  const pushToJira = async (): Promise<void> => {
    try {
      if (!user) {
        alert("You must be logged in!");
        return;
      }

      setPushing(true);

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("No user data found in Firestore.");
        return;
      }

      const userData = userSnap.data();
      const jira = userData.jira;

      if (!jira || !jira.domain || !jira.email || !jira.apiToken) {
        alert("Please save your Jira credentials first.");
        return;
      }

      const payload = {
        jira_domain: jira.domain,
        jira_email: jira.email,
        jira_api_token: jira.apiToken,
        jira_project_key: jira_project_key,
        jira_issue_type: "Task",
        uid: user.uid,
        summary: tc.title,
        steps: tc.steps,
        test_id: tc.test_id,
        req_id: tc.req_id,
      };

      const res = await fetch(`${apiBase}/push/jira`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result: JiraResponse = await res.json();

      if (res.ok && result.external_url) {
        setJiraLink(result.external_url);
        alert(`Jira issue created: ${result.external_key}\n${result.external_url}`);
      } else {
        console.error(result);
        alert(`Failed to create issue: ${result.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Error pushing to Jira");
    } finally {
      setPushing(false);
    }
  };

  const formattedDate = tc.createdAt
    ? new Date(tc.createdAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">{tc.title}</h4>
            <SeverityBadge level={tc.severity} />
          </div>
          <div className="mt-1 text-[12px] text-slate-500">
            Test: {tc.test_id} • REQ: {tc.req_id}
          </div>
          {formattedDate && (
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <span>Created: {formattedDate}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={pushToJira}
            disabled={pushing}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-60"
          >
            {pushing ? "Pushing…" : "Push to Jira"}
          </button>
          {jiraLink && (
            <a
              href={jiraLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-emerald-700 hover:underline"
            >
              View Issue↗
            </a>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-xs text-slate-600 hover:underline"
          >
            {open ? "Hide" : "Details"}
          </button>
        </div>
      </div>

      {open && (
        <>
          <div className="my-3 h-px bg-slate-200" />
          <div className="text-xs text-slate-700">
            <div className="mb-1 font-semibold text-slate-800">Steps</div>
            <ol className="list-decimal pl-5 space-y-1">
              {tc.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
          <div className="mt-3 text-xs">
            <div className="mb-1 font-semibold text-slate-800">Expected</div>
            <div className="text-slate-700">{tc.expected_result}</div>
          </div>
          {tc.req_id && (
            <div className="mt-3">
              <a
                className="text-xs text-emerald-700 hover:underline"
                href={`/traceability/${tc.req_id}?test_id=${tc.test_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Traceability Link ↗
              </a>
            </div>
          )}
        </>
      )}
    </li>
  );
}
