"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { approveDraftBatch, createGmailDraftsForApproval, editProspectDraft, prepareOutreach } from "@/src/application/prospect-service";
import { addSuppression, enqueueProspectJob, getProspectDossier, getProspectDossierDetailWithProtectedValues, removeSuppression, updateContactPointStatus } from "@/src/infrastructure/db/repositories-prospect";
import { getEnv } from "@/src/infrastructure/config/env";

function requiredString(fd: FormData, key: string) {
  const v = fd.get(key);
  if (typeof v !== "string" || !v.trim()) throw new Error(`${key} is required`);
  return v.trim();
}

function friendly(e: unknown) {
  if (e instanceof z.ZodError) return e.issues.map((i) => i.message).join("; ");
  return e instanceof Error ? e.message : "Something went wrong";
}

async function drainInlineWorkerIfEnabled(): Promise<void> {
  if (!getEnv().RUN_INLINE_WORKER) return;
  const { runWorker } = await import("@/src/worker/index");
  await runWorker({ drain: true });
}

async function enqueueDossierJob(dossierId: string, jobType: "people_research" | "angle_generation" | "draft_generation", payload: Record<string, unknown> = {}): Promise<void> {
  const dossier = await getProspectDossier(dossierId);
  if (!dossier) throw new Error("prospect_dossier_not_found");
  await enqueueProspectJob({
    prospectDossierId: dossier.id,
    companyId: dossier.companyId,
    opportunityId: dossier.opportunityId,
    jobType,
    payload,
  });
  await drainInlineWorkerIfEnabled();
}

export async function prepareOutreachAction(formData: FormData) {
  const companyId = requiredString(formData, "companyId");
  const opportunityId = requiredString(formData, "opportunityId");
  let dossierId: string;
  try {
    const result = await prepareOutreach(companyId, opportunityId);
    dossierId = result.dossierId;
    await drainInlineWorkerIfEnabled();
  } catch (e) {
    throw new Error(friendly(e));
  }
  revalidatePath(`/prospects`);
  revalidatePath(`/prospects/${dossierId}`);
  redirect(`/prospects/${dossierId}`);
}

export async function generateAnglesAction(formData: FormData) {
  const dossierId = requiredString(formData, "prospectDossierId");
  const targetPersonId = formData.get("targetPersonId")?.toString() || null;
  try {
    await enqueueDossierJob(dossierId, "angle_generation", { targetPersonId });
    revalidatePath(`/prospects/${dossierId}`);
  } catch (e) {
    throw new Error(friendly(e));
  }
  redirect(`/prospects/${dossierId}`);
}

export async function generateDraftsAction(formData: FormData) {
  const dossierId = requiredString(formData, "prospectDossierId");
  const angleId = requiredString(formData, "angleId");
  const contactPointId = requiredString(formData, "contactPointId");
  try {
    await enqueueDossierJob(dossierId, "draft_generation", { angleId, contactPointId });
    revalidatePath(`/prospects/${dossierId}`);
  } catch (e) {
    throw new Error(friendly(e));
  }
  redirect(`/prospects/${dossierId}`);
}

export async function editDraftAction(formData: FormData) {
  const dossierId = requiredString(formData, "prospectDossierId");
  const draftId = requiredString(formData, "draftId");
  const subject = requiredString(formData, "subject");
  const body = requiredString(formData, "body");
  try {
    await editProspectDraft(dossierId, draftId, subject, body);
    revalidatePath(`/prospects/${dossierId}`);
  } catch (e) {
    throw new Error(friendly(e));
  }
  redirect(`/prospects/${dossierId}`);
}

export async function approveDraftsAction(formData: FormData) {
  const dossierId = requiredString(formData, "prospectDossierId");
  const draftIds = formData.getAll("draftId").map((v) => String(v)).filter(Boolean);
  if (!draftIds.length) throw new Error("Select at least one draft");
  try {
    await approveDraftBatch(dossierId, draftIds, "owner");
    revalidatePath(`/prospects/${dossierId}`);
  } catch (e) {
    throw new Error(friendly(e));
  }
  redirect(`/prospects/${dossierId}`);
}

export async function createGmailDraftsAction(formData: FormData) {
  const dossierId = requiredString(formData, "prospectDossierId");
  const approvalId = requiredString(formData, "approvalId");
  try {
    await createGmailDraftsForApproval(dossierId, approvalId);
    revalidatePath(`/prospects/${dossierId}`);
  } catch (e) {
    throw new Error(friendly(e));
  }
  redirect(`/prospects/${dossierId}`);
}

export async function addSuppressionAction(formData: FormData) {
  try {
    const scope = requiredString(formData, "scope");
    const value = requiredString(formData, "value");
    const reason = requiredString(formData, "reason");
    await addSuppression({ scope, normalizedValue: value, reason, source: "manual", createdBy: "owner" });
    revalidatePath("/prospects");
    revalidatePath("/settings");
  } catch (e) {
    throw new Error(friendly(e));
  }
  redirect("/settings");
}

export async function removeSuppressionAction(formData: FormData) {
  const id = requiredString(formData, "id");
  await removeSuppression(id);
  revalidatePath("/settings");
  revalidatePath("/prospects");
  redirect("/settings");
}

export async function inlinePeopleResearchAction(formData: FormData) {
  const dossierId = requiredString(formData, "prospectDossierId");
  try {
    await enqueueDossierJob(dossierId, "people_research");
    revalidatePath(`/prospects/${dossierId}`);
  } catch (e) {
    throw new Error(friendly(e));
  }
  redirect(`/prospects/${dossierId}`);
}

async function updateDossierContactStatus(formData: FormData, status: "user_confirmed" | "rejected") {
  const dossierId = requiredString(formData, "prospectDossierId");
  const contactId = requiredString(formData, "contactPointId");
  const detail = await getProspectDossierDetailWithProtectedValues(dossierId);
  if (!detail || !detail.contacts.some((contact) => contact.id === contactId)) throw new Error("contact_not_in_dossier");
  try {
    await updateContactPointStatus(contactId, status);
    revalidatePath(`/prospects/${dossierId}`);
  } catch (e) {
    throw new Error(friendly(e));
  }
  redirect(`/prospects/${dossierId}`);
}

export async function confirmContactAction(formData: FormData) {
  return updateDossierContactStatus(formData, "user_confirmed");
}

export async function rejectContactAction(formData: FormData) {
  return updateDossierContactStatus(formData, "rejected");
}
