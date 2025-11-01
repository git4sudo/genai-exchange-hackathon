# api/alm_azure.py
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from azure_devops import create_work_item, _require_config

router = APIRouter(prefix="/alm/azure", tags=["ALM - Azure DevOps"])

class Step(BaseModel):
    action: str = Field(..., description="Action step")
    expected: str = Field("", description="Expected result")

class TestCaseIn(BaseModel):
    title: str
    description: Optional[str] = ""
    steps: List[Step] = []
    priority: Optional[int] = 2
    tags: List[str] = []

class PushPayload(BaseModel):
    items: List[TestCaseIn]

@router.post("/push")
def push_to_azure(payload: PushPayload) -> Dict[str, Any]:
    try:
        _require_config()
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    results = []
    for item in payload.items:
        try:
            created = create_work_item(
                title=item.title,
                description=item.description,
                steps=[s.model_dump() for s in item.steps],
                priority=item.priority,
                tags=item.tags,
            )
            results.append({"id": created.get("id"), "url": created.get("url")})
        except Exception as ex:
            # Continue others but report error inline
            results.append({"error": str(ex), "title": item.title})

    # 200 OK even if partial, the client can inspect each item
    return {"count": len(results), "items": results}
