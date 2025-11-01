import os, json, uuid, re, logging
from datetime import datetime, timezone
from typing import List, Optional, Union

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import traceability
from alm_azure import router as alm_azure_router
import requests
import difflib
# Vertex AI / BigQuery
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from google.cloud import bigquery

# Optional parsers for uploads
from pypdf import PdfReader
from docx import Document
from io import BytesIO

# -------------------- Config --------------------
PROJECT_ID = os.getenv("PROJECT_ID", "orbit-ai-472708")
LOCATION = os.getenv("LOCATION", "us-central1")
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.0-flash-001")
DATASET = os.getenv("DATASET", "orbit_ai_poc")
PROMPT_PATH = os.getenv("PROMPT_PATH", "prompts/prompt_poc_v1.txt")
PROMPT_VER = os.getenv("PROMPT_VERSION", "poc-v1")
CREATED_BY = os.getenv("CREATED_BY", "demo@orbit-ai")

TABLE_REQ = f"{PROJECT_ID}.{DATASET}.requirements"
TABLE_TC = f"{PROJECT_ID}.{DATASET}.generated_testcases"
TABLE_TRL = f"{PROJECT_ID}.{DATASET}.trace_links"

# Jira
JIRA_BASE = os.getenv("JIRA_BASE")
JIRA_USER = os.getenv("JIRA_USER")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN")
JIRA_PROJECT_KEY = os.getenv("JIRA_PROJECT_KEY")
JIRA_ISSUE_TYPE = os.getenv("JIRA_ISSUE_TYPE", "Task")

# -------------------- Lazy Clients --------------------
_bq = None
_vertex_ready = False

log = logging.getLogger("orbit-trace")
logging.basicConfig(level=logging.DEBUG)

def now_ts() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def get_bq():
    global _bq
    if _bq is None:
        _bq = bigquery.Client(project=PROJECT_ID)
    return _bq

def ensure_vertex():
    global _vertex_ready
    if not _vertex_ready:
        vertexai.init(project=PROJECT_ID, location=LOCATION)
        _vertex_ready = True

# -------------------- FastAPI --------------------
origins = [
    "http://localhost:3000",  # frontend (Next.js local)
    "http://127.0.0.1:3000",  # just in case
]
app = FastAPI(title="Orbit AI Test Case Generator API", version="0.4")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- Helpers --------------------
def load_prompt() -> str:
    try:
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        log.warning(f"Prompt file not found at {PROMPT_PATH}: {e}")
        return (
            "You are an expert QA engineer.\n"
            "Requirement ID: {{req_id}}\n"
            "Requirement Text:\n{{requirement_text}}\n"
            "Return STRICT JSON with 'test_cases' array."
        )

def extract_excerpt(requirement_text: str, tc_title: str) -> str:
    """
    Extract the most relevant 1–2 sentence excerpt from the requirement text for a given test case title.
    Uses keyword and fuzzy matching to avoid returning the full document.
    """
    if not requirement_text.strip():
        return ""

    # Normalize input
    req = requirement_text.strip()
    title = (tc_title or "").strip()

    # Break into paragraphs or sentences
    chunks = re.split(r"(?<=[.?!])\s+|\n{2,}", req)
    chunks = [c.strip() for c in chunks if len(c.strip()) > 30]

    # Try fuzzy match to find the best-matching chunk
    best_chunk = ""
    best_score = 0.0
    for chunk in chunks:
        score = difflib.SequenceMatcher(None, title.lower(), chunk.lower()).ratio()
        if score > best_score:
            best_score = score
            best_chunk = chunk

    # If a strong match found, return that paragraph
    if best_chunk and best_score > 0.2:  # relaxed threshold
        log.debug(f"extract_excerpt fuzzy match (score={best_score:.2f}) len={len(best_chunk)}")
        return best_chunk[:600].strip()

    # Otherwise try word-based regex search
    title_words = [w for w in re.findall(r"\w+", title) if len(w) > 3]
    if title_words:
        pattern = "|".join(re.escape(w) for w in title_words)
        m = re.search(pattern, req, flags=re.IGNORECASE)
        if m:
            start = max(0, m.start() - 120)
            end = min(len(req), m.end() + 250)
            excerpt = req[start:end].strip()
            log.debug(f"extract_excerpt regex match len={len(excerpt)}")
            return excerpt

    # Fallback: first paragraph (limited to 400 chars)
    paras = [p.strip() for p in req.split("\n\n") if p.strip()]
    if paras:
        return paras[0][:400].strip()

    # Final fallback: first 300 chars
    return req[:300].strip()

