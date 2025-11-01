// web/lib/utils/alm.ts
export type UITestStep = { action: string; expected?: string };
export type UITestCase = {
  title: string;
  description?: string;
  steps?: UITestStep[];
  priority?: number;  // 1..4 (ADO convention)
  tags?: string[];
};

function getApiBase(): string {
  // Prefer env (SSR-safe), fallback to window.API_BASE which you already set in layout.tsx
  const env = process.env.NEXT_PUBLIC_API_BASE;
  if (env && env.trim()) return env.replace(/\/+$/, "");
  if (typeof window !== "undefined" && (window as any).API_BASE) {
    return String((window as any).API_BASE).replace(/\/+$/, "");
  }
  throw new Error("API base URL not configured. Set NEXT_PUBLIC_API_BASE or window.API_BASE.");
}

export async function pushToAzure(items: UITestCase[]) {
  const base = getApiBase();
  const res = await fetch(`${base}/alm/azure/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Azure push failed: ${res.status} ${res.statusText} :: ${text}`);
  }
  return res.json() as Promise<{
    count: number;
    items: Array<{ id?: number; url?: string; error?: string }>;
  }>;
}
