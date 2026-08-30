import type { Confidence } from "@/src/domain/types";

export const OPPORTUNITY_RUBRIC_VERSION = "v0.1-prebuild";
export const COMPANY_RUBRIC_VERSION = "v0.1-prebuild";

export const opportunityWeights = {
  evidenceStrength: 20,
  painPlausibility: 15,
  automationLeverage: 20,
  measurability: 15,
  buildability: 15,
  differentiation: 5,
  portfolioCareerSignal: 10,
} as const;

export const companyWeights = {
  recentSignal: 20,
  stageFit: 10,
  evidenceDensity: 15,
  workflowVisibility: 20,
  automationLeverage: 20,
  personalCareerRelevance: 10,
  accessPlausibility: 5,
} as const;

type Dimensions<T extends Record<string, number>> = { [K in keyof T]: number };

export function weightedScore<T extends Record<string, number>>(dimensions: Dimensions<T>, weights: T): number {
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const value = Number(dimensions[key as keyof T]);
    if (!Number.isInteger(value) || value < 0 || value > 4) throw new Error(`Invalid 0-4 score for ${key}`);
    total += (value / 4) * weight;
  }
  return Math.round(total * 1000) / 1000;
}

export interface RankedOpportunity<T> {
  item: T;
  score: number;
  confidence: Confidence;
}

const confidenceRank: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

export function rankWithUncertainty<T extends { id: string }>(
  items: RankedOpportunity<T>[],
  uncertaintyBand = 3,
): RankedOpportunity<T>[] {
  return [...items].sort((a, b) => {
    const delta = b.score - a.score;
    if (Math.abs(delta) <= uncertaintyBand && confidenceRank[a.confidence] !== confidenceRank[b.confidence]) {
      return confidenceRank[b.confidence] - confidenceRank[a.confidence];
    }
    if (delta !== 0) return delta;
    return a.item.id.localeCompare(b.item.id);
  });
}
