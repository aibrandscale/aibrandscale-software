import { GenerationType } from "@prisma/client";

/** Credit cost per single API call. For per-item types, multiply by `count`. */
export const COST_PER_UNIT: Record<GenerationType, number> = {
  ANGLE: 1, // 1 credit per generated angle
  ADVERTORIAL: 10, // per advertorial
  VIDEO_SCRIPT: 3, // per script (per spec: "Each script costs 3 credits")
  STATIC: 5, // per static
};

export function estimateCost(type: GenerationType, count: number): number {
  return COST_PER_UNIT[type] * Math.max(1, count);
}