def call_model(prompt: str) -> str:
    ensure_vertex()
    model = GenerativeModel(MODEL_NAME)
    cfg = GenerationConfig(temperature=0.2, max_output_tokens=2048)
    resp = model.generate_content(prompt, generation_config=cfg)
    if getattr(resp, "text", None):
        return resp.text
    parts = resp.candidates[0].content.parts if resp.candidates else []
    return "".join(getattr(p, "text", "") for p in parts)

def save_testcases(req_id: str, tcs: List[dict], text: str, project_id: Optional[str] = None) -> List[dict]:
    rows = []
    BASE_URL = "http://localhost:3000"
    for tc in tcs:
        # Extract excerpt before saving
        excerpt = tc.get("source_excerpt") or text[:300]
        rows.append({
            "test_id": tc.get("test_id") or "TEST-" + uuid.uuid4().hex[:8].upper(),
            "req_id": req_id,
            "title": tc.get("title") or "(no title)",
            "steps": tc.get("steps") or [],
            "expected_result": tc.get("expected_result") or "",
            "preconditions": tc.get("preconditions") or "",
            "severity": tc.get("severity") or "Medium",
            "compliance_tags": tc.get("compliance_tags") or [
                "IEC62304:SW_VER", "ISO13485:DocCtrl", "ISO27001:AccessCtrl"
            ],
            "trace_link": tc.get("trace_link") or f"{BASE_URL}/traceability/{req_id}",
            "source_excerpt": excerpt,
            "model_version": MODEL_NAME,
            "prompt_version": PROMPT_VER,
            "created_at": now_ts(),
            "created_by": CREATED_BY,
            "project_id": project_id or tc.get("project_id", ""),
        })

    errs = get_bq().insert_rows_json(TABLE_TC, rows)
    if errs:
        raise HTTPException(500, f"BigQuery insert errors: {errs}")
    return rows

def sniff_extract_text(filename: str, content: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        reader = PdfReader(BytesIO(content))
        return "\n\n".join(p.extract_text() or "" for p in reader.pages)
    if name.endswith(".docx"):
        doc = Document(BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)
    return content.decode("utf-8", errors="ignore")

def upsert_requirement(req_id: str, title: str, text: str):
    row = [{
        "req_id": req_id,
        "source_type": "upload",
        "source_uri": f"upload://{req_id}",
        "title": title or "(Uploaded)",
        "text": text,
        "checksum": "",
        "created_at": now_ts(),
        "created_by": CREATED_BY
    }]
    errors = get_bq().insert_rows_json(TABLE_REQ, row)
    if errors:
        msg = " ".join(str(e) for e in errors)
        if "duplicate" not in msg.lower():
            raise HTTPException(500, f"Requirement upsert failed: {errors}")

# -------------------- Routes --------------------
app.include_router(traceability.router)
app.include_router(alm_azure_router)  # <-- ADD THIS

@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_NAME, "bq": TABLE_TC}

