"use client";

import { useMemo, useState } from "react";

export type ExerciseDetailSectionsLabels = {
  executionTab: string;
  musclesTab: string;
  executionPrepTitle: string;
  executionMoveTitle: string;
  executionTipsTitle: string;
  executionEmpty: string;
  muscleMapPlaceholder?: string;
  primaryMusclesTitle: string;
  secondaryMusclesTitle: string;
  secondaryMusclesEmpty: string;
  noMusclesFallback?: string;
};

type ExerciseDetailSectionsProps = {
  description?: string | null;
  technique?: string | null;
  tips?: string | null;
  primaryMuscles?: string[] | null;
  secondaryMuscles?: string[] | null;
  labels: ExerciseDetailSectionsLabels;
  defaultTab?: "execution" | "muscles";
};

export function ExerciseDetailSections({
  description,
  technique,
  tips,
  primaryMuscles,
  secondaryMuscles,
  labels,
  defaultTab = "execution",
}: ExerciseDetailSectionsProps) {
  const executionBlocks = useMemo(() => [description, technique, tips].filter(Boolean), [description, technique, tips]);
  const primaryList = useMemo(() => (primaryMuscles ?? []).filter(Boolean), [primaryMuscles]);
  const secondaryList = useMemo(() => (secondaryMuscles ?? []).filter(Boolean), [secondaryMuscles]);
  const hasExecutionDetails = executionBlocks.length > 0;
  const hasMuscleDetails = primaryList.length > 0 || secondaryList.length > 0;
  const availableTabs = useMemo(
    () =>
      [
        { id: "execution" as const, label: labels.executionTab, visible: hasExecutionDetails },
        { id: "muscles" as const, label: labels.musclesTab, visible: hasMuscleDetails },
      ].filter((tab) => tab.visible),
    [hasExecutionDetails, hasMuscleDetails, labels.executionTab, labels.musclesTab]
  );
  const [activeTab, setActiveTab] = useState<"execution" | "muscles">(() => {
    if (availableTabs.some((tab) => tab.id === defaultTab)) {
      return defaultTab;
    }
    return availableTabs[0]?.id ?? "execution";
  });
  const tabIds = useMemo(
    () => ({
      execution: {
        tabId: "exercise-detail-tab-execution",
        panelId: "exercise-detail-panel-execution",
      },
      muscles: {
        tabId: "exercise-detail-tab-muscles",
        panelId: "exercise-detail-panel-muscles",
      },
    }),
    []
  );

  if (availableTabs.length === 0) return null;
  const showTabs = availableTabs.length > 1;
  const executionLabelledBy = showTabs ? tabIds.execution.tabId : undefined;
  const musclesLabelledBy = showTabs ? tabIds.muscles.tabId : undefined;

  return (
    <div className="stack-lg">
      {showTabs ? (
        <div className="tab-list mt-20" role="tablist" aria-label={labels.executionTab}>
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              id={tabIds[tab.id].tabId}
              aria-controls={tabIds[tab.id].panelId}
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {activeTab === "execution" && hasExecutionDetails ? (
        <div
          className="tab-panel"
          role="tabpanel"
          id={tabIds.execution.panelId}
          aria-labelledby={executionLabelledBy}
          aria-label={!showTabs ? labels.executionTab : undefined}
          tabIndex={0}
        >
          {description ? (
            <div className="feature-card">
              <h3>{labels.executionPrepTitle}</h3>
              <p className="muted mt-8">{description}</p>
            </div>
          ) : null}
          {technique ? (
            <div className="feature-card">
              <h3>{labels.executionMoveTitle}</h3>
              <p className="muted mt-8">{technique}</p>
            </div>
          ) : null}
          {tips ? (
            <div className="feature-card">
              <h3>{labels.executionTipsTitle}</h3>
              <p className="muted mt-8">{tips}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "muscles" && hasMuscleDetails ? (
        <div
          className="tab-panel"
          role="tabpanel"
          id={tabIds.muscles.panelId}
          aria-labelledby={musclesLabelledBy}
          aria-label={!showTabs ? labels.musclesTab : undefined}
          tabIndex={0}
        >
          {labels.muscleMapPlaceholder ? (
            <div className="feature-card muscle-map">
              <span className="muted">{labels.muscleMapPlaceholder}</span>
            </div>
          ) : null}
          <div className="list-grid">
            {primaryList.length > 0 ? (
              <div className="feature-card">
                <h3>{labels.primaryMusclesTitle}</h3>
                <ul className="muted list-muted">
                  {primaryList.map((muscle, index) => (
                    <li key={`${muscle}-${index}`}>{muscle}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {secondaryList.length > 0 ? (
              <div className="feature-card">
                <h3>{labels.secondaryMusclesTitle}</h3>
                <ul className="muted list-muted">
                  {secondaryList.map((muscle, index) => (
                    <li key={`${muscle}-${index}`}>{muscle}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
