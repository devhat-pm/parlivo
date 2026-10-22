from parlivo_bench import SERVICE_NAME
from parlivo_bench.main import describe


def test_service_name() -> None:
    assert SERVICE_NAME == "bench"


def test_describe() -> None:
    assert describe() == "parlivo-bench placeholder"
