"use client";
import { useEffect, useState } from "react";
import { healthCheck } from "@/utils/api";

export default function HealthStatus() {
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    healthCheck().then((ok) => setApiHealthy(ok));
  }, []);

  return (
    <span className={`status ${apiHealthy ? "success" : "error"}`}>
      {apiHealthy === null
        ? "Checking..."
        : apiHealthy
        ? "Connected ✓"
        : "Offline ✗"}
    </span>
  );
}
