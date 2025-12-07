"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import { SeverityBadge } from "./SeverityBadge";
import { Pencil, Check, X } from "lucide-react";
import { auth, db } from "@/lib/firebase/initFirebase";
import { doc, getDoc } from "firebase/firestore";
import { useNotificationStore } from "@/app/store/notificationStore";
import { pushToAzure } from "@/lib/utils/alm";
import Link from "next/link";
interface TestCase {
  req_id: string;
  test_id: string;
  title: string;
  severity: string;
  expected_result: string;
  steps: string[];
  isPushed?: boolean;
  trace_link?: string;
  createdAt?: string | number | Date;
  project_id: string;
}

interface JiraResponse {
  external_url: string;
  external_key?: string;
  detail?: string;
}

interface Props {
  tc: TestCase;
  post: <T>(url: string, payload?: object) => Promise<T>;
  apiBase: string;
  jira_project_key?: string | null;
  integration_Type?: string | null;
  onUpdated?: () => void;
  onMovedToPushed?: (updatedTc: TestCase) => void;
}

export interface ResultItemHandle {
  triggerPush: () => Promise<void>;
}

export const ResultItem = forwardRef<ResultItemHandle, Props>(
  ({ tc, post, apiBase, jira_project_key, onUpdated, integration_Type, onMovedToPushed, }, ref) => {
    const [open, setOpen] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [jiraLink, setJiraLink] = useState<string>("");
    const { showNotification } = useNotificationStore();
    const [editing, setEditing] = useState(false);
    const [edited, setEdited] = useState<TestCase>(tc);
    const [saving, setSaving] = useState(false);
    const [changed, setChanged] = useState(false);
    const user = auth.currentUser;
    const [azureLink, setAzureLink] = useState<string>("");

    const handleChange = (field: keyof TestCase, value: string | string[]) => {
      setEdited((prev) => ({ ...prev, [field]: value }));
      setChanged(true);
    };
    
    {tc.trace_link && !jiraLink && setJiraLink(tc.trace_link);}

    const handleSaveEdit = async () => {
      try {
        setSaving(true);
        const payload = { ...edited, user_id: user?.uid };
        const result = await post<{ ok: boolean; error?: string }>(
          `${apiBase}/manual/testcase/update`,
          payload
        );
        if (result.ok) {
          setEditing(false);
          setChanged(false);
          showNotification("Testcase updated.");
          onUpdated?.();
        } else {
          showNotification(result.error || "Failed to update testcase.", true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSaving(false);
      }
    };

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
          jira_project_key,
          jira_issue_type: "Task",
          uid: user.uid,
          summary: tc.title,
          steps: tc.steps,
          test_id: tc.test_id,
          req_id: tc.req_id,
          project_id: tc.project_id,
        };

        const res = await fetch(`${apiBase}/push/jira`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result: JiraResponse = await res.json();

        if (res.ok && result.external_url) {
          const updated = { ...tc, isPushed: true, jiraLink: result.external_url };
          setJiraLink(result.external_url);
          setEdited(updated);
          showNotification(`Pushed to Jira: ${result.external_key}`);
          onMovedToPushed?.(updated);
        }
        else {
          showNotification(result.detail || "Failed to create issue.", true);
        }
      } catch (e) {
        console.error(e);
        showNotification("Error pushing to Jira", true);
      } finally {
        setPushing(false);
      }
    };

    useImperativeHandle(ref, () => ({
      triggerPush: async () => {
        if (jiraLink) return;
        if (integration_Type === "Jira") await pushToJira();
        else if (integration_Type === "Azure") {
        setPushing(true);
          try {
            // onClick={}
            showNotification("Pushed to Azure successfully.");
          } catch (e) {
        console.error(e);
        showNotification("Error pushing to Azure", true);
      } finally {
        setPushing(false);
      }
        }
      },
    }));

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
      <li className="rounded-lg border border-slate-200 bg-white p-4 relative">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            {editing ? (
              <input
                value={edited.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            ) : (
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">{tc.title}</h4>
                <SeverityBadge level={tc.severity} />
              </div>
            )}
            <div className="flex items-center">
              {tc.req_id ? (
                <Link
                  href={`/traceability/${tc.req_id}?test_id=${tc.test_id}`}
                  prefetch={false}
                  className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                >
                  Trace Link →
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 cursor-not-allowed">
                  No Trace
                </span>
              )}
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
            {/* Show button before push */}
            {integration_Type === "Jira" && (
              <>
                {!pushing && !jiraLink && (
                  <button
                    onClick={pushToJira}
                    className="rounded-md border border-slate-200 bg-emerald-600 px-3 py-1.5 text-xs hover:bg-emerald-700 transition"
                  >
                    Push to Jira
                  </button>
                )}

                {pushing && !jiraLink && (
                  <span className="text-xs text-slate-500">Pushing…</span>
                )}

                {jiraLink && (
                  <>
                    <span className="text-xs text-emerald-700 font-medium">Pushed ✓</span>
                    <a
                      href={jiraLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-700 hover:underline"
                    >
                      View Issue↗
                    </a>
                  </>
                )}
              </>
            )}

            {integration_Type === "Azure" && (
              <>
                {!pushing && !azureLink && (
                  <button
                  //  onClick={pushToAzure}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50 transition"
                  >
                    Push to Azure
                  </button>
                )}

                {pushing && !azureLink && (
                  <span className="text-xs text-slate-500">Pushing…</span>
                )}

                {azureLink && (
                  <>
                    <span className="text-xs text-blue-700 font-medium">Pushed ✓</span>
                    <a
                      href={azureLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-700 hover:underline"
                    >
                      View Work Item↗
                    </a>
                  </>
                )}
              </>
            )}




            {/* Details toggle button */}
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
            <div className="text-xs text-slate-700 space-y-3">
              <div>
                <div className="font-semibold text-slate-800 mb-1">Steps</div>
                <ol className="list-decimal pl-5 space-y-1.5">
                  {(editing ? edited.steps : tc.steps).map((s, i) =>
                    editing ? (
                      <input
                        key={i}
                        value={s}
                        onChange={(e) => {
                          const newSteps = [...edited.steps];
                          newSteps[i] = e.target.value;
                          handleChange("steps", newSteps);
                        }}
                        className="w-full border border-slate-200 rounded-md px-2 py-1 text-[13px] focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                        style={{ lineHeight: "1.2rem" }}
                      />
                    ) : (
                      <li key={i} className="text-[14px] leading-[1.3rem]">{s}</li>
                    )
                  )}
                </ol>
              </div>

              <div>
                <div className="font-semibold text-slate-800 mb-1">Expected Result</div>
                {editing ? (
                  <textarea
                    value={edited.expected_result}
                    onChange={(e) => handleChange("expected_result", e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                ) : (
                  <div className="text-slate-700">{tc.expected_result}</div>
                )}
              </div>
            </div>
          </>
        )}

        {editing && (
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-xs rounded-md bg-gray-100 hover:bg-gray-200 text-slate-700 flex items-center gap-1 shadow-sm"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="px-3 py-1.5 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : (<><Check size={14} /> Save</>)}
            </button>
          </div>
        )}

        {/* Bottom-right edit button (only when not editing) */}
        {/* {!editing && (
        <button
          onClick={() => setEditing(true)}
          title="Edit test case"
          className="absolute bottom-3 right-3 px-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1 shadow-sm"
        >
          <Pencil size={14} /> 
        </button>
      )} */}
      </li>
    );
  }
);

ResultItem.displayName = "ResultItem";
