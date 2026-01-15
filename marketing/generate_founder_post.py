from pathlib import Path
from ethinx.modules.promo_selector import select_promo

def generate_founder_body(pillar: str) -> str:
    # Deterministic body blocks per pillar
    blocks = {
        "anti_employment": [
            "Employment optimises for dependency.",
            "Founders optimise for autonomy.",
            "I build systems so work executes without permission."
        ],
        "autonomy": [
            "Autonomy comes from systems, not motivation.",
            "Triggers in. Outcomes out.",
            "If it needs a human, it’s unfinished."
        ],
        "proof": [
            "This system ran unattended.",
            "Order in → delivery out.",
            "Screenshots exist. Logs exist. Job done."
        ],
        "systems": [
            "Pipelines beat people.",
            "Determinism beats hustle.",
            "Operators should be dumb by design."
        ],
    }
    return "\n\n".join(blocks.get(pillar, []))

def generate(kind: str, order_id: str):
    promo = select_promo(kind)
    body = generate_founder_body(promo["pillar"])
    return promo, body
