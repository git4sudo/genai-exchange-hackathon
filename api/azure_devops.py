import os
from typing import List, Dict, Any, Optional
import httpx
from dotenv import load_dotenv

# Load env files (local first)
load_dotenv(".env.local", override=True)
load_dotenv()

ADO_BASE = os.getenv("ADO_BASE_URL", "https://dev.azure.com").rstrip("/")
ADO_ORG = os.getenv("ADO_ORG", "").strip()
ADO_PROJECT = os.getenv("ADO_PROJECT", "").strip()
ADO_PAT = os.getenv("ADO_PAT", "").strip()   # <— must be empty default, NOT the real PAT
ADO_WIT_TYPE = os.getenv("ADO_WORK_ITEM_TYPE", "Test Case").strip()

def _require_config():
    missing = [k for k, v in {
        "ADO_ORG": ADO_ORG, "ADO_PROJECT": ADO_PROJECT, "ADO_PAT": ADO_PAT
    }.items() if not v]
    if missing:
        raise RuntimeError(f"Azure DevOps not configured: missing {', '.join(missing)}")

def _client() -> httpx.Client:
    # Basic Auth with empty username + PAT (accepted by ADO)
    return httpx.Client(auth=("", ADO_PAT), timeout=60.0)

def build_tcm_steps(steps: List[Dict[str, str]]) -> str:
    """
    ADO 'Test Case' steps field expects a TCM XML blob.
    We'll generate a minimal, valid structure from [{action, expected}]
    """
    if not steps:
        return ""
    xml_parts = []
    step_id = 2
    for s in steps:
        action = (s.get("action") or "").strip()
        expected = (s.get("expected") or "").strip()
        # CDATA keeps formatting safe; ADO accepts this structure
        xml_parts.append(
            f'<step id="{step_id}" type="ActionStep">'
            f'<parameterizedString isformatted="true"><![CDATA[{action}]]></parameterizedString>'
            f'<parameterizedString isformatted="true"><![CDATA[{expected}]]></parameterizedString>'
            f"</step>"
        )
        step_id += 1
    return f'<steps id="0" last="{step_id}">' + "".join(xml_parts) + "</steps>"

def create_work_item(
    title: str,
    description: Optional[str],
    steps: Optional[List[Dict[str, str]]] = None,
    priority: Optional[int] = 2,
    tags: Optional[List[str]] = None,
    work_item_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Creates a work item in ADO. Defaults to 'Test Case' and writes steps to TCM field.
    If your process doesn't include 'Test Case', set ADO_WORK_ITEM_TYPE to 'Bug' or 'Task'.
    """
    _require_config()
    wit = (work_item_type or ADO_WIT_TYPE).strip()
    url = (
        f"{ADO_BASE}/{ADO_ORG}/{ADO_PROJECT}"
        f"/_apis/wit/workitems/${wit.replace(' ', '%20')}?api-version=7.1-preview.3"
    )

    ops = [
        {"op": "add", "path": "/fields/System.Title", "value": title[:255]},
    ]

    if description:
        ops.append({"op": "add", "path": "/fields/System.Description", "value": description})

    if priority is not None:
        ops.append({"op": "add", "path": "/fields/Microsoft.VSTS.Common.Priority", "value": int(priority)})

    if tags:
        ops.append({"op": "add", "path": "/fields/System.Tags", "value": "; ".join(tags)})

    if wit.lower() == "test case" and steps:
        xml = build_tcm_steps(steps)
        if xml:
            ops.append({"op": "add", "path": "/fields/Microsoft.VSTS.TCM.Steps", "value": xml})

    headers = {"Content-Type": "application/json-patch+json"}

    with _client() as c:
        r = c.post(url, headers=headers, json=ops)
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError as ex:
            # Surface ADO errors nicely
            msg = r.text
            raise RuntimeError(f"ADO create {wit} failed: {ex.response.status_code} :: {msg}") from ex
        return r.json()
