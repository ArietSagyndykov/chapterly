import { PlanKey, PlanLimits } from "@/types";

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
    free: {
        planName: "Free",
        maxBooks: 1,
        maxSessionsPerMonth: 5,
        maxSessionMinutes: 5,
        hasSessionHistory: false,
    },
    standard: {
        planName: "Standard",
        maxBooks: 10,
        maxSessionsPerMonth: 100,
        maxSessionMinutes: 15,
        hasSessionHistory: true,
    },
    pro: {
        planName: "Pro",
        maxBooks: 100,
        maxSessionsPerMonth: null,
        maxSessionMinutes: 60,
        hasSessionHistory: true,
    },
};

// Matches Clerk's has() signature without depending on a specific Clerk import
// so this file stays shared between server and client bundles.
type PlanChecker = (params: { plan: string }) => boolean;

export const resolvePlan = (has: PlanChecker): PlanKey => {
    if (has({ plan: "pro" })) return "pro";
    if (has({ plan: "standard" })) return "standard";
    return "free";
};

export const getCurrentBillingPeriodStart = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}
