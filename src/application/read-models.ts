import { getEnv } from "@/src/infrastructure/config/env";
import { getScoutRun } from "@/src/application/scout-service";
import {
  getCompany,
  getLatestDossier,
  getOpportunityDetail,
  getRun,
  getSetting,
  listCompanyRows,
  listEligibilityDecisions,
  listOpportunityDetails,
  listReviewHistory,
  listRuns,
} from "@/src/infrastructure/db/repositories";
import { getSchedulerStatus, loadScheduleSetting, schedulerWindow } from "@/src/worker/scheduler";

function latestBy<T extends { companyId: string }>(rows: T[]) {
  const map = new Map<string, T>();
  for (const row of rows) if (!map.has(row.companyId)) map.set(row.companyId, row);
  return map;
}

function latestReviewByTarget(rows: Awaited<ReturnType<typeof listReviewHistory>>) {
  const map = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = `${row.targetType}:${row.targetId}`;
    if (!map.has(key)) map.set(key, row);
  }
  return map;
}

export async function getDashboardReadModel() {
  const [runs, companies, opportunities, reviews] = await Promise.all([
    listRuns(),
    listCompanyRows(),
    listOpportunityDetails(),
    listReviewHistory(),
  ]);
  const latestRun = runs[0] ?? null;
  const validOpportunities = opportunities.filter((row) => row.gate?.passed && row.scorecard);
  const latestReviews = latestReviewByTarget(reviews);
  const reviewedOpportunityIds = new Set(
    opportunities
      .filter((row) => latestReviews.has(`automation_opportunity:${row.opportunity.id}`))
      .map((row) => row.opportunity.id),
  );

  return {
    runs,
    companies,
    opportunities,
    reviews,
    latestRun,
    validOpportunities,
    reviewedOpportunityIds,
    stats: {
      runCount: runs.length,
      companyCount: companies.length,
      opportunityCount: validOpportunities.length,
      reviewCount: reviews.length,
      pendingReviewCount: validOpportunities.filter((row) => !reviewedOpportunityIds.has(row.opportunity.id)).length,
    },
  };
}

export async function getRunReadModel(runId: string) {
  const [run, companies, eligibilityRows, opportunities] = await Promise.all([
    getRun(runId),
    listCompanyRows(),
    listEligibilityDecisions(),
    listOpportunityDetails(),
  ]);
  if (!run) return null;
  const runDetail = await getScoutRun(runId);
  const companyIds = runDetail?.companyIds ?? [];
  const eligibility = latestBy(eligibilityRows);
  const runCompanies = await Promise.all(companyIds.map(async (companyId) => {
    const company = companies.find((row) => row.id === companyId) ?? await getCompany(companyId);
    const dossier = await getLatestDossier(companyId, runId);
    return {
      company,
      eligibility: eligibility.get(companyId) ?? null,
      dossier,
      opportunities: opportunities.filter((row) => row.company.id === companyId),
    };
  }));
  const allWorkItems = runDetail?.workItems ?? [];
  const stageCounts = allWorkItems.reduce<Record<string, number>>((result, item) => {
    result[item.stage] = (result[item.stage] ?? 0) + 1;
    return result;
  }, {});
  const statusCounts = allWorkItems.reduce<Record<string, number>>((result, item) => {
    result[item.status] = (result[item.status] ?? 0) + 1;
    return result;
  }, {});
  const shortlisted = opportunities.filter(
    (row) => companyIds.includes(row.company.id) && row.gate?.passed && row.scorecard,
  );

  return {
    run,
    companies: runCompanies,
    workItems: allWorkItems,
    stageCounts,
    statusCounts,
    shortlisted,
  };
}

export async function getCompanyReadModel(companyId: string) {
  const [company, dossier, opportunities, reviews] = await Promise.all([
    getCompany(companyId),
    getLatestDossier(companyId),
    listOpportunityDetails(),
    listReviewHistory(),
  ]);
  if (!company) return null;
  return {
    company,
    dossier,
    opportunities: opportunities.filter((row) => row.company.id === companyId),
    reviews: reviews.filter((row) => row.targetId === companyId || row.targetId === dossier?.id),
  };
}

export async function getCompaniesReadModel() {
  const [companies, eligibilityRows, opportunities] = await Promise.all([
    listCompanyRows(),
    listEligibilityDecisions(),
    listOpportunityDetails(),
  ]);
  const eligibility = latestBy(eligibilityRows);
  return Promise.all(companies.map(async (company) => ({
    company,
    eligibility: eligibility.get(company.id) ?? null,
    dossier: await getLatestDossier(company.id),
    opportunities: opportunities.filter((row) => row.company.id === company.id),
  })));
}

export async function getOpportunityReadModel(opportunityId: string) {
  return getOpportunityDetail(opportunityId);
}

export async function getReviewsReadModel() {
  const [reviews, opportunities, companies] = await Promise.all([
    listReviewHistory(),
    listOpportunityDetails(),
    listCompanyRows(),
  ]);
  const opportunityMap = new Map(opportunities.map((row) => [row.opportunity.id, row]));
  const companyMap = new Map(companies.map((row) => [row.id, row]));
  return {
    reviews,
    entries: reviews.map((review) => ({
      review,
      opportunity: review.targetType === "automation_opportunity" ? opportunityMap.get(review.targetId) ?? null : null,
      company: review.targetType === "automation_opportunity"
        ? opportunityMap.get(review.targetId)?.company ?? null
        : companyMap.get(review.targetId) ?? null,
    })),
  };
}

export async function getSettingsReadModel() {
  const [schedule, status] = await Promise.all([loadScheduleSetting(), getSchedulerStatus()]);
  const env = getEnv();
  const persisted = await getSetting("weekly_scout_schedule");
  const window = schedulerWindow(new Date(), schedule);
  return {
    schedule,
    status,
    persisted,
    nextOccurrenceUtc: window.next.toISOString(),
    providers: {
      search: env.SEARCH_PROVIDER,
      model: env.MODEL_PROVIDER,
      extractionModel: env.MODEL_EXTRACTION_MODEL,
      reasoningModel: env.MODEL_REASONING_MODEL,
      inlineWorker: env.RUN_INLINE_WORKER,
    },
  };
}
