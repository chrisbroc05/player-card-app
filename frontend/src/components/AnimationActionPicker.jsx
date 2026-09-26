import React from "react";
import ActionCategoryStep from "./ActionCategoryStep";
import ScenarioSelectionStep from "./ScenarioSelectionStep";
import { klingMotionForCategory } from "../constants/actionCategories";

export default function AnimationActionPicker({
  actionCategory,
  onActionCategoryChange,
  selectedScenarioId,
  onScenarioSelect,
  actionError = "",
  scenarioError = "",
  tier = "rookie",
}) {
  const motionId = actionCategory ? klingMotionForCategory(actionCategory) || "" : "";

  return (
    <div className="grid gap-5">
      <ActionCategoryStep
        value={actionCategory}
        onSelect={onActionCategoryChange}
        onContinue={() => {}}
        error={actionError}
        tier={tier}
        hideContinue
      />

      {actionCategory ? (
        <ScenarioSelectionStep
          categoryId={actionCategory}
          motionId={motionId}
          value={selectedScenarioId}
          onSelect={onScenarioSelect}
          onContinue={() => {}}
          error={scenarioError}
          tier={tier}
          hideContinue
        />
      ) : null}
    </div>
  );
}
