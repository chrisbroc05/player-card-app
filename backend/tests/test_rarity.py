"""Tests for weighted rarity pulls."""

from utils.rarity import (
    PULL_RATES,
    empty_rarity_breakdown,
    is_one_of_one,
    pull_rarity,
    pull_template,
    rarity_display_name,
    resolve_rarity_pull,
)


def test_pull_rates_sum_to_one():
    total = sum(rate for _, rate in PULL_RATES)
    assert abs(total - 1.0) < 1e-9


def test_pull_rarity_returns_known_tier():
    assert pull_rarity() in {name for name, _ in PULL_RATES}


def test_pull_template_in_range():
    for _ in range(20):
        assert 1 <= pull_template() <= 5


def test_rarity_display_name():
    assert rarity_display_name("foil") == "Foil"
    assert rarity_display_name("base") == "Base"


def test_empty_rarity_breakdown_keys():
    breakdown = empty_rarity_breakdown()
    assert set(breakdown.keys()) == {name for name, _ in PULL_RATES}


class _FakeQuery:
    def __init__(self, result):
        self._result = result

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self._result


class _FakeDb:
    def __init__(self, existing=None):
        self._existing = existing

    def query(self, model):
        return _FakeQuery(self._existing)


def test_is_one_of_one_unique_when_none_exists():
    assert is_one_of_one(_FakeDb(None), "FL-2026-000001", "Test Player", "rookie") is True


def test_is_one_of_one_false_when_conflict_exists():
    assert is_one_of_one(_FakeDb(object()), "FL-2026-000002", "Test Player", "rookie") is False


def test_resolve_rarity_pull_returns_template():
    rarity, template = resolve_rarity_pull(
        _FakeDb(None),
        card_id="FL-2026-000003",
        player_name="Test Player",
        tier="rookie",
    )
    assert rarity in {name for name, _ in PULL_RATES}
    assert 1 <= template <= 5
