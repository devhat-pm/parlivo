"""Keeps exactly one live translation agent in every room with people in it.

LiveKit does not reliably re-dispatch a room's job when a worker dies: the dead agent stays
in the room until its connection times out (about 20 s), and the retry can target the dead
worker. So every agent heartbeats a participant attribute once a second, and every worker
runs this reconciler, which:
- removes agent participants whose heartbeat is older than STALE_AFTER_S (crashed jobs), and
- explicitly dispatches `parlivo-translator` to rooms that have humans but no live agent.
A dispatch is not repeated for the same room within REDISPATCH_AFTER_S, so a new job has
time to join. If two workers dispatch at once, the later job sees a live agent and exits.
"""

import asyncio
import logging
import threading
import time
from dataclasses import dataclass

from livekit import api

log = logging.getLogger(__name__)

AGENT_NAME = "parlivo-translator"
HEARTBEAT_ATTRIBUTE = "parlivo.heartbeat"
HEARTBEAT_INTERVAL_S = 1.0
STALE_AFTER_S = 4.0
RECONCILE_INTERVAL_S = 1.0
REDISPATCH_AFTER_S = 8.0


@dataclass(frozen=True)
class RoomParticipant:
    identity: str
    is_agent: bool
    heartbeat: float | None  # epoch seconds from the agent's heartbeat attribute


@dataclass(frozen=True)
class RoomPlan:
    remove: list[str]
    dispatch: bool


def heartbeat_of(attributes: dict[str, str]) -> float | None:
    try:
        return float(attributes[HEARTBEAT_ATTRIBUTE])
    except (KeyError, ValueError):
        return None


def is_live_agent(participant: RoomParticipant, now: float) -> bool:
    # An agent that has not sent its first heartbeat yet is still starting: treat it as live.
    if participant.heartbeat is None:
        return True
    return now - participant.heartbeat < STALE_AFTER_S


def plan_room(
    participants: list[RoomParticipant], now: float, last_dispatch: float | None
) -> RoomPlan:
    """What to do for one room. Pure, so the rules are unit-tested."""
    humans = [p for p in participants if not p.is_agent]
    agents = [p for p in participants if p.is_agent]
    stale = [p.identity for p in agents if not is_live_agent(p, now)]
    live = [p for p in agents if is_live_agent(p, now)]
    recently_dispatched = last_dispatch is not None and now - last_dispatch < REDISPATCH_AFTER_S
    return RoomPlan(remove=stale, dispatch=bool(humans) and not live and not recently_dispatched)


class Reconciler:
    def __init__(self, url: str, api_key: str, api_secret: str) -> None:
        self._url = url.replace("ws://", "http://").replace("wss://", "https://")
        self._api_key = api_key
        self._api_secret = api_secret
        self._last_dispatch: dict[str, float] = {}

    async def run_forever(self) -> None:
        async with api.LiveKitAPI(self._url, self._api_key, self._api_secret) as lk:
            while True:
                try:
                    await self.reconcile_once(lk)
                except Exception:
                    log.exception("reconcile failed")
                await asyncio.sleep(RECONCILE_INTERVAL_S)

    async def reconcile_once(self, lk: api.LiveKitAPI) -> None:
        rooms = await lk.room.list_rooms(api.ListRoomsRequest())
        now = time.time()
        for room in rooms.rooms:
            listed = await lk.room.list_participants(api.ListParticipantsRequest(room=room.name))
            participants = [
                RoomParticipant(
                    identity=p.identity,
                    is_agent=p.kind == api.ParticipantInfo.Kind.AGENT,
                    heartbeat=heartbeat_of(dict(p.attributes)),
                )
                for p in listed.participants
            ]
            plan = plan_room(participants, now, self._last_dispatch.get(room.name))
            for identity in plan.remove:
                log.warning("removing stale agent %s from %s", identity, room.name)
                await lk.room.remove_participant(
                    api.RoomParticipantIdentity(room=room.name, identity=identity)
                )
            if plan.dispatch:
                log.info("dispatching %s to %s", AGENT_NAME, room.name)
                await lk.agent_dispatch.create_dispatch(
                    api.CreateAgentDispatchRequest(
                        agent_name=AGENT_NAME,
                        room=room.name,
                        restart_policy=api.JobRestartPolicy.JRP_NEVER,
                    )
                )
                self._last_dispatch[room.name] = now


def start_in_background(url: str, api_key: str, api_secret: str) -> threading.Thread:
    """Run the reconciler on its own event loop beside the LiveKit Agents worker."""

    def target() -> None:
        asyncio.run(Reconciler(url, api_key, api_secret).run_forever())

    thread = threading.Thread(target=target, name="parlivo-reconciler", daemon=True)
    thread.start()
    return thread
