"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/initFirebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { healthCheck } from "@/utils/api";

// ===== Types =====
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
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface IngestResponse extends GenerateResponse {}

interface JiraResponse {
  external_url: string;
}

// ===== Component =====
export default function Dashboard() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  const [apiHealthy, setApiHealthy] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [summary, setSummary] = useState("No results yet.");
  const [busy, setBusy] = useState(false);

  const API_BASE =
    "https://orbit-api-938180057345.us-central1.run.app";

  // === Auth redirect ===
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // === API health check ===
  useEffect(() => {
    healthCheck().then((ok) => setApiHealthy(ok));
  }, []);

  // === Logout ===
  const handleLogout = async (): Promise<void> => {
    await auth.signOut();
    router.push("/login");
  };

  // === Generic POST helper ===
  const post = async <T,>(url: string, payload?: object): Promise<T> => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as T;
  };

  // === Generate from text ===
  const handleGenerateText = async (): Promise<void> => {
    const textarea = document.getElementById(
      "text"
    ) as HTMLTextAreaElement | null;
    const text = textarea?.value.trim() ?? "";
    if (!text) return alert("Paste requirement text");

    try {
      setBusy(true);
      const data = await post<GenerateResponse>(`${API_BASE}/generate`, {
        text,
      });
      setSummary(`Generated ${data.generated} test case(s) for ${data.req_id}`);
      setTestCases(data.test_cases);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error generating test cases";
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  // === Upload file ===
  const handleUploadFile = async (): Promise<void> => {
    const fileInput = document.getElementById(
      "upFile"
    ) as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) return alert("Choose a file");

    const fd = new FormData();
    fd.append("file", file, file.name);

    const titleInput = document.getElementById(
      "upTitle"
    ) as HTMLInputElement | null;
    const reqIdInput = document.getElementById(
      "upReqId"
    ) as HTMLInputElement | null;
    const title = titleInput?.value.trim();
    const reqId = reqIdInput?.value.trim();

    if (title) fd.append("title", title);
    if (reqId) fd.append("req_id", reqId);

    try {
      setBusy(true);
      const res = await fetch(`${API_BASE}/ingest`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data: IngestResponse = await res.json();
      setSummary(`Generated ${data.generated} test case(s) for ${data.req_id}`);
      setTestCases(data.test_cases);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error uploading file";
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  // === Download JSON ===
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

  // === Download CSV ===
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

  // === Push to Jira ===
  const pushToJira = async (
    tc: TestCase,
    setLink: (url: string) => void
  ): Promise<void> => {
    try {
      setBusy(true);
      const data = await post<JiraResponse>(`${API_BASE}/push/jira`, {
        req_id: tc.req_id,
        test_id: tc.test_id,
        summary: tc.title,
        steps: tc.steps,
      });
      setLink(data.external_url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error pushing to Jira";
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="wrap">
        <div className="bar">
          <div>
            <h1>Orbit AI — Test Case Generator</h1>
            <div className="sub">
              Generate test cases from requirements, upload docs, and push to
              Jira.
            </div>
          </div>
          <div className="right row">
            <span className={`status ${apiHealthy ? "ok" : "err"}`}>
              {apiHealthy ? "Connected ✓" : "Offline ✗"}
            </span>
            <button
              className="ml-4 bg-gray-800 text-white px-4 py-2 rounded-md"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <main className="wrap" style={{ padding: "16px 0 24px" }}>
        {/* Generate from Text */}
        <section className="card">
          <div className="title">Generate from Free Text</div>
          <textarea id="text" placeholder="Paste a requirement (no PHI)" />
          <div className="row" style={{ marginTop: "8px" }}>
            <button
              className="btn"
              onClick={handleGenerateText}
              disabled={busy}
            >
              {busy ? "Generating…" : "Generate"}
            </button>
          </div>
        </section>

        {/* Upload Document */}
        <section className="card">
          <div className="title">Upload Requirement Document</div>
          <div className="grid col2">
            <input id="upTitle" type="text" placeholder="Optional title" />
            <input id="upReqId" type="text" placeholder="REQ-ID (optional)" />
          </div>
          <div className="row" style={{ marginTop: "8px" }}>
            <input id="upFile" type="file" accept=".pdf,.docx,.txt,.md" />
            <button className="btn" onClick={handleUploadFile} disabled={busy}>
              {busy ? "Uploading…" : "Analyze & Generate"}
            </button>
          </div>
          <div className="hint" style={{ marginTop: "6px" }}>
            PDF, DOCX, TXT, Markdown supported.
          </div>
        </section>

        {/* Results */}
        <section className="card">
          <div className="row">
            <div className="title" style={{ margin: 0 }}>
              Results
            </div>
            <div className="right row">
              <button className="btn secondary" onClick={downloadJSON}>
                Download JSON
              </button>
              <button className="btn secondary" onClick={downloadCSV}>
                Download CSV
              </button>
            </div>
          </div>
          <div id="summary" className="hint">
            {summary}
          </div>
          <div id="cards" style={{ marginTop: "6px" }}>
            {testCases.map((tc) => (
              <TestCaseCard key={tc.test_id} tc={tc} pushToJira={pushToJira} />
            ))}
          </div>
        </section>
      </main>

      <footer className="wrap">© Orbit AI — PoC</footer>
    </div>
  );
}

// ===== Test Case Card =====
function TestCaseCard({
  tc,
  pushToJira,
}: {
  tc: TestCase;
  pushToJira: (tc: TestCase, setLink: (url: string) => void) => Promise<void>;
}) {
  const [jiraLink, setJiraLink] = useState("");

  return (
    <div className="tc">
      <div className="row">
        <div style={{ flex: 1 }}>
          <h4>{tc.title}</h4>
          <div className="meta">
            Test: {tc.test_id} • REQ: {tc.req_id} • Severity: {tc.severity}
          </div>
        </div>
        <div className="act">
          <button
            className="btn ghost"
            onClick={() => pushToJira(tc, setJiraLink)}
          >
            Push to Jira
          </button>
          {jiraLink && (
            <a href={jiraLink} target="_blank" rel="noreferrer">
              View in Jira ↗
            </a>
          )}
        </div>
      </div>
      <div className="sep"></div>
      <div className="hint" style={{ marginBottom: 4 }}>
        <b>Steps</b>
      </div>
      <ol className="list">
        {tc.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <div className="hint" style={{ marginTop: 6 }}>
        <b>Expected</b>
      </div>
      <div className="hint">{tc.expected_result}</div>
      {tc.trace_link && (
        <div style={{ marginTop: 8 }}>
          <a
            className="link"
            href={tc.trace_link}
            target="_blank"
            rel="noreferrer"
          >
            Traceability Link ↗
          </a>
        </div>
      )}
    </div>
  );
}
