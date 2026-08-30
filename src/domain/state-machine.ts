const stagePath = [
  "CREATED",
  "DISCOVERING",
  "RESOLVING",
  "SCREENING",
  "RESEARCHING",
  "ANALYZING",
  "VALIDATING",
  "RANKING",
  "READY_FOR_REVIEW",
] as const;

export type RunStage = (typeof stagePath)[number];

export function canTransitionRunStage(from: RunStage, to: RunStage): boolean {
  const fromIndex = stagePath.indexOf(from);
  return fromIndex >= 0 && stagePath[fromIndex + 1] === to;
}

export function transitionRunStage(from: RunStage, to: RunStage): RunStage {
  if (!canTransitionRunStage(from, to)) {
    throw new Error(`Illegal run stage transition: ${from} -> ${to}`);
  }
  return to;
}

export const stageSequence = [...stagePath];
