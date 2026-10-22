import pytest

from parlivo_stt.settings import load_settings


def test_defaults_to_cpu_tiny_on_port_8300() -> None:
    settings = load_settings({})
    assert (settings.mode, settings.model, settings.port) == ("cpu", "tiny", 8300)
    assert settings.batch_wait_s == pytest.approx(0.02)


@pytest.mark.parametrize(
    ("mode", "model"),
    [("mac", "mlx-community/whisper-large-v3-turbo"), ("gpu", "large-v3-turbo")],
)
def test_mode_selects_model(mode: str, model: str) -> None:
    assert load_settings({"STT_MODE": mode}).model == model


def test_model_override_and_invalid_mode() -> None:
    assert load_settings({"STT_MODE": "cpu", "STT_MODEL": "base"}).model == "base"
    with pytest.raises(ValueError, match="STT_MODE"):
        load_settings({"STT_MODE": "tpu"})
