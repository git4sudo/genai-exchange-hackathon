export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:5000";

export async function analyzeData() {
  const res = await fetch(`${API_BASE}/analyze`);
  if (!res.ok) throw new Error("Analyze request failed");
  return res.json();
}

export async function generateData() {
  const res = await fetch(`${API_BASE}/generate`, { method: "POST" });
  if (!res.ok) throw new Error("Generate request failed");
  return res.json();
}
