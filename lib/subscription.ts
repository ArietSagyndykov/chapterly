import { auth } from "@clerk/nextjs/server";
import { PlanKey, PlanLimits } from "@/types";
import { PLAN_LIMITS, resolvePlan } from "./subscription-constants";

export const getCurrentPlan = async (): Promise<PlanKey> => {
    const { has } = await auth();
    return resolvePlan(has);
};

export const getCurrentPlanLimits = async (): Promise<{ plan: PlanKey; limits: PlanLimits }> => {
    const plan = await getCurrentPlan();
    return { plan, limits: PLAN_LIMITS[plan] };
};
