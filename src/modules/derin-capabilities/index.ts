export interface DerinCapabilityOffer {
  capability: string;
  whatDerinCanDo: string;
  whyItMayFit: string;
  proofLinks: string[];
}

const offers: DerinCapabilityOffer[] = [
  { capability: "Product design", whatDerinCanDo: "Turn a messy workflow into a clear product flow, interface, or prototype that a team can test.", whyItMayFit: "Useful when the opportunity involves handoffs, review queues, or a confusing user journey.", proofLinks: ["https://derinb.vercel.app/"] },
  { capability: "AI and ML workflows", whatDerinCanDo: "Design human-in-the-loop flows that make AI suggestions, edge cases, and approvals understandable.", whyItMayFit: "Useful when automation needs trust, review, or a clear boundary between people and models.", proofLinks: ["https://derinb.vercel.app/"] },
  { capability: "Agent-native tools", whatDerinCanDo: "Shape tools and interfaces that make agent actions inspectable, useful, and safe to review.", whyItMayFit: "Useful when a product is adding AI agents or wants operational work to be completed through tools.", proofLinks: ["https://github.com/derinbarutcu17/costmaxx", "https://github.com/derinbarutcu17"] },
  { capability: "Data visualization", whatDerinCanDo: "Make operational data and opportunities easier to see, compare, and act on.", whyItMayFit: "Useful when a team has complex data but needs a sharper decision surface for customers or operators.", proofLinks: ["https://derinbarutcu17.github.io/VentureAtlas", "https://derinb.vercel.app/"] },
];

export function recommendDerinCapabilities(context: { proposedSystem?: string | null; angleText?: string | null }): DerinCapabilityOffer[] {
  const text = `${context.proposedSystem ?? ""} ${context.angleText ?? ""}`.toLowerCase();
  const keywords: Record<string, string[]> = {
    "Product design": ["interface", "workflow", "user", "product", "experience"],
    "AI and ML workflows": ["ai", "ml", "model", "review", "classification", "triage", "prediction"],
    "Agent-native tools": ["agent", "tool", "assistant", "automation", "orchestration"],
    "Data visualization": ["data", "dashboard", "analytics", "report", "metric", "visual"],
  };
  return [...offers].sort((a, b) => keywords[b.capability].filter((word) => text.includes(word)).length - keywords[a.capability].filter((word) => text.includes(word)).length);
}
