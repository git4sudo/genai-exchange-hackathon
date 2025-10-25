// const API_BASE = "https://orbit-api-938180057345.us-central1.run.app";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API) {
  console.error(
    "API base URL is not set. Please set the API_BASE environment variable."
  );
}

/* ----------- Utilities ----------- */
const HEALTH = document.getElementById("health");
const SUMMARY = document.getElementById("summary");
const CARDS = document.getElementById("cards");
const TOAST = document.getElementById("toast");

let lastResult = null;

function toast(msg, type) {
  // type: '', 'ok', 'err'
  TOAST.textContent = msg;
  TOAST.className = "toast " + (type || "");
  setTimeout(() => TOAST.classList.add("show"), 10);
  setTimeout(() => TOAST.classList.remove("show"), 2500);
}

function setBusy(btn, on) {
  btn.disabled = !!on;
  if (on) {
    btn.dataset.label = btn.dataset.label || btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>';
  } else if (btn.dataset.label) {
    btn.textContent = btn.dataset.label;
    btn.dataset.label = "";
  }
}

function baseUrl() {
  // always use the injected env variable
  return API_BASE?.trim().replace(/\/+$/, "") || "";
}

function showSummary(text) {
  SUMMARY.textContent = text;
}
function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}
function escAttr(s) {
  return String(s ?? "").replace(/"/g, "&quot;");
}

function download(filename, data, type) {
  const blob = new Blob([data], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function toCSV(rows) {
  if (!rows?.length) return "req_id,test_id,title,severity,expected_result\n";
  const headers = ["req_id", "test_id", "title", "severity", "expected_result"];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [r.req_id, r.test_id, r.title, r.severity, r.expected_result]
        .map(q)
        .join(",")
    );
  }
  return lines.join("\n");
}

/* ----------- Render ----------- */
function renderCards(items) {
  CARDS.innerHTML = "";
  (items || []).forEach((tc) => {
    const el = document.createElement("div");
    el.className = "tc";
    const steps = tc.steps || [];
    const btnId = `push-${tc.test_id}`;
    const labId = `lab-${tc.test_id}`;

    el.innerHTML = `
      <div class="row">
        <div style="flex:1 1 auto">
          <h4>${esc(tc.title || "(no title)")}</h4>
          <div class="meta">Test: ${esc(tc.test_id || "-")} • REQ: ${esc(
      tc.req_id || "-"
    )} • Severity: ${esc(tc.severity || "-")}</div>
        </div>
        <div class="act">
          <button id="${btnId}" class="btn ghost">Push to Jira</button>
          <span id="${labId}" class="hint"></span>
        </div>
      </div>
      <div class="sep"></div>
      <div class="hint" style="margin-bottom:4px"><b>Steps</b></div>
      <ol class="list">${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      <div class="hint" style="margin-top:6px"><b>Expected</b></div>
      <div class="hint">${esc(tc.expected_result || "")}</div>
      ${
        tc.trace_link
          ? `<div style="margin-top:8px"><a class="link" href="${escAttr(
              tc.trace_link
            )}" target="_blank">Traceability Link ↗</a></div>`
          : ``
      }
    `;
    CARDS.appendChild(el);

    // Wire Jira push
    const btn = el.querySelector("#" + btnId);
    const lab = el.querySelector("#" + labId);
    btn.onclick = async () => {
      try {
        const base = baseUrl();
        if (!base) return toast("API URL not set", "err");
        setBusy(btn, true);
        lab.textContent = "Pushing…";
        const res = await fetch(base + "/push/jira", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            req_id: tc.req_id,
            test_id: tc.test_id,
            summary: tc.title,
            steps,
          }),
        });
        const txt = await res.text();
        if (!res.ok) throw new Error(txt);
        const data = JSON.parse(txt);
        btn.disabled = true;
        lab.innerHTML = `Created: <a class="link" href="${escAttr(
          data.external_url
        )}" target="_blank">${esc(data.external_key)}</a>`;
        toast("Pushed to Jira", "ok");
      } catch (e) {
        lab.textContent = "Error";
        toast((e?.message || String(e)).slice(0, 180), "err");
      } finally {
        setBusy(btn, false);
      }
    };
  });
}

/* ----------- API helpers ----------- */
async function post(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ----------- Init / Wire ----------- */
(async function init() {
  const base = baseUrl();
  try {
    const r = await fetch(base + "/health");
    if (!r.ok) throw new Error("Health check failed");
    HEALTH.textContent = "OK ✓";
    HEALTH.className = "status ok";
    toast("API reachable", "ok");
  } catch (e) {
    HEALTH.textContent = "Offline ✗";
    HEALTH.className = "status err";
    toast("Backend unreachable", "err");
  }
})();

/* ----------- Button handlers ----------- */
document.getElementById("bytext").onclick = async function () {
  try {
    const base = baseUrl();
    if (!base) return toast("API URL not set", "err");
    const txt = (document.getElementById("text").value || "").trim();
    if (!txt) return toast("Paste requirement text", "err");
    setBusy(this, true);
    const data = await post(base + "/generate", { text: txt });
    showSummary(`Generated ${data.generated} test case(s) for ${data.req_id}`);
    renderCards(data.test_cases || []);
    lastResult = data;
    toast("Generated", "ok");
  } catch (e) {
    toast((e?.message || String(e)).slice(0, 180), "err");
  } finally {
    setBusy(this, false);
  }
};

document.getElementById("btnUpload").onclick = async function () {
  try {
    const base = baseUrl();
    if (!base) return toast("API URL not set", "err");
    const f = document.getElementById("upFile").files[0];
    if (!f) return toast("Choose a file", "err");
    const fd = new FormData();
    fd.append("file", f, f.name);
    const t = (document.getElementById("upTitle").value || "").trim();
    if (t) fd.append("title", t);
    const rid = (document.getElementById("upReqId").value || "").trim();
    if (rid) fd.append("req_id", rid);
    setBusy(this, true);
    const res = await fetch(base + "/ingest", { method: "POST", body: fd });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    showSummary(`Generated ${data.generated} test case(s) for ${data.req_id}`);
    renderCards(data.test_cases || []);
    lastResult = data;
    toast("Uploaded & generated", "ok");
  } catch (e) {
    toast((e?.message || String(e)).slice(0, 180), "err");
  } finally {
    setBusy(this, false);
  }
};

/* ----------- Downloads ----------- */
document.getElementById("btnDownloadJson").onclick = () => {
  if (!lastResult) return toast("Nothing to download", "err");
  download(
    `${lastResult.req_id || "generated"}-testcases.json`,
    JSON.stringify(lastResult, null, 2),
    "application/json"
  );
};

document.getElementById("btnDownloadCsv").onclick = () => {
  if (!lastResult) return toast("Nothing to download", "err");
  download(
    `${lastResult.req_id || "generated"}-testcases.csv`,
    toCSV(lastResult.test_cases || []),
    "text/csv"
  );
};
