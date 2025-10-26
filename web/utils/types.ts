// root/utils/types.ts
export interface TestCase {
  req_id: string;
  test_id: string;
  title: string;
  severity: string;
  expected_result: string;
  steps?: string[];
  trace_link?: string;
}

export interface LastResult {
  req_id: string;
  generated: number;
  test_cases: TestCase[];
}

export interface PropsWithResult {
  lastResult: LastResult | null;
  showToast: (msg: string, type?: "ok" | "err") => void;
}
