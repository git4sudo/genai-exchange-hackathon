"use client";
import { useState } from "react";
import { LastResult } from "@/utils/types";

interface Props {
  setResults: (data: LastResult) => void;
  showToast: (msg: string, type?: "ok" | "err") => void;
}

export default function FileUploader({ setResults, showToast }: Props) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [reqId, setReqId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return showToast("Choose a file", "err");
    const fd = new FormData();
    fd.append("file", file, file.name);
    if (title.trim()) fd.append("title", title.trim());
    if (reqId.trim()) fd.append("req_id", reqId.trim());

    setLoading(true);
    try {
      const res = await fetch(`${"http://127.0.0.1:8000"}/ingest`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data: LastResult = await res.json();
      setResults(data);
      showToast("Uploaded & generated", "ok");
    } catch (e: unknown) {
      if (e instanceof Error) showToast(e.message, "err");
      else showToast("Unknown error", "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <div className="title">Upload Requirement Document</div>
      <div className="grid col2">
        <input
          type="text"
          placeholder="Optional title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="REQ-ID (optional)"
          value={reqId}
          onChange={(e) => setReqId(e.target.value)}
        />
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button className="btn" onClick={handleUpload} disabled={loading}>
          {loading ? "Uploading…" : "Analyze & Generate"}
        </button>
      </div>
      <div className="hint" style={{ marginTop: 6 }}>
        PDF, DOCX, TXT, Markdown supported.
      </div>
    </section>
  );
}
