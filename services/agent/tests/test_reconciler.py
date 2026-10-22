from parlivo_agent.reconciler import (
    REDISPATCH_AFTER_S,
    STALE_AFTER_S,
    RoomParticipant,
    heartbeat_of,
    plan_room,
)

NOW = 1_000_000.0
alice = RoomParticipant("alice", is_agent=False, heartbeat=None)


def agent(beat: float | None, identity: str = "agent-1") -> RoomParticipant:
    return RoomParticipant(identity, is_agent=True, heartbeat=beat)


def test_dispatches_to_a_room_with_people_and_no_agent() -> None:
    plan = plan_room([alice], NOW, last_dispatch=None)
    assert plan.dispatch
    assert plan.remove == []


def test_leaves_a_room_with_a_live_agent_alone() -> None:
    plan = plan_room([alice, agent(NOW - 1)], NOW, None)
    assert not plan.dispatch
    assert plan.remove == []


def test_starting_agent_without_heartbeat_counts_as_live() -> None:
    assert not plan_room([alice, agent(None)], NOW, None).dispatch


def test_replaces_a_crashed_agent() -> None:
    plan = plan_room([alice, agent(NOW - STALE_AFTER_S - 0.1)], NOW, None)
    assert plan.remove == ["agent-1"]
    assert plan.dispatch


def test_does_not_redispatch_while_a_new_job_is_joining() -> None:
    assert not plan_room([alice], NOW, last_dispatch=NOW - 2).dispatch
    assert plan_room([alice], NOW, last_dispatch=NOW - REDISPATCH_AFTER_S).dispatch


def test_empty_rooms_get_no_agent_but_stale_ones_are_cleaned() -> None:
    plan = plan_room([agent(NOW - 60)], NOW, None)
    assert plan.remove == ["agent-1"]
    assert not plan.dispatch


def test_heartbeat_parsing() -> None:
    assert heartbeat_of({"parlivo.heartbeat": "12.5"}) == 12.5
    assert heartbeat_of({}) is None
    assert heartbeat_of({"parlivo.heartbeat": "soon"}) is None
