"use client";
import { useState } from "react";
import { post, type LastResult } from "@/utils/api";

interface Props {
  setResults: (data: LastResult) => void;
  showToast: (msg: string, type?: "ok" | "err") => void;
}

export default function TextGenerator({ setResults, showToast }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!text.trim()) return showToast("Paste requirement text", "err");
    setLoading(true);
    try {
      // ✅ tell TypeScript what to expect
      const data = await post<LastResult>("generate", { text });
      setResults(data);
      showToast("Generated", "ok");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error generating";
      showToast(message, "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <div className="title">Generate from Free Text</div>
      <textarea
        placeholder="Paste a requirement (no PHI)"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="row" style={{ marginTop: "8px" }}>
        <button className="btn" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>
    </section>
  );
}
