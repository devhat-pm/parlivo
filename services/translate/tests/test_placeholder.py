from parlivo_translate import SERVICE_NAME
from parlivo_translate.main import describe


def test_service_name() -> None:
    assert SERVICE_NAME == "translate"


def test_describe() -> None:
    assert describe() == "parlivo-translate placeholder"
