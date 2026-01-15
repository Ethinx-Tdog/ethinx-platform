# File: ethinx/ui/dashboard.py

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from ethinx.api.server import RUNS

router = APIRouter()
templates = Jinja2Templates(directory="ethinx/ui/templates")

@router.get("/", response_class=HTMLResponse)
def dashboard(request: Request):
    runs = [
        {
            "id": run_id,
            "trends": len(data["trends"]),
            "hooks": len(data["hooks"]),
            "scripts": len(data["scripts"]),
        }
        for run_id, data in RUNS.items()
    ]
    return templates.TemplateResponse("dashboard.html", {"request": request, "runs": runs})

@router.get("/run/{run_id}", response_class=HTMLResponse)
def run_detail(request: Request, run_id: str):
    data = RUNS.get(run_id)
    if not data:
        return templates.TemplateResponse("404.html", {"request": request})
    return templates.TemplateResponse("run_detail.html", {"request": request, "data": data, "run_id": run_id})
