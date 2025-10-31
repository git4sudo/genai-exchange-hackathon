"use client";
import { TestCase } from "@/utils/types";
import Link from "next/link";

interface Props {
  testCases: TestCase[];
}

export default function ResultCards({ testCases }: Props) {
  if (!testCases?.length) return <div>No results yet.</div>;

  return (
    <div>
      {testCases.map((tc) => (
        <div key={tc.test_id} className="tc">
          {(() => {
            console.log("TRACE DEBUG:", {
              title: tc.title,
              test_id: tc.test_id,
              req_id: tc.req_id,
              trace_link: tc.trace_link,
            });
            return null;
          })()}

          <div className="row">
            <div style={{ flex: 1 }}>
              <h4>{tc.title || "(no title)"}</h4>
              <div className="meta">
                Test: {tc.test_id || "-"} • REQ: {tc.req_id || "-"} • Severity:{" "}
                {tc.severity || "-"}
              </div>
            </div>
            <div className="act">
              {tc.req_id ? (
                <Link
                  href={`/traceability/${tc.req_id}?test_id=${tc.test_id}`}
                  className="btn ghost"
                  prefetch={false}
                >
                  Trace Link to below
                </Link>
              ) : (
                <span className="btn ghost disabled">No Trace</span>
              )}
            </div>
          </div>
          <div className="sep" />
          <div className="hint" style={{ marginBottom: 4 }}>
            <b>Steps</b>
          </div>
          <ol className="list">
            {(tc.steps || []).map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ol>
          <div className="hint" style={{ marginTop: 6 }}>
            <b>Expected</b>
          </div>
          <div className="hint">{tc.expected_result}</div>
        </div>
      ))}
    </div>
  );
}