@app.post("/generate")
def generate(body: dict):
    rid = (body.get("req_id") or f"REQ-{uuid.uuid4().hex[:6].upper()}").strip()
    text = body.get("text", "").strip()

    if not text:
        job = get_bq().query(
            f"SELECT text FROM `{TABLE_REQ}` WHERE req_id=@rid",
            job_config=bigquery.QueryJobConfig(
                query_parameters=[bigquery.ScalarQueryParameter("rid", "STRING", rid)]
            ),
        )
        row = next(iter(job.result()), None)
        if not row:
            raise HTTPException(404, f"Requirement {rid} not found")
        text = row["text"]

    prompt = load_prompt().replace("{{req_id}}", rid).replace("{{requirement_text}}", text)
    out = call_model(prompt)

    try:
        payload = json.loads(re.search(r"\{.*\}", out, re.DOTALL).group(0))
    except Exception:
        raise HTTPException(500, "Model did not return valid JSON")

    tcs = payload.get("test_cases", [])
    if not tcs:
        raise HTTPException(500, "No test_cases returned by model")

    saved = save_testcases(rid, tcs, text)
    return {"req_id": rid, "generated": len(saved), "test_cases": saved}

@app.post("/ingest")
async def ingest_requirement(file: UploadFile = File(...), title: Optional[str] = Form(None)):
    content = await file.read()
    text = sniff_extract_text(file.filename, content)
    rid = f"REQ-{uuid.uuid4().hex[:6].upper()}"
    upsert_requirement(rid, title or file.filename, text)

    prompt = load_prompt().replace("{{req_id}}", rid).replace("{{requirement_text}}", text)
    out = call_model(prompt)
    payload = json.loads(re.search(r"\{.*\}", out, re.DOTALL).group(0))
    tcs = payload.get("test_cases", [])

    saved = save_testcases(rid, tcs, text)
    return {"req_id": rid, "generated": len(saved), "test_cases": saved}
def fill_prompt(template: str, req_id: str, text: str, compliance: Optional[List[str]] = None) -> str:
    """
    Fill the template prompt with requirement details and optional compliance tags.
    """
    tip = ""
    if compliance:
        tip = "\nEmphasize compliance with: " + ", ".join(compliance) + \
              ". Reflect this in severity, steps, expected results, and tags."

    return (
        template
        .replace("{{req_id}}", req_id)
        .replace("{{requirement_text}}", text + tip)
    )

def extract_json(text: str) -> str:
    """
    Extract JSON object from model output.
    Removes Markdown fences (```json ... ```) and returns the first valid JSON block.
    """
    import re

    # Remove Markdown code fences if present
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE)

    # Extract the first JSON object using regex
    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    return match.group(0) if match else cleaned


@app.post("/generate_unified")
async def generate_unified(
    files: Optional[List[UploadFile]] = None,
    links: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    req_id: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    project_id: Optional[str] = Form(None),
):
    """
    Unified endpoint for:
    - Multiple file uploads (PDF/DOCX/TXT/MD)
    - Multiple web links (as JSON array)
    - Free-text description
    - Optional project_id (links to user project history)
    - Existing req_id (re-generation)
    """
    extracted_texts = []
    source_type = "manual"

    # ---- Handle uploaded files ----
    if files:
        for file in files:
            content = await file.read()
            extracted_text = sniff_extract_text(file.filename, content)
            if extracted_text.strip():
                extracted_texts.append(extracted_text)
        source_type = "upload"

    # ---- Handle links ----
    if links:
        try:
            link_list = json.loads(links)
            for link in link_list:
                try:
                    resp = requests.get(link, timeout=10)
                    resp.raise_for_status()
                    raw = resp.text
                    cleaned = re.sub(r"<[^>]+>", "", raw)
                    if cleaned.strip():
                        extracted_texts.append(cleaned.strip())
                except Exception as e:
                    print(f"⚠️ Failed to read link {link}: {e}")
            source_type = "link"
        except Exception as e:
            raise HTTPException(400, f"Invalid links JSON: {e}")

    # ---- Handle free text ----
    if description and description.strip():
        extracted_texts.append(description.strip())
        source_type = "text"

    # ---- Validation ----
    if not extracted_texts:
        raise HTTPException(400, "No valid text provided from file, link, or description.")

    combined_text = "\n\n".join(extracted_texts)
    rid = (req_id or f"REQ-{uuid.uuid4().hex[:6].upper()}").strip()

    # ---- Upsert requirement ----
    upsert_requirement(rid, title or "(Unified Upload)", combined_text)

    # ---- Prepare LLM prompt ----
    prompt = fill_prompt(load_prompt(), rid, combined_text)
    out = call_model(prompt)

    try:
        payload = json.loads(extract_json(out))
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"Model output invalid JSON: {e}")

    tcs = payload.get("test_cases", [])
    if not isinstance(tcs, list) or not tcs:
        raise HTTPException(500, "Model returned no test_cases")

    # ---- Extract focused excerpt ----
    def extract_excerpt(requirement_text: str, tc_title: str) -> str:
        if not requirement_text.strip():
            return ""
        words = [w for w in re.findall(r"\w+", tc_title) if len(w) > 3]
        if words:
            pattern = "|".join(re.escape(w) for w in words)
            m = re.search(pattern, requirement_text, flags=re.IGNORECASE)
            if m:
                start = max(0, m.start() - 150)
                end = min(len(requirement_text), m.end() + 200)
                return requirement_text[start:end].strip()
        # fallback to first paragraph
        paras = [p.strip() for p in requirement_text.split("\n\n") if p.strip()]
        return paras[0][:400] if paras else requirement_text[:300]

    for tc in tcs:
        tc["source_excerpt"] = extract_excerpt(combined_text, tc.get("title", ""))
        if project_id:
            tc["project_id"] = project_id  # link test case to project

    saved = save_testcases(rid, tcs, combined_text, project_id)

    return {
        "ok": True,
        "req_id": rid,
        "title": title or "(Unified Upload)",
        "project_id": project_id,
        "source_type": source_type,
        "generated": len(saved),
        "test_cases": saved,
        "project_id": project_id,
    }

