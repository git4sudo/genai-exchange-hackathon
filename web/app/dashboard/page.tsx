"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase/initFirebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { healthCheck } from "@/utils/api";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/initFirebase";
import {
  Card,
  CardHeader,
  ResultItem,
  EmptyState,
} from "@/app/dashboard/components/ui";
import { useTestStore } from "@/app/store/testCaseStore";
import { fetchTestCasesByProject } from "@/app/store/testCaseStore";
import { useNotificationStore } from "@/app/store/notificationStore";
import ShareProjectModal from "@/app/dashboard/components/ShareProjectModal";
import ALMIntegration from "@/app/dashboard/components/ALMIntegration";
import PushAllToJira from "@/app/dashboard/components/PushAllToJira";
import { API_BASE } from "@/utils/api";
/* ========= Types ========= */
interface TestCase {
  req_id: string;
  test_id: string;
  title: string;
  severity: string;
  expected_result: string;
  steps: string[];
  trace_link?: string;
}
interface GenerateResponse {
  req_id: string;
  generated: number;
  test_cases: TestCase[];
}
interface IngestResponse extends GenerateResponse {}
interface JiraResponse {
  external_url: string;
}

/* ========= Page ========= */
function DashboardInner() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const { showNotification } = useNotificationStore();
  const [apiHealthy, setApiHealthy] = useState(false);

  // Controlled inputs
  const [freeText, setFreeText] = useState("");
  const [title, setTitle] = useState("");
  const [reqId, setReqId] = useState("");

  const { testCases, setTestCases } = useTestStore();

  const [summary, setSummary] = useState("No results yet.");

  const searchParams = useSearchParams();
  const projectName = searchParams.get("projectName");
  const pDescription = searchParams.get("description");
  const projectId = searchParams.get("projectId");
  const integrationType = searchParams.get("integrationType");
  const [hasStoredCases, setHasStoredCases] = useState(false);
  const [loadingStoredCases, setLoadingStoredCases] = useState(false);
  const jiraProjectKey = searchParams.get("jiraProjectKey");
  const pAzureProjectId = searchParams.get("azureProjectId");

  console.log(
    `Project Name:${projectName}, Description${pDescription}, ProjecctId:${projectId}, jiraProjectKey:${jiraProjectKey}, integrationType:${integrationType}, azureProjectId:${pAzureProjectId}`
  );

  useEffect(() => {
    if (!projectId) {
      setTestCases([]);
      setSummary("No project selected.");
      setHasStoredCases(false);
      setLoadingStoredCases(false);
      return;
    }

    const fetchData = async () => {
      try {
        setTestCases([]);
        setLoadingStoredCases(true);
        setSummary("Looking for previously stored testcases for this project!");

        const existing: any = await fetchTestCasesByProject(projectId);
        console.log("Fetched testcases:", existing);

        const list = Array.isArray(existing)
          ? existing
          : Array.isArray(existing?.test_cases)
          ? existing.test_cases
          : [];

        if (list.length > 0) {
          setSummary("Previously stored testcases found!");
          setHasStoredCases(true);
        } else {
          setSummary("No testcases found.");
          setHasStoredCases(false);
        }

        setTestCases(list);
      } catch (err) {
        console.error("Failed to fetch existing test cases:", err);
        setSummary("Error fetching stored testcases.");
        setHasStoredCases(false);
      } finally {
        setLoadingStoredCases(false);
      }
    };

    fetchData();
  }, [projectId, setTestCases]);

  // Unified testcase Generation
  const [files, setFiles] = useState<FileList | null>(null);
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [description, setDescription] = useState("");
  const [loadingGen, setLoading] = useState(false);

  const addLink = () => {
    if (newLink.trim() === "") return;
    setLinks([...links, newLink.trim()]);
    setNewLink("");
  };

  const handleGenerate = async () => {
    if (!files?.length && !links.length && !description.trim()) {
      alert("Please provide at least one input (file, link, or text).");
      return;
    }

    const formData = new FormData();

    if (files?.length) {
      Array.from(files).forEach((file) => formData.append("files", file));
    }

    if (links.length) {
      formData.append("links", JSON.stringify(links));
    }

    if (description.trim()) {
      formData.append("description", description.trim());
    }

    if (projectId) formData.append("project_id", projectId);

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/generate_unified`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setSummary(data.summary ?? "Generated successfully!");

      if (projectId) {
        const refreshed: any = await fetchTestCasesByProject(projectId);

        const list = Array.isArray(refreshed)
          ? refreshed
          : Array.isArray(refreshed?.test_cases)
          ? refreshed.test_cases
          : [];

        setTestCases(list);
        showNotification("Generated successfully!");
      }
    } catch (err) {
      console.error("Error generating:", err);
      alert("Error generating test cases.");
    } finally {
      setLoading(false);
    }
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    healthCheck().then((ok) => setApiHealthy(ok));
  }, []);

  // POST helper
  const post = async <T,>(url: string, payload?: object): Promise<T> => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as T;
  };

  // Downloads
  const downloadJSON = (): void => {
    if (!testCases.length) return alert("Nothing to download");
    const blob = new Blob(
      [JSON.stringify({ test_cases: testCases }, null, 2)],
      {
        type: "application/json",
      }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `generated-testcases.json`;
    a.click();
  };

  const downloadCSV = (): void => {
    if (!testCases.length) return alert("Nothing to download");
    const headers = [
      "req_id",
      "test_id",
      "title",
      "severity",
      "expected_result",
    ];
    const lines = [headers.join(",")].concat(
      testCases.map((r) =>
        [r.req_id, r.test_id, r.title, r.severity, r.expected_result]
          .map((v) => `"${(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `generated-testcases.csv`;
    a.click();
  };

  // Results sorting
  const severityOrder = {
    Critical: 0,
    High: 1,
    Medium: 2,
    Low: 3,
    Unknown: 4,
  } as const;
  const sorted = useMemo(
    () =>
      [...testCases].sort(
        (a, b) =>
          (severityOrder[
            (a.severity as keyof typeof severityOrder) ?? "Unknown"
          ] ?? 4) -
          (severityOrder[
            (b.severity as keyof typeof severityOrder) ?? "Unknown"
          ] ?? 4)
      ),
    [testCases]
  );

  const hasResults = sorted.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-slate-600">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-slate-800">
      {/* Top bar */}
      <header className="top-0 z-50 bg-[#0b1220] text-white shadow-[0_1px_0_rgba(255,255,255,0.06)]">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-4">
          <div className="leading-tight">
            <span className="flex items-center gap-2">
              <h1 className="text-xl font-semibold  text-white">
                {/* Orbit AI — Test Case Generator */}
                {projectName}
              </h1>
              {projectId && (
                <div className="">
                  <ShareProjectModal projectId={projectId} />
                </div>
              )}
            </span>

            <h2 className="mt-1 text-sm text-white-700">{pDescription}</h2>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                apiHealthy
                  ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
                  : "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30"
              }`}
            >
              {apiHealthy ? "Connected ✓" : "Offline ✗"}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-10 grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <section className="space-y-6 lg:col-span-2 relative min-h-[300px]">
          <Card>
            <CardHeader
              title="Upload Requirement Document"
              subtitle="PDF, DOCX, TXT or Markdown. Optionally add a title or REQ-ID."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title"
              />
              <Input
                value={reqId}
                onChange={(e) => setReqId(e.target.value)}
                placeholder="REQ-ID (optional)"
              />
            </div>

            <input
              id="files"
              type="file"
              accept=".pdf,.docx,.txt,.md"
              multiple
              className="hidden"
              onChange={(e) => setFiles(e.target.files)}
            />
            <label
              htmlFor="files"
              className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm hover:bg-slate-50"
            >
              <span className="truncate">
                {files?.length
                  ? `${files.length} file(s) selected`
                  : "Choose File(s)"}
              </span>
              <span className="rounded-lg bg-emerald-600 px-3 px-3 py-1 text-xs text-white hover:bg-emerald-700">
                Browse
              </span>
            </label>

            {(files ?? []).length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {Array.from(files!).map((file, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-1"
                  >
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reference Links
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Paste a link (e.g. Jira, Drive, Notion)"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <button
                  type="button"
                  onClick={addLink}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
                >
                  Add
                </button>
              </div>
              {links.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-emerald-700">
                  {links.map((l, i) => (
                    <li key={i}>
                      <a
                        href={l}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Generate from Free Text"
              subtitle="Paste a requirement (no PHI). We’ll analyze it and propose high-quality test cases."
            />
            <div className="mt-4 space-y-3">
              <TextArea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Paste a requirement (no PHI)"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </Card>

          <div className="bottom-3 right-4">
            <PrimaryButton
              onClick={handleGenerate}
              loading={loadingGen}
              label="Generate Test Cases"
              loadingLabel="Generating..."
            />
          </div>
        </section>

        {/* Right column */}
        <aside className="space-y-6 lg:sticky lg:top-24 self-start">
          <Card className={hasResults ? "overflow-hidden" : ""}>
            <CardHeader
              title="Results"
              subtitle={
                !loadingStoredCases && hasResults
                  ? `(${sorted.length}) ${summary ?? ""}`
                  : summary
              }
            />

            <div className="mt-3 flex gap-2">
              <ButtonGhost onClick={downloadJSON}>Download JSON</ButtonGhost>
              <ButtonGhost onClick={downloadCSV}>Download CSV</ButtonGhost>
              {!loadingStoredCases && hasResults && (
                <ViewAllButton
                  onClick={() =>
                    router.push("/dashboard/view?fromDashboard=true")
                  }
                >
                  View All
                </ViewAllButton>
              )}
            </div>

            <div
              className={
                hasResults
                  ? "mt-4 overflow-y-auto pr-1 max-h-[calc(100vh-260px)]"
                  : "mt-2"
              }
            >
              {loadingStoredCases ? (
                <div className="flex flex-col items-center justify-center py-8 text-emerald-700">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-300 border-t-emerald-700"></div>
                  <p className="mt-3 text-sm font-medium">
                    Fetching stored test cases...
                  </p>
                </div>
              ) : hasResults ? (
                <ul className="space-y-3">
                  {sorted.map((tc) => (
                    <ResultItem
                      key={tc.test_id}
                      tc={tc}
                      post={post}
                      apiBase={API_BASE}
                      jira_project_key={jiraProjectKey}
                      integration_Type={integrationType}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState />
              )}
            </div>
          </Card>

          {/* NEW: ALM Integration card placed directly under Results */}
          {hasResults ? (
            <>
              {integrationType === "Azure" && (
                <ALMIntegration testCases={sorted} />
              )}

              {integrationType === "Jira" && (
                <PushAllToJira
                  testCases={sorted}
                  apiBase={API_BASE}
                  jira_project_key={jiraProjectKey}
                />
              )}
            </>
          ) : null}

          {/* Single pro tip (kept) */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Pro tip: keep one requirement per run for crisper, atomic test
            cases.
          </div>
        </aside>
      </main>

      <footer className="py-8 text-center text-xs text-slate-500">
        © Orbit AI
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <DashboardInner />
    </Suspense>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-300"
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={[
        "min-h-[140px] w-full resize-y",
        "rounded-lg border !border-slate-300",
        "!bg-white !text-slate-900 placeholder:text-slate-400",
        "outline-none focus:ring-2 focus:ring-emerald-300",
        className,
      ].join(" ")}
    />
  );
}

function PrimaryButton({
  onClick,
  loading,
  label,
  loadingLabel,
}: {
  onClick: () => void | Promise<void>;
  loading: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-60"
    >
      {loading && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
      )}
      {loading ? loadingLabel : label}
    </button>
  );
}

function ButtonGhost({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function ViewAllButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
