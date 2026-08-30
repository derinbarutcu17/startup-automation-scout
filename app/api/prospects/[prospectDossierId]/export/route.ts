import { NextResponse } from "next/server";
import { exportProspectBundle } from "@/src/application/prospect-service";

function safeFilename(value: unknown): string {
  return String(value ?? "prospect-dossier").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "prospect-dossier";
}

export async function GET(request: Request, context: { params: Promise<{ prospectDossierId: string }> }) {
  const { prospectDossierId } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const format = searchParams.get("format") ?? "markdown";
  const includeContacts = searchParams.get("includeContacts") === "true";
  if (format !== "markdown" && format !== "json") return NextResponse.json({ error: "format must be markdown or json" }, { status: 400 });
  try {
    const bundle = await exportProspectBundle(prospectDossierId, { includeContacts });
    const company = (bundle.json.company as { canonicalName?: string } | undefined)?.canonicalName;
    const contactSuffix = includeContacts ? "-verified-contacts" : "";
    const filename = `${safeFilename(company)}-prospect-dossier${contactSuffix}.${format === "json" ? "json" : "md"}`;
    const body = format === "json" ? JSON.stringify(bundle.json, null, 2) : bundle.markdown;
    return new NextResponse(body, {
      headers: {
        "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 404 });
  }
}