@app.get("/testcases/project/{project_id}")
def get_testcases_by_project(project_id: str):
    """
    Fetch all generated test cases for a given project_id from BigQuery.
    """
    try:
        query = f"""
        SELECT 
            test_id, 
            req_id, 
            title, 
            severity, 
            expected_result, 
            steps, 
            created_at, 
            project_id,
            source_excerpt,
        FROM `{TABLE_TC}`
        WHERE project_id = @pid
        ORDER BY created_at DESC
        """
        job = get_bq().query(
            query,
            job_config=bigquery.QueryJobConfig(
                query_parameters=[bigquery.ScalarQueryParameter("pid", "STRING", project_id)]
            ),
        )

        results = []
        for row in job.result():
            results.append({
                "test_id": row["test_id"],
                "req_id": row["req_id"],
                "title": row["title"],
                "severity": row["severity"],
                "expected_result": row["expected_result"],
                "steps": row["steps"],
                "createdAt": row["created_at"],
                "project_id": row["project_id"],
                "source_excerpt": row["source_excerpt"],
            })

        return {"ok": True, "count": len(results), "test_cases": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching testcases: {e}")
    

class PushBody(BaseModel):
    summary: str
    steps: Optional[List[str]] = None
    test_id: str | None = None
    req_id: str | None = None
    jira_domain: str
    jira_email: str
    jira_api_token: str
    jira_project_key: str
    jira_issue_type: str = "Task"  # optional default


def build_adf_description(summary: str, steps: list[str] | None = None, expected: str | None = None):
    """
    Builds a valid Atlassian Document Format (ADF) JSON for Jira Cloud.
    Steps are rendered as an ordered (numbered) list.
    """
    adf = {
        "type": "doc",
        "version": 1,
        "content": []
    }

    adf["content"].append({
        "type": "paragraph",
        "content": [{"type": "text", "text": f"🧪 {summary or 'No summary provided'}"}]
    })

    if steps and isinstance(steps, list):
        adf["content"].append({
            "type": "orderedList",
            "content": [
                {
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [{"type": "text", "text": step}]
                        }
                    ]
                } for step in steps
            ]
        })

    if expected:
        adf["content"].append({
            "type": "paragraph",
            "content": [{"type": "text", "text": f" Expected Result: {expected}"}]
        })

    return adf

