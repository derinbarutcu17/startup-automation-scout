#!/usr/bin/env tsx
/* Dump live scout run evidence into docs/evidence.json (source for README graphics). */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const container = execFileSync("docker", ["ps", "-qf", "name=startup-automation-scout-postgres"]).toString().trim().split("\n")[0];
const q = (sqlText: string) =>
  execFileSync("docker", ["exec", container, "psql", "-U", "scout", "-d", "scout", "-t", "-A", "-c", sqlText]).toString("utf8").trim();

const one = (sqlText: string) => Number(q(sqlText).split("\n")[0] || 0);

const evidence = {
  generatedAt: new Date().toISOString(),
  companiesResearched: one(`select count(distinct id) from companies where canonical_domain not like '%fixtures%'`),
  excludedCompanies: one(`select count(*) from eligibility_decisions where eligible = false and reason_codes::text like '%excluded%'`),
  opportunities: one(`select count(*) from automation_opportunities`),
  verifiedHighClaims: one(`select count(*) from claims where claim_type='verified' and confidence='high'`),
  byCompany: {
    N8n: { sources: one(`select count(*) from source_documents where company_id=(select id from companies where canonical_name='N8n') and retrieval_status='retrieved'`), verifiedHigh: one(`select count(*) from claims where company_id=(select id from companies where canonical_name='N8n') and claim_type='verified' and confidence='high'`) },
    Taktile: { sources: one(`select count(*) from source_documents where company_id=(select id from companies where canonical_name='Taktile') and retrieval_status='retrieved'`), verifiedHigh: one(`select count(*) from claims where company_id=(select id from companies where canonical_name='Taktile') and claim_type='verified' and confidence='high'`) },
    Impargo: { sources: one(`select count(*) from source_documents where company_id=(select id from companies where canonical_name='Impargo') and retrieval_status='retrieved'`), verifiedHigh: one(`select count(*) from claims where company_id=(select id from companies where canonical_name='Impargo') and claim_type='verified' and confidence='high'`) },
  },
};
writeFileSync("docs/evidence.json", JSON.stringify(evidence, null, 2) + "\n");
console.log("evidence written:", JSON.stringify(evidence));
