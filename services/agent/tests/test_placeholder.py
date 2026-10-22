from parlivo_agent import SERVICE_NAME
from parlivo_agent.main import describe


def test_service_name() -> None:
    assert SERVICE_NAME == "agent"


def test_describe() -> None:
    assert describe() == "parlivo-agent placeholder"
