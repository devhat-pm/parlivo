from parlivo_ai import SERVICE_NAME
from parlivo_ai.main import describe


def test_service_name() -> None:
    assert SERVICE_NAME == "ai"


def test_describe() -> None:
    assert describe() == "parlivo-ai placeholder"
