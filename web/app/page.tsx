"use client";

import { useEffect, useState } from "react";
import { healthCheck, API_BASE } from "@/utils/api";

export default function Home() {
  const [apiHealthy, setApiHealthy] = useState(false);
  useEffect(() => {
    healthCheck().then((ok) => setApiHealthy(ok));
  }, []);

  useEffect(() => {
    // === inject your HTML logic ===
    const script = document.createElement("script");
    script.src = "/index.js";
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <html lang="en">
      <head>
        <title>Orbit AI — Test Case Generator (Dark Theme)</title>
      </head>
      <body>
        <header>
          <div className="wrap">
            <div className="bar">
              <div>
                <h1>Orbit AI — Test Case Generator</h1>
                <div className="sub">
                  Generate test cases from requirements, upload docs, and push
                  to Jira.
                </div>
              </div>
              <div className="right">
                <span id="health" className="status">
                  Ready
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="wrap" style={{ padding: "16px 0 24px" }}>
          {/* API Section */}
          <section className="card">
            <div className="title">Backend Status</div>
            <div>
              {apiHealthy ? (
                <span className="status success">Connected ✓</span>
              ) : (
                <span className="status error">Offline ✗</span>
              )}
              <div className="hint">Connected to: {API_BASE}</div>
            </div>
          </section>

          {/* Generate by Text */}
          <section className="card">
            <div className="title">Generate from Free Text</div>
            <textarea
              id="text"
              placeholder="Paste a requirement (no PHI)"
            ></textarea>
            <div className="row" style={{ marginTop: "8px" }}>
              <button id="bytext" className="btn">
                Generate
              </button>
            </div>
          </section>

          {/* Upload */}
          <section className="card">
            <div className="title">Upload Requirement Document</div>
            <div className="grid col2">
              <input id="upTitle" type="text" placeholder="Optional title" />
              <input id="upReqId" type="text" placeholder="REQ-ID (optional)" />
            </div>
            <div className="row" style={{ marginTop: "8px" }}>
              <input id="upFile" type="file" accept=".pdf,.docx,.txt,.md" />
              <button id="btnUpload" className="btn">
                Analyze & Generate
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
                <button id="btnDownloadJson" className="btn secondary">
                  Download JSON
                </button>
                <button id="btnDownloadCsv" className="btn secondary">
                  Download CSV
                </button>
              </div>
            </div>
            <div id="summary" className="hint">
              No results yet.
            </div>
            <div id="cards" style={{ marginTop: "6px" }}></div>
          </section>
        </main>

        <footer className="wrap">© Orbit AI — PoC</footer>
        <div id="toast" className="toast"></div>
      </body>
    </html>
  );
}