def update_is_pushed_by_test_id(test_ids: Union[str, List[str]], is_pushed: bool):
    """
    Update the Is_pushed column in BigQuery for given test_id(s).
    
    Args:
        test_ids: A single test_id string or a list of test_id strings.
        is_pushed: Boolean value to set for the Is_pushed column.
    """
    client = get_bq()
    table = TABLE_TC

    # Normalize to list
    if isinstance(test_ids, str):
        test_ids = [test_ids]

    if not test_ids:
        raise HTTPException(400, "No test_id(s) provided for update.")

    # Create safe IN clause
    test_id_list = ", ".join([f"'{tid}'" for tid in test_ids])

    query = f"""
        UPDATE `{table}`
        SET Is_pushed = @is_pushed
        WHERE test_id IN ({test_id_list})
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("is_pushed", "BOOL", is_pushed),
        ]
    )

    try:
        client.query(query, job_config=job_config).result()
    except Exception as e:
        raise HTTPException(500, f"BigQuery update failed: {e}")

    return {
        "updated_test_ids": test_ids,
        "is_pushed": is_pushed,
        "updated_count": len(test_ids),
    }

@app.post("/push/jira")
def push_jira(body: PushBody):

    if not (body.jira_domain and body.jira_email and body.jira_api_token and body.jira_project_key):
        raise HTTPException(400, "Missing Jira credentials from request body")

    jira_domain = body.jira_domain.replace("https://", "").replace("http://", "")

    adf = build_adf_description(
        summary=body.summary or f"Test Case {body.test_id}",
        steps=body.steps or None,
        expected=None
    )

    url = f"https://{jira_domain}/rest/api/3/issue"
    payload = {
        "fields": {
            "project": {"key": body.jira_project_key},
            "summary": body.summary or f"Test Case {body.test_id}",
            "description": adf,
            "labels": ["orbit-ai", "test-case"],
            "issuetype": {"name": body.jira_issue_type}
        }
    }

    r = requests.post(
        url,
        json=payload,
        auth=(body.jira_email, body.jira_api_token),
        headers={"Accept": "application/json", "Content-Type": "application/json"}
    )

    if r.status_code not in (200, 201):
        raise HTTPException(500, f"Jira push failed: {r.text}")

    data = r.json()
    issue_key = data.get("key")
    issue_url = f"https://{jira_domain}/browse/{issue_key}"

    update_is_pushed_by_test_id(body.test_id, True)

    return {"ok": True, "external_key": issue_key, "external_url": issue_url}

@app.post("/manual/testcase")
async def create_manual_testcase(body: dict):
    """
    Create a manual test case entry in BigQuery.
    Required fields: title, steps, expected_result, preconditions, severity, project_id, user_id
    """
    try:
        req_id = (body.get("req_id") or f"REQ-{uuid.uuid4().hex[:6].upper()}").strip()
        tc = {
            "test_id": "TEST-" + uuid.uuid4().hex[:8].upper(),
            "req_id": req_id,
            "title": body.get("title") or "(no title)",
            "steps": body.get("steps") or [],
            "expected_result": body.get("expected_result") or "",
            "preconditions": body.get("preconditions") or "",
            "severity": body.get("severity") or "Medium",
            "trace_link": "",
            "source_excerpt": "",
            "model_version": MODEL_NAME,
            "prompt_version": PROMPT_VER,
            "created_at": now_ts(),
            "created_by": body.get("user_id") or "unknown_user",
            "project_id": body.get("project_id") or "",
        }

        errs = get_bq().insert_rows_json(TABLE_TC, [tc])
        if errs:
            log.error(f"Manual test case insert error: {errs}")
            return {"ok": False, "error": str(errs)}

        return {"ok": True, "test_id": tc["test_id"], "req_id" : tc["req_id"], "createdAt": tc["created_at"]}

    except Exception as e:
        log.error(f"Manual test case creation failed: {e}")
        return {"ok": False, "error": str(e)}

