from ethinx.marketing.generate_founder_post import generate
from ethinx.posting.materialize_linkedin import write_linkedin_post

def wire_founder_content(order_id: str):
    promo, body = generate("founder", order_id)
    write_linkedin_post(order_id, promo, body)
