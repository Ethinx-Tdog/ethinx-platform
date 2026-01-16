import tempfile
import unittest
from pathlib import Path

from catalog.validate_catalog import validate_product_file


class CatalogValidatorTests(unittest.TestCase):
    def test_validator_rejects_non_aud_currency(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "usd-product.yaml"
            path.write_text(
                """
            id: usd-product
            name: USD Product
            active: true
            description: "Test"
            metadata:
              ethinx_catalog: "true"
            price:
              amount: "49.00"
              currency: "usd"
              type: "one_time"
            """.strip(),
                encoding="utf-8",
            )

            problems = validate_product_file(path)
            self.assertTrue(any("price.currency" in p for p in problems))


if __name__ == "__main__":
    unittest.main()
