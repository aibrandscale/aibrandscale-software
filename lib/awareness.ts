export const AWARENESS_LEVELS = [
  "Unaware",
  "Problem Aware",
  "Solution Aware",
  "Product Aware",
  "Most Aware",
] as const;

export type AwarenessLevel = (typeof AWARENESS_LEVELS)[number];

export const AWARENESS_GUIDE: Record<AwarenessLevel, string> = {
  Unaware:
    "The reader does not know they have a problem yet. Open with a relatable everyday scene; do NOT name the problem early. Slowly reveal it as a hidden cost of how things are.",
  "Problem Aware":
    "The reader knows the problem and feels it, but doesn't know solutions exist. Agitate the problem with vivid specifics; promise relief without naming the product yet.",
  "Solution Aware":
    "The reader knows solutions exist but doesn't know about your product. Position the solution category and explain why most options fail; introduce your approach as the answer.",
  "Product Aware":
    "The reader knows your product. Their objections are price, trust, fit, urgency. Address objections head-on with proof, comparisons, and risk-reversal.",
  "Most Aware":
    "The reader is ready to buy. Lead with the offer, the bonus, the deadline, and the call to action. Keep copy tight.",
};
