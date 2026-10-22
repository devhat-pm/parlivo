from parlivo_tts import SERVICE_NAME
from parlivo_tts.main import describe


def test_service_name() -> None:
    assert SERVICE_NAME == "tts"


def test_describe() -> None:
    assert describe() == "parlivo-tts placeholder"
