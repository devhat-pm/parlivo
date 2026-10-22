import pytest
from fastapi.testclient import TestClient
from parlivo_schemas import TranscriptionResult

from parlivo_stt import http
from parlivo_stt.transcriber import Job, Transcriber

from .test_transcriber import FakeEngine, english_pcm

PCM = {"content-type": "application/octet-stream"}


@pytest.fixture
def client() -> TestClient:
    transcriber = Transcriber(FakeEngine(), "cpu", "fake")

    async def handler(job: Job) -> dict[str, object]:
        return transcriber.run(job).model_dump(by_alias=True)

    http.set_handler(handler)
    return TestClient(http.app)


def test_transcribe_returns_the_shared_contract(client: TestClient) -> None:
    response = client.post("/v1/transcribe?language=en", content=english_pcm(), headers=PCM)
    assert response.status_code == 200
    result = TranscriptionResult.model_validate(response.json())
    assert result.is_final
    assert result.text == "hello world"
    assert {"isFinal", "audioMs", "processingMs"} <= response.json().keys()


def test_partial_is_not_final(client: TestClient) -> None:
    response = client.post("/v1/partial", content=english_pcm(), headers=PCM)
    assert response.status_code == 200
    assert response.json()["isFinal"] is False


@pytest.mark.parametrize(
    ("path", "headers", "body", "status"),
    [
        ("/v1/transcribe?language=xx", PCM, b"\x00\x00", 422),
        ("/v1/transcribe", {"content-type": "audio/wav"}, b"\x00\x00", 415),
        ("/v1/transcribe", PCM, b"\x00", 422),
    ],
)
def test_rejects_bad_requests(
    client: TestClient, path: str, headers: dict[str, str], body: bytes, status: int
) -> None:
    assert client.post(path, content=body, headers=headers).status_code == status


def test_health(client: TestClient) -> None:
    assert client.get("/healthz").json() == {"status": "ok"}
