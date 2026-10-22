"""LiveKit Agents worker: one translation job per room (ARCHITECTURE.md sections 2 and 4).

Phase 1 skeleton: the "translation" is an echo of each speaker's clause audio on
translated-{speakerId}-echo, with live captions from the STT service.
"""

import asyncio
import contextlib
import logging
import time

from livekit import rtc
from livekit.agents import AutoSubscribe, JobContext, JobExecutorType, JobProcess, WorkerOptions
from livekit.agents import cli as agents_cli
from livekit.plugins import silero
from parlivo_schemas import CaptionMessage
from parlivo_schemas.captions import CAPTIONS_TOPIC

from parlivo_agent.echo import EchoTracks
from parlivo_agent.metrics import setup_telemetry
from parlivo_agent.participants import is_human, languages, listener
from parlivo_agent.reconciler import (
    AGENT_NAME,
    HEARTBEAT_ATTRIBUTE,
    HEARTBEAT_INTERVAL_S,
    heartbeat_of,
    start_in_background,
)
from parlivo_agent.settings import load_settings
from parlivo_agent.speaker import SpeakerPipeline
from parlivo_agent.stt_client import SttClient
from parlivo_agent.tracks import ECHO_LANGUAGE, TranslatedTrack, allowed_track_sids

log = logging.getLogger("parlivo.agent")


def prewarm(process: JobProcess) -> None:
    # One Silero model per process; each speaker gets its own stream from it.
    process.userdata["vad"] = silero.VAD.load(
        min_silence_duration=0.3, activation_threshold=0.5, sample_rate=16000
    )


async def entrypoint(ctx: JobContext) -> None:
    settings = load_settings()
    telemetry = setup_telemetry()
    stt = SttClient(settings.stt_url)
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    room = ctx.room
    if _another_live_agent(room):
        # Two workers dispatched at once (see reconciler.py): keep the first agent.
        log.info("another live agent is already in %s; leaving", room.name)
        ctx.shutdown(reason="duplicate agent")
        return
    heartbeat = asyncio.create_task(_heartbeat(room))
    pipelines: dict[str, SpeakerPipeline] = {}
    background: set[asyncio.Task[None]] = set()

    def update_permissions() -> None:
        """Each human may subscribe only to echo tracks of other speakers (section 9)."""
        tracks = [
            TranslatedTrack(sid=sid, speaker_id=speaker, language=ECHO_LANGUAGE)
            for speaker, sid in echo.published().items()
        ]
        permissions = [
            rtc.ParticipantTrackPermission(
                participant_identity=participant.identity,
                allow_all=False,
                allowed_track_sids=allowed_track_sids(listener(participant), tracks),
            )
            for participant in room.remote_participants.values()
            if is_human(participant)
        ]
        room.local_participant.set_track_subscription_permissions(
            allow_all_participants=False, participant_permissions=permissions
        )

    echo = EchoTracks(room, update_permissions)

    async def send_caption(message: CaptionMessage) -> None:
        await room.local_participant.publish_data(
            message.to_json(), reliable=True, topic=CAPTIONS_TOPIC
        )

    def start_pipeline(track: rtc.Track, participant: rtc.RemoteParticipant) -> None:
        if (
            not isinstance(track, rtc.RemoteAudioTrack)
            or not is_human(participant)
            or participant.identity in pipelines
        ):
            return
        speaking, _ = languages(participant)
        pipeline = SpeakerPipeline(
            room_name=room.name,
            speaker_id=participant.identity,
            language=speaking,
            track=track,
            vad=ctx.proc.userdata["vad"],
            stt=stt,
            echo=echo,
            send_caption=send_caption,
            telemetry=telemetry,
        )
        pipelines[participant.identity] = pipeline
        pipeline.start()
        log.info("listening to %s (%s)", participant.identity, speaking)

    def stop_pipeline(identity: str) -> None:
        pipeline = pipelines.pop(identity, None)
        if pipeline is not None:
            task = asyncio.create_task(pipeline.aclose())
            background.add(task)
            task.add_done_callback(background.discard)

    @room.on("track_subscribed")
    def on_track_subscribed(
        track: rtc.Track,
        _publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ) -> None:
        start_pipeline(track, participant)

    @room.on("track_unsubscribed")
    def on_track_unsubscribed(
        _track: rtc.Track,
        _publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ) -> None:
        stop_pipeline(participant.identity)

    @room.on("participant_connected")
    def on_participant_connected(_participant: rtc.RemoteParticipant) -> None:
        update_permissions()

    @room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant) -> None:
        stop_pipeline(participant.identity)
        update_permissions()

    @room.on("participant_metadata_changed")
    def on_metadata_changed(_participant: rtc.Participant, _old: str, _new: str) -> None:
        update_permissions()

    for participant in room.remote_participants.values():
        for publication in participant.track_publications.values():
            if publication.track is not None:
                start_pipeline(publication.track, participant)
    update_permissions()

    async def shutdown() -> None:
        heartbeat.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await heartbeat
        for identity in list(pipelines):
            stop_pipeline(identity)
        await echo.aclose()
        await stt.close()

    ctx.add_shutdown_callback(shutdown)


async def _heartbeat(room: rtc.Room) -> None:
    while True:
        await room.local_participant.set_attributes({HEARTBEAT_ATTRIBUTE: f"{time.time():.3f}"})
        await asyncio.sleep(HEARTBEAT_INTERVAL_S)


def _another_live_agent(room: rtc.Room) -> bool:
    now = time.time()
    for participant in room.remote_participants.values():
        if is_human(participant):
            continue
        beat = heartbeat_of(dict(participant.attributes))
        if beat is not None and now - beat < 4.0:
            return True
    return False


def main() -> None:
    settings = load_settings()
    # Dispatches rooms and recovers them after a crash (LiveKit does not reliably do it).
    start_in_background(settings.livekit_url, settings.livekit_api_key, settings.livekit_api_secret)
    agents_cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            # Jobs share the worker process, so the Prometheus endpoint and the Silero model
            # are set up once; a crash takes all of this worker's rooms with it (D5 covers it).
            job_executor_type=JobExecutorType.THREAD,
            # Explicit dispatch: rooms get an agent from the reconciler, not automatically.
            agent_name=AGENT_NAME,
            ws_url=settings.livekit_url,
            api_key=settings.livekit_api_key,
            api_secret=settings.livekit_api_secret,
        )
    )
