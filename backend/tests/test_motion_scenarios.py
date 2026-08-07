"""Tests for Runway prompt construction with motion scenarios."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

from config.motion_scenarios import GENERIC_SCENARIO_CONTEXT, get_scenario, MOTION_SCENARIOS
from data.animation_motions import build_runway_prompt, get_motion_prompt


class RunwayPromptScenarioTests(unittest.TestCase):
    def test_scenario_context_in_prompt(self):
        prompt = build_runway_prompt("throwing", "throwing_follow_through", "Focus on red jersey")
        self.assertIsNotNone(prompt)
        scenario = get_scenario("throwing", "throwing_follow_through")
        self.assertIn(scenario["prompt_context"], prompt)
        self.assertIn("Additional context: Focus on red jersey.", prompt)
        self.assertIn("steps into a strong athletic throw", prompt)
        self.assertIn("Photorealistic.", prompt)

    def test_generic_context_when_no_scenario(self):
        prompt = build_runway_prompt("throwing", "none")
        self.assertIn(GENERIC_SCENARIO_CONTEXT, prompt)

    def test_prompt_order_scenario_notes_motion_technical(self):
        prompt = get_motion_prompt(
            "throwing",
            photo_notes="Player on the left",
            scenario_id="throwing_release",
        )
        scenario = get_scenario("throwing", "throwing_release")
        motion_idx = prompt.index(
            "The athlete steps into a strong athletic throw"
        )
        scenario_idx = prompt.index(scenario["prompt_context"])
        notes_idx = prompt.index("Additional context: Player on the left.")
        camera_idx = prompt.index("Static locked-off camera.")
        self.assertLess(scenario_idx, notes_idx)
        self.assertLess(notes_idx, motion_idx)
        self.assertLess(motion_idx, camera_idx)

    def test_all_motions_have_scenario_lists(self):
        expected = {
            "pitch_windup",
            "throwing",
            "hit_homerun",
            "field_dive",
            "catch_framing_throw",
            "celebrate_fist",
            "celebrate_homerun_trot",
            "celebrate_energy",
        }
        self.assertEqual(set(MOTION_SCENARIOS.keys()), expected)
        for motion_id, scenarios in MOTION_SCENARIOS.items():
            self.assertGreater(len(scenarios), 0, motion_id)


if __name__ == "__main__":
    unittest.main()
