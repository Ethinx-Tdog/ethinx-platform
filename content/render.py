from __future__ import annotations

from typing import Dict
import re

def render_template(template: str, vars: Dict[str, str]) -> str:
    out = template
    for k, v in vars.items():
        out = out.replace("{" + k + "}", v or "")
    # clean up double newlines / trailing spaces
    out = re.sub(r"[ \t]+\n", "\n", out)
    out = re.sub(r"\n{3,}", "\n\n", out).strip()
    return out
