"use server";

import { auth } from "@clerk/nextjs/server";
import VoiceSession from "@/database/models/voiceSession.model";
import { connectToDatabase } from "@/database/mongoose";
import { getCurrentBillingPeriodStart, resolvePlan, PLAN_LIMITS } from "../subscription-constants";
import { EndSessionResult, StartSessionResult } from "@/types";




export const startVoiceSesion = async (bookId: string): Promise<StartSessionResult> => {

    try {
        const { userId, has } = await auth();
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

        const limits = PLAN_LIMITS[resolvePlan(has)];
        const billingPeriodStart = getCurrentBillingPeriodStart();

        await connectToDatabase();

        if (limits.maxSessionsPerMonth !== null) {
            const sessionCount = await VoiceSession.countDocuments({ clerkId: userId, billingPeriodStart });
            if (sessionCount >= limits.maxSessionsPerMonth) {
                return {
                    success: false,
                    error: `You've reached your ${limits.planName} plan limit of ${limits.maxSessionsPerMonth} sessions this month. Upgrade your plan for more.`,
                };
            }
        }

        const session = await VoiceSession.create({
            clerkId: userId, bookId, startedAt: new Date(),
            billingPeriodStart,
            durationSeconds: 0,
        });

        return {
            success: true,
            sessionId: session._id.toString(),
            maxDurationSeconds: limits.maxSessionMinutes * 60,

        }

    } catch (e) {
        console.error("Error strarting voice session", e);
        return { success: false, error: "Failed to start voice session. Please try again later." }
    }

}

export const endVoiceSesion = async (sessionId: string, durationSeconds: number): Promise<EndSessionResult> => {

    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

        if (!Number.isFinite(durationSeconds)) {
            return { success: false, error: "Invalid session duration" };
        }
        const safeDurationSeconds = Math.max(0, Math.floor(durationSeconds));

        await connectToDatabase();
        const result = await VoiceSession.findOneAndUpdate(
            { _id: sessionId, clerkId: userId, endedAt: { $exists: false } },
            { endedAt: new Date(), durationSeconds: safeDurationSeconds },
        );

        if (!result) return { success: false, error: "Voice session not found" }

        return { success: true }

    } catch (e) {
        console.error("Error ending voice session", e);
        return { success: false, error: "Failed to end voice session. Please try again later." }
    }

}