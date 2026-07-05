"use server";

import VoiceSession from "@/database/models/voiceSession.model";
import { connnectToDatabase } from "@/database/mongoose";
import { getCurrentBillingPeriodStart } from "../subscription-constants";
import { EndSessionResult, StartSessionResult } from "@/types";




export const startVoiceSesion = async (clerkId: string, bookId: string): Promise<StartSessionResult> => {


    try {
        await connnectToDatabase();
        const session = await VoiceSession.create({
            clerkId, bookId, startedAt: new Date(),
            billingPeriodStart: getCurrentBillingPeriodStart(),
            durationSeconds: 0,
        });

        return {
            success: true,
            sessionId: session._id.toString(),

        }

    } catch (e) {
        console.error("Error strarting voice session", e);
        return { success: false, error: "Failed to start voice session. Please try again later." }
    }

}

export const endVoiceSesion = async (sessionId: string, durationSeconds: number): Promise<EndSessionResult> => {

    try {
        await connnectToDatabase();
        const result = await VoiceSession.findByIdAndUpdate(sessionId, {
            endedAt: new Date(),
            durationSeconds,
        });

        if (!result) return { success: false, error: "Voice session not found" }

        return { success: true }

    } catch (e) {
        console.error("Error ending voice session", e);
        return { success: false, error: "Failed to end voice session. Please try again later." }
    }

}