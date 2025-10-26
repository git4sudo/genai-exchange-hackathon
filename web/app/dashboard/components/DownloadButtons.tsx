"use client";
import { LastResult, TestCase } from "@/utils/types";

interface Props {
  lastResult: LastResult | null;
  showToast: (msg: string, type?: "ok" | "err") => void;
}

export default function DownloadButtons({ lastResult, showToast }: Props) {
  const download = (filename: string, data: string | Blob, type: string) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const toCSV = (rows: TestCase[]) => {
    if (!rows?.length) return "req_id,test_id,title,severity,expected_result\n";
    const headers = [
      "req_id",
      "test_id",
      "title",
      "severity",
      "expected_result",
    ];
    const q = (v: string | undefined) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.join(",")];
    rows.forEach((r) =>
      lines.push(
        [r.req_id, r.test_id, r.title, r.severity, r.expected_result]
          .map(q)
          .join(",")
      )
    );
    return lines.join("\n");
  };

  return (
    <div className="right row">
      <button
        className="btn secondary"
        onClick={() => {
          if (!lastResult) return showToast("Nothing to download", "err");
          download(
            `${lastResult.req_id || "generated"}-testcases.json`,
            JSON.stringify(lastResult, null, 2),
            "application/json"
          );
        }}
      >
        Download JSON
      </button>
      <button
        className="btn secondary"
        onClick={() => {
          if (!lastResult) return showToast("Nothing to download", "err");
          download(
            `${lastResult.req_id || "generated"}-testcases.csv`,
            toCSV(lastResult.test_cases),
            "text/csv"
          );
        }}
      >
        Download CSV
      </button>
    </div>
  );
}
