import React from "react";
import { STUDIO_PHASES, getStudioPhase } from "../utils/studioWizardPhases";

export default function StudioPhaseProgress({ currentStep }) {
  const activePhase = getStudioPhase(currentStep);
  const activeMeta = STUDIO_PHASES.find((p) => p.id === activePhase) || STUDIO_PHASES[0];

  return (
    <div className="studio-phase-progress">
      <div className="studio-phase-progress__track" aria-hidden>
        {STUDIO_PHASES.map((phase, index) => {
          const completed = phase.id < activePhase;
          const active = phase.id === activePhase;
          return (
            <React.Fragment key={phase.id}>
              <div className="studio-phase-progress__node-wrap">
                <div
                  className={`studio-phase-progress__node${
                    completed
                      ? " studio-phase-progress__node--completed"
                      : active
                        ? " studio-phase-progress__node--active"
                        : " studio-phase-progress__node--upcoming"
                  }`}
                >
                  {completed ? "✓" : phase.id}
                </div>
                <p
                  className={`studio-phase-progress__label${
                    active
                      ? " studio-phase-progress__label--active"
                      : completed
                        ? " studio-phase-progress__label--completed"
                        : ""
                  }`}
                >
                  {phase.name}
                </p>
              </div>
              {index < STUDIO_PHASES.length - 1 ? (
                <div
                  className={`studio-phase-progress__connector${
                    phase.id < activePhase ? " studio-phase-progress__connector--completed" : ""
                  }`}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
      <p className="studio-phase-progress__hype">{activeMeta.hype}</p>
    </div>
  );
}
