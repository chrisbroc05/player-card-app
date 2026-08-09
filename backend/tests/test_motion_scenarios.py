"""Tests for Runway prompt construction with motion scenarios."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

from config.motion_scenarios import (
    ACTION_CATEGORIES,
    GENERIC_SCENARIO_CONTEXT,
    get_scenario,
    get_scenario_by_category,
    list_action_categories,
    list_scenarios_for_category,
)
from config.prompt_constraints import UNIVERSAL_KLING_CONSTRAINTS
from data.animation_motions import build_runway_prompt, get_motion_prompt


class RunwayPromptScenarioTests(unittest.TestCase):
    def test_nine_action_categories(self):
        categories = list_action_categories()
        self.assertEqual(len(categories), 9)
        self.assertEqual(set(ACTION_CATEGORIES.keys()), {c["id"] for c in categories})

    def test_scenario_prompt_in_final_prompt(self):
        scenario = get_scenario_by_category("throwing", "throw_infield")
        self.assertIsNotNone(scenario)
        prompt = build_runway_prompt(
            "throwing",
            "throw_infield",
            "Focus on red jersey",
            action_category="throwing",
            throwing_hand="right",
        )
        self.assertIsNotNone(prompt)
        self.assertIn(scenario["prompt"], prompt)
        self.assertIn("Additional context: Focus on red jersey.", prompt)
        self.assertIn("RIGHT hand", prompt)
        self.assertIn(UNIVERSAL_KLING_CONSTRAINTS, prompt)

    def test_hitting_uses_batting_side(self):
        prompt = build_runway_prompt(
            "hit_homerun",
            "hit_stance",
            action_category="hitting",
            batting_side="left",
        )
        self.assertIn("LEFT-HANDED", prompt)
        self.assertNotIn("throws with their", prompt)

    def test_generic_context_when_no_scenario(self):
        prompt = build_runway_prompt(
            "throwing",
            "none",
            action_category="throwing",
            throwing_hand="right",
        )
        self.assertIn("Cinematic slow motion sports video.", prompt)

    def test_prompt_order_scenario_handedness_notes_constraints(self):
        prompt = get_motion_prompt(
            "throwing",
            photo_notes="Player on the left",
            scenario_id="throw_catch_mid",
            action_category="throwing",
            throwing_hand="left",
        )
        scenario = get_scenario("throwing", "throw_catch_mid")
        scenario_idx = prompt.index(scenario["prompt"])
        handedness_idx = prompt.index("LEFT hand")
        notes_idx = prompt.index("Additional context: Player on the left.")
        constraints_idx = prompt.index("Only one baseball may appear in any scene")
        self.assertLess(scenario_idx, handedness_idx)
        self.assertLess(handedness_idx, notes_idx)
        self.assertLess(notes_idx, constraints_idx)

    def test_kling_constraints_in_prompt(self):
        prompt = build_runway_prompt(
            "hit_homerun",
            "hit_contact",
            action_category="hitting",
            batting_side="right",
        )
        self.assertIn("Cinematic slow motion sports video.", prompt)
        self.assertIn("Only one baseball may appear in any scene at any time", prompt)
        self.assertIn("Blank jerseys only.", prompt)
        self.assertIn("Animate only the identified athlete.", prompt)
        self.assertIn("must also have no people", prompt)

    def test_fielding_ground_has_six_scenarios(self):
        scenarios = list_scenarios_for_category("fielding_ground")
        self.assertEqual(len(scenarios), 6)

    def test_hitting_has_six_scenarios(self):
        scenarios = list_scenarios_for_category("hitting")
        self.assertEqual(len(scenarios), 6)

    def test_legacy_get_scenario_still_works(self):
        scenario = get_scenario("throwing", "throw_infield")
        self.assertEqual(scenario["id"], "throw_infield")


if __name__ == "__main__":
    unittest.main()
