from parlivo_stt import SERVICE_NAME
from parlivo_stt.main import describe


def test_service_name() -> None:
    assert SERVICE_NAME == "stt"


def test_describe() -> None:
    assert describe() == "parlivo-stt placeholder"
