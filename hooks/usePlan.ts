"use client";

import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { PLAN_LIMITS, resolvePlan } from "@/lib/subscription-constants";
import { PlanKey, PlanLimits } from "@/types";

export interface UsePlanResult {
    isLoaded: boolean;
    plan: PlanKey;
    limits: PlanLimits;
}

export const usePlan = (): UsePlanResult => {
    const { isLoaded, has } = useAuth();

    return useMemo(() => {
        const plan = isLoaded && has ? resolvePlan(has) : "free";
        return { isLoaded, plan, limits: PLAN_LIMITS[plan] };
    }, [isLoaded, has]);
};

export default usePlan;
