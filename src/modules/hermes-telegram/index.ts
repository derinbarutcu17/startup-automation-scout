import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ProspectPdfFiles } from "@/src/modules/prospect-pdf";

const execFileAsync = promisify(execFile);

export interface TelegramDeliveryResult {
  target: string;
  files: string[];
  status: "sent";
}

function safeFilename(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "prospect-dossier";
}

function targetIsSafe(target: string): boolean {
  return /^telegram(?::[A-Za-z0-9_:@-]+)?$/.test(target);
}

export async function deliverProspectPdfsViaHermes(input: {
  companyName: string;
  fingerprint: string;
  pdfs: ProspectPdfFiles;
  target?: string;
  cliPath?: string;
  directory?: string;
}): Promise<TelegramDeliveryResult> {
  const target = input.target ?? process.env.HERMES_TELEGRAM_TARGET ?? "telegram";
  if (!targetIsSafe(target)) throw new Error("invalid_hermes_telegram_target");
  const cliPath = input.cliPath ?? process.env.HERMES_CLI_PATH ?? "hermes";
  const directory = input.directory ?? process.env.HERMES_DELIVERY_DIRECTORY ?? path.join(process.cwd(), "output", "telegram");
  await mkdir(directory, { recursive: true });
  const base = `${safeFilename(input.companyName)}-prospect-dossier-${input.fingerprint.slice(0, 12)}`;
  const files = [
    { filename: `${base}.pdf`, content: input.pdfs.dossier },
    { filename: `${base}-outreach-brief.pdf`, content: input.pdfs.outreach },
  ];
  const paths: string[] = [];
  for (const file of files) {
    const filePath = path.join(/* turbopackIgnore: true */ directory, file.filename);
    await writeFile(filePath, file.content, { mode: 0o600 });
    paths.push(filePath);
  }
  const message = [
    `Startup Automation Scout dossier for ${safeFilename(input.companyName)}. Redacted PDFs attached.`,
    ...paths.map((filePath) => `[[as_document]] MEDIA:${filePath}`),
  ].join("\n");
  try {
    await execFileAsync(cliPath, ["send", "--to", target, message], { timeout: 45_000, maxBuffer: 2_000_000 });
  } catch (error) {
    const exitCode = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "unknown";
    throw new Error(`hermes_telegram_delivery_failed:${exitCode}`);
  }
  return { target, files: paths, status: "sent" };
}
