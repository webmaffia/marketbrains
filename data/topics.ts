import type { Topic } from "@/types";

export const topics: Topic[] = [
  { slug: "banking", name: "Banking", kind: "sector", description: "Lenders, deposits, credit cycles and regulation." },
  { slug: "it-services", name: "IT Services", kind: "sector", description: "Outsourcing, consulting and the AI shift." },
  { slug: "ev", name: "Electric Vehicles", kind: "sector", description: "EV makers, batteries and charging." },
  { slug: "energy", name: "Energy", kind: "sector", description: "Oil, gas, renewables and the transition." },
  { slug: "ai-boom", name: "AI Boom", kind: "theme", description: "Who captures value from the AI build-out?" },
  { slug: "dividend-investing", name: "Dividend Investing", kind: "theme", description: "Income, payout sustainability and growth." },
  { slug: "long-term-investing", name: "Long-Term Investing", kind: "theme", description: "Compounding, patience and conviction." },
  { slug: "earnings-season", name: "Earnings Season", kind: "topic", description: "Quarterly results, call notes and reactions." },
  { slug: "beginners", name: "Beginners", kind: "topic", description: "No question is too basic. Learn together." },
  { slug: "valuation-debates", name: "Valuation Debates", kind: "topic", description: "How should we value this business?" },
  { slug: "ipos", name: "IPOs", kind: "topic", description: "New listings and what to read in the prospectus." },
];
